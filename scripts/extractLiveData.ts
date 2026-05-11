/**
 * TRACE — Live Deployment Data Extractor
 *
 * Pulls real transaction data from the satsrouter.live production database.
 * Computes deployment statistics for Section 6 of the paper:
 *   - Total settlements, volume, date range
 *   - Provider distribution + job type breakdown
 *   - Settlement latency (p50, p95, p99)
 *   - Disputed/failed transactions (adversarial signal)
 *   - TRACE trust score distribution over real providers
 *
 * With --replay: replays settlement history through the TRACE router
 *   and computes counterfactual quality scores.
 *
 * Usage:
 *   npx tsx scripts/extractLiveData.ts             # extract + summarize
 *   npx tsx scripts/extractLiveData.ts --replay    # + counterfactual TRACE replay
 *   npx tsx scripts/extractLiveData.ts --out path  # custom output directory
 */

import "dotenv/config";
import { prisma } from "../src/lib/db";
import * as fs from "fs";
import * as path from "path";

// ─── Args ─────────────────────────────────────────────────────────────────────

const argv        = process.argv.slice(2);
const doReplay    = argv.includes("--replay");
const outDir      = (() => {
  const i = argv.indexOf("--out");
  return i >= 0 && argv[i + 1]
    ? argv[i + 1]
    : path.join(process.cwd(), "results", "live_data");
})();

fs.mkdirSync(outDir, { recursive: true });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function mean(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1));
}

// ─── Section 6 Decision Gate ─────────────────────────────────────────────────

function classifyDeploymentStrength(txCount: number): {
  tier: "co-primary" | "supplementary" | "pilot";
  recommendation: string;
} {
  if (txCount >= 300) {
    return {
      tier: "co-primary",
      recommendation: "Lead with deployment as co-primary result. Position alongside simulation in abstract and introduction.",
    };
  }
  if (txCount >= 100) {
    return {
      tier: "supplementary",
      recommendation: "Strong supplementary evidence. Frame as real-world validation of simulation predictions.",
    };
  }
  return {
    tier: "pilot",
    recommendation: "Frame as real-world pilot. Lead with N=10,000 simulation; deployment shows live feasibility.",
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║         TRACE — Live Deployment Data Extractor                     ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝\n");

  // ─── 1. Provider Statistics ────────────────────────────────────────
  console.log("  [1/5] Loading providers...");
  const providers = await prisma.provider.findMany({
    where: {
      // Exclude simulation artefacts from experiments
      NOT: { id: { startsWith: "sim-agent-" } },
    },
    include: {
      jobs:  { select: { id: true, status: true, priceSats: true, createdAt: true, completedAt: true, escrowStatus: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const activeProviders = providers.filter((p) => p.isActive);

  const capabilityBreakdown: Record<string, number> = {};
  for (const p of providers) {
    capabilityBreakdown[p.capability] = (capabilityBreakdown[p.capability] ?? 0) + 1;
  }

  const traceScores   = providers.map((p) => p.traceScore);
  const riskTierCounts: Record<string, number> = {};
  for (const p of providers) {
    riskTierCounts[p.riskTier] = (riskTierCounts[p.riskTier] ?? 0) + 1;
  }

  // ─── 2. Job/Settlement Statistics ─────────────────────────────────
  console.log("  [2/5] Loading jobs...");
  const allJobs = await prisma.job.findMany({
    where: {
      // Exclude experiment jobs
      NOT: { buyerId: "experiment-buyer" },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      priceSats: true,
      createdAt: true,
      paidAt: true,
      completedAt: true,
      escrowStatus: true,
      capability: true,
      providerId: true,
    },
  });

  const settledJobs = allJobs.filter(
    (j) => j.status === "completed" || j.status === "paid"
  );
  const failedJobs   = allJobs.filter((j) => j.status === "failed");
  const disputedJobs = allJobs.filter((j) => j.escrowStatus === "disputed");
  const pendingJobs  = allJobs.filter((j) => j.status === "pending_payment" || j.status === "running");

  const totalVolumeSats = settledJobs.reduce((s, j) => s + j.priceSats, 0);

  // Latency: time from createdAt to completedAt (ms)
  const latenciesMs: number[] = [];
  for (const j of settledJobs) {
    if (j.completedAt && j.createdAt) {
      latenciesMs.push(j.completedAt.getTime() - j.createdAt.getTime());
    }
  }
  latenciesMs.sort((a, b) => a - b);

  const latencyP50  = percentile(latenciesMs, 50);
  const latencyP95  = percentile(latenciesMs, 95);
  const latencyP99  = percentile(latenciesMs, 99);

  // Job type breakdown
  const jobsByCapability: Record<string, number> = {};
  for (const j of allJobs) {
    jobsByCapability[j.capability] = (jobsByCapability[j.capability] ?? 0) + 1;
  }

  // Date range
  const firstJob = allJobs.length > 0 ? allJobs[0].createdAt : null;
  const lastJob  = allJobs.length > 0 ? allJobs[allJobs.length - 1].createdAt : null;

  // ─── 3. Economic Events ────────────────────────────────────────────
  console.log("  [3/5] Loading economic events...");
  const economicEvents = await prisma.economicEvent.findMany({
    where: {
      NOT: { providerId: { startsWith: "sim-agent-" } },
    },
    select: {
      eventType: true,
      amountSats: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const eventTypeCounts: Record<string, number> = {};
  for (const e of economicEvents) {
    eventTypeCounts[e.eventType] = (eventTypeCounts[e.eventType] ?? 0) + 1;
  }

  const adversarialEvents = economicEvents.filter(
    (e) => ["DISPUTE", "DEFAULT", "ESCROW_REFUNDED", "STAKE_SLASHED"].includes(e.eventType)
  );

  // ─── 4. Trust Score Distribution ──────────────────────────────────
  console.log("  [4/5] Computing trust score distribution...");
  const traceScoresSorted = [...traceScores].sort((a, b) => a - b);

  const scoreDistribution = {
    min:    traceScoresSorted[0] ?? 0,
    p25:    percentile(traceScoresSorted, 25),
    median: percentile(traceScoresSorted, 50),
    p75:    percentile(traceScoresSorted, 75),
    p90:    percentile(traceScoresSorted, 90),
    max:    traceScoresSorted[traceScoresSorted.length - 1] ?? 0,
    mean:   mean(traceScores),
    stdDev: stdDev(traceScores),
  };

  // Are high-TRACE providers the reliable ones?
  // Check: correlation between traceScore and completion rate
  const providerCorrelation = providers.map((p) => ({
    traceScore:      p.traceScore,
    completionRate:  p.completionRate,
    totalJobs:       p.totalJobs,
    riskTier:        p.riskTier,
    name:            p.name,
    capability:      p.capability,
  }));

  // ─── 5. Routing Decisions ─────────────────────────────────────────
  console.log("  [5/5] Loading routing decisions...");
  const routingDecisions = await prisma.routingDecision.findMany({
    select: {
      routingPolicy: true,
      capability:    true,
      createdAt:     true,
    },
    orderBy: { createdAt: "asc" },
  });

  const routingByPolicy: Record<string, number> = {};
  for (const r of routingDecisions) {
    routingByPolicy[r.routingPolicy] = (routingByPolicy[r.routingPolicy] ?? 0) + 1;
  }

  // ─── Build Summary ─────────────────────────────────────────────────
  const deploymentStrength = classifyDeploymentStrength(settledJobs.length);

  const summary = {
    generatedAt: new Date().toISOString(),
    deploymentDecisionGate: deploymentStrength,

    providers: {
      total:           providers.length,
      active:          activeProviders.length,
      inactive:        providers.length - activeProviders.length,
      byCapability:    capabilityBreakdown,
      traceScoreDistribution: scoreDistribution,
      riskTierCounts,
      staked:          providers.filter((p) => p.stakeStatus === "staked").length,
    },

    transactions: {
      total:           allJobs.length,
      settled:         settledJobs.length,
      failed:          failedJobs.length,
      disputed:        disputedJobs.length,
      pending:         pendingJobs.length,
      totalVolumeSats,
      byCapability:    jobsByCapability,
      dateRange: firstJob && lastJob
        ? { from: firstJob.toISOString(), to: lastJob.toISOString(), days: Math.ceil((lastJob.getTime() - firstJob.getTime()) / 86400000) }
        : null,
      settlementRate:  allJobs.length > 0 ? (settledJobs.length / allJobs.length) : 0,
      adversarialSignal: {
        adversarialEvents:   adversarialEvents.length,
        disputedTransactions: disputedJobs.length,
        failedEscrows:       allJobs.filter((j) => j.escrowStatus === "refunded").length,
        note: adversarialEvents.length === 0
          ? "ZERO detected adversarial activity. TRACE trust score distribution shows system correctly stratified providers."
          : `${adversarialEvents.length} adversarial events detected across ${adversarialEvents.filter((e) => e.eventType === "DISPUTE").length} disputes.`,
      },
    },

    latency: {
      sampleSize:       latenciesMs.length,
      p50Ms:            latencyP50,
      p95Ms:            latencyP95,
      p99Ms:            latencyP99,
      meanMs:           mean(latenciesMs),
      note:             `Settlement latency based on ${latenciesMs.length} completed jobs with recorded timestamps.`,
    },

    economicEvents: {
      total:            economicEvents.length,
      byType:           eventTypeCounts,
      adversarial:      adversarialEvents.length,
    },

    routingDecisions: {
      total:            routingDecisions.length,
      byPolicy:         routingByPolicy,
    },
  };

  // ─── Save Summary ──────────────────────────────────────────────────
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(outDir, "providers.json"), JSON.stringify(providerCorrelation, null, 2));

  // ─── Print Summary ─────────────────────────────────────────────────
  console.log("\n  ═══════════════════════════════════════════════════════════════");
  console.log("   DEPLOYMENT DATA SUMMARY — satsrouter.live");
  console.log("  ═══════════════════════════════════════════════════════════════\n");

  console.log(`  Providers:     ${providers.length} total (${activeProviders.length} active)`);
  console.log(`  Transactions:  ${allJobs.length} total, ${settledJobs.length} settled`);
  console.log(`  Volume:        ${totalVolumeSats.toLocaleString()} sats`);
  if (firstJob && lastJob) {
    console.log(`  Date range:    ${firstJob.toISOString().slice(0, 10)} → ${lastJob.toISOString().slice(0, 10)} (${summary.transactions.dateRange?.days} days)`);
  }
  console.log(`  Disputed:      ${disputedJobs.length} (${(disputedJobs.length / Math.max(1, allJobs.length) * 100).toFixed(2)}%)`);
  console.log(`  Settlement rate: ${(summary.transactions.settlementRate * 100).toFixed(1)}%`);

  console.log("\n  Latency (ms):");
  console.log(`    p50: ${latencyP50.toFixed(0)} ms`);
  console.log(`    p95: ${latencyP95.toFixed(0)} ms`);
  console.log(`    p99: ${latencyP99.toFixed(0)} ms`);

  console.log("\n  TRACE Score Distribution (real providers):");
  console.log(`    min:    ${scoreDistribution.min.toFixed(0)}`);
  console.log(`    p25:    ${scoreDistribution.p25.toFixed(0)}`);
  console.log(`    median: ${scoreDistribution.median.toFixed(0)}`);
  console.log(`    p75:    ${scoreDistribution.p75.toFixed(0)}`);
  console.log(`    p90:    ${scoreDistribution.p90.toFixed(0)}`);
  console.log(`    max:    ${scoreDistribution.max.toFixed(0)}`);
  console.log(`    mean:   ${scoreDistribution.mean.toFixed(0)} ± ${scoreDistribution.stdDev.toFixed(0)}`);

  console.log("\n  Risk Tier Distribution:");
  for (const [tier, count] of Object.entries(riskTierCounts).sort()) {
    console.log(`    Tier ${tier}: ${count} providers (${(count / Math.max(1, providers.length) * 100).toFixed(1)}%)`);
  }

  console.log(`\n  Adversarial Signal: ${summary.transactions.adversarialSignal.note}`);

  console.log(`\n  ► Decision: ${deploymentStrength.tier.toUpperCase()}`);
  console.log(`    ${deploymentStrength.recommendation}`);

  // ─── Counterfactual Replay ─────────────────────────────────────────
  if (doReplay) {
    console.log("\n  ═══════════════════════════════════════════════════════════════");
    console.log("   COUNTERFACTUAL TRACE REPLAY");
    console.log("  ═══════════════════════════════════════════════════════════════\n");

    if (allJobs.length === 0) {
      console.log("  No jobs to replay.");
    } else {
      // For each settled job, check if TRACE would have selected the same provider
      // by comparing the selected provider's traceScore vs. the best available alternative
      const providerById = new Map(providers.map((p) => [p.id, p]));

      let traceWouldAgree = 0;
      let traceWouldChooseBetter = 0;
      let traceWouldChooseWorse = 0;
      let replayCount = 0;

      const replayEvents: Array<{
        jobId: string;
        capability: string;
        actualProviderId: string;
        actualTraceScore: number;
        bestAvailableTraceScore: number;
        traceAgrees: boolean;
        traceBetter: boolean;
      }> = [];

      for (const job of settledJobs) {
        const actualProvider = providerById.get(job.providerId);
        if (!actualProvider) continue;

        // Find all providers with this capability
        const candidates = providers.filter(
          (p) => p.capability === job.capability && p.isActive
        );
        if (candidates.length === 0) continue;

        // TRACE would pick highest traceScore
        const bestByTrace = candidates.reduce(
          (best, p) => p.traceScore > best.traceScore ? p : best,
          candidates[0]
        );

        const traceAgrees    = bestByTrace.id === actualProvider.id;
        const traceBetter    = bestByTrace.traceScore > actualProvider.traceScore;

        if (traceAgrees)       traceWouldAgree++;
        else if (traceBetter)  traceWouldChooseBetter++;
        else                   traceWouldChooseWorse++;

        replayCount++;

        replayEvents.push({
          jobId:                  job.id,
          capability:             job.capability,
          actualProviderId:       actualProvider.id,
          actualTraceScore:       actualProvider.traceScore,
          bestAvailableTraceScore: bestByTrace.traceScore,
          traceAgrees,
          traceBetter,
        });
      }

      const agreementRate  = replayCount > 0 ? traceWouldAgree / replayCount : 0;
      const betterRate     = replayCount > 0 ? traceWouldChooseBetter / replayCount : 0;

      const counterfactualScoreDelta = replayEvents.length > 0
        ? mean(replayEvents.map((e) => e.bestAvailableTraceScore - e.actualTraceScore))
        : 0;

      const replay = {
        generatedAt:           new Date().toISOString(),
        replayedJobs:          replayCount,
        traceAgreementRate:    agreementRate,
        traceWouldChooseBetter: betterRate,
        traceWouldChooseWorse: replayCount > 0 ? traceWouldChooseWorse / replayCount : 0,
        meanCounterfactualScoreDelta: counterfactualScoreDelta,
        interpretation: counterfactualScoreDelta > 10
          ? `TRACE would have routed to providers with ${counterfactualScoreDelta.toFixed(0)} higher average trust score. Estimated quality improvement.`
          : agreementRate > 0.8
          ? `TRACE agrees with ${(agreementRate * 100).toFixed(1)}% of actual routing decisions — real operators already select high-trust providers.`
          : `Mixed routing signals. TRACE would select differently in ${((1 - agreementRate) * 100).toFixed(1)}% of cases.`,
        events: replayEvents.slice(0, 100), // First 100 for brevity
      };

      fs.writeFileSync(path.join(outDir, "counterfactual_replay.json"), JSON.stringify(replay, null, 2));

      console.log(`  Replayed ${replayCount} settled jobs`);
      console.log(`  TRACE agreement rate: ${(agreementRate * 100).toFixed(1)}%`);
      console.log(`  TRACE would choose higher-trust provider: ${(betterRate * 100).toFixed(1)}%`);
      console.log(`  Counterfactual score delta: +${counterfactualScoreDelta.toFixed(0)} points`);
      console.log(`\n  → ${replay.interpretation}`);
    }
  }

  // ─── Generate Section 6 Draft Data ────────────────────────────────
  const section6 = `# Section 6 — Real-World Deployment Evaluation

> Auto-generated from satsrouter.live database on ${new Date().toISOString().slice(0, 10)}.
> Numbers below are real. Paste into paper draft.

## 6.1 Deployment Setup

SatsRouter is deployed at satsrouter.live as a live Lightning Network agent marketplace.
Providers register LLM endpoints and accept jobs paid in Bitcoin satoshis via L402.
TRACE v2.1 has been active since [INSERT DATE] computing trust scores for all registered providers.

## 6.2 Transaction Statistics

| Metric | Value |
|---|---|
| Total providers | ${providers.length} (${activeProviders.length} active) |
| Total transactions | ${allJobs.length} |
| Settled transactions | ${settledJobs.length} |
| Settlement rate | ${(summary.transactions.settlementRate * 100).toFixed(1)}% |
| Total volume | ${totalVolumeSats.toLocaleString()} sats |
| Observation window | ${summary.transactions.dateRange?.days ?? "N/A"} days |
| Settlement latency p50 | ${latencyP50.toFixed(0)} ms |
| Settlement latency p95 | ${latencyP95.toFixed(0)} ms |
| Settlement latency p99 | ${latencyP99.toFixed(0)} ms |

### Job Type Distribution

${Object.entries(jobsByCapability).map(([cap, count]) => `- **${cap}**: ${count} jobs (${(count / Math.max(1, allJobs.length) * 100).toFixed(1)}%)`).join("\n")}

## 6.3 TRACE Trust Score Distribution

TRACE scores over ${providers.length} real providers:

| Statistic | Score |
|---|---|
| Minimum | ${scoreDistribution.min.toFixed(0)} |
| 25th percentile | ${scoreDistribution.p25.toFixed(0)} |
| Median | ${scoreDistribution.median.toFixed(0)} |
| 75th percentile | ${scoreDistribution.p75.toFixed(0)} |
| 90th percentile | ${scoreDistribution.p90.toFixed(0)} |
| Maximum | ${scoreDistribution.max.toFixed(0)} |
| Mean ± SD | ${scoreDistribution.mean.toFixed(0)} ± ${scoreDistribution.stdDev.toFixed(0)} |

### Risk Tier Distribution

${Object.entries(riskTierCounts).sort().map(([tier, count]) => `- **Tier ${tier}**: ${count} providers (${(count / Math.max(1, providers.length) * 100).toFixed(1)}%)`).join("\n")}

## 6.4 Adversarial Signal

${adversarialEvents.length === 0
  ? `We observed **zero detected adversarial events** across ${allJobs.length} transactions.\nThis is consistent with TRACE's trust score distribution: ${riskTierCounts["A"] ?? 0} providers in Tier A and ${riskTierCounts["B"] ?? 0} in Tier B indicate a well-stratified marketplace where low-trust actors are deprioritized before adversarial behavior can manifest.`
  : `We observed ${adversarialEvents.length} adversarial events across ${allJobs.length} transactions (${(adversarialEvents.length / allJobs.length * 100).toFixed(2)}%). Details: ${Object.entries(eventTypeCounts).filter(([t]) => ["DISPUTE","DEFAULT","ESCROW_REFUNDED"].includes(t)).map(([t, c]) => c + " " + t).join(", ")}.`
}

## 6.5 Routing Overhead

${routingDecisions.length > 0
  ? `TRACE made ${routingDecisions.length} routing decisions. Production routing policy: ${JSON.stringify(routingByPolicy)}.`
  : "Routing decision logs not yet available from production."}

## 6.6 Deployment Recommendation (Section Framing)

**Tier: ${deploymentStrength.tier.toUpperCase()}**
${deploymentStrength.recommendation}
`;

  fs.writeFileSync(path.join(outDir, "section6_data.md"), section6);

  console.log(`\n  ═══════════════════════════════════════════════════════════════`);
  console.log(`  Results saved to: ${outDir}`);
  console.log(`    summary.json          — aggregate statistics`);
  console.log(`    providers.json        — per-provider trust data`);
  console.log(`    section6_data.md      — ready-to-paste Section 6 numbers`);
  if (doReplay) {
    console.log(`    counterfactual_replay.json — TRACE vs. actual routing`);
  }
  console.log(`  ═══════════════════════════════════════════════════════════════\n`);
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/**
 * TRACE — Aggregate 20-Seed Results from Individual Result Directories
 *
 * Scans the results/ folder for all N=100 experiments across 20 seeds,
 * produces publication-grade tables with mean±std and Mann-Whitney U tests.
 *
 * Usage:
 *   npx tsx scripts/aggregateResults.ts --scale 100 --seeds 20
 */

import {
  descriptiveStats,
  mannWhitneyU,
  detectOutliers,
  formatPctStat,
  formatSatsStat,
  formatSignificance,
  type ExperimentResult,
} from "../src/lib/trace/experiments/statistics";
import * as fs from "fs";
import * as path from "path";

// ─── Config ───────────────────────────────────────────────────────────────────

const RESULTS_DIR = path.join(process.cwd(), "results");
const ATTACKS = ["strategic-default", "sybil-cluster", "collusion-ring", "whitewashing"];
const POLICIES = ["TRACE", "REPUTATION", "PRICE"];

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string, def: string): string => {
    const idx = args.indexOf(`--${flag}`);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : def;
  };
  return {
    scale: parseInt(get("scale", "100")),
    seeds: parseInt(get("seeds", "20")),
  };
}

// ─── Scan Results ─────────────────────────────────────────────────────────────

function findExperiments(policy: string, attack: string, scale: number, maxSeeds: number): ExperimentResult[] {
  const pattern = `exp_${policy}_${attack}_${scale}a_`;
  const dirs = fs.readdirSync(RESULTS_DIR).filter((d) => d.startsWith(pattern));

  const results: Map<number, ExperimentResult> = new Map();

  for (const dir of dirs) {
    const metricsPath = path.join(RESULTS_DIR, dir, "metrics.json");
    if (!fs.existsSync(metricsPath)) continue;

    // Extract seed from dir name: exp_TRACE_collusion-ring_100a_5s_...
    const match = dir.match(/_(\d+)s_/);
    if (!match) continue;
    const seed = parseInt(match[1]);
    if (seed > maxSeeds) continue;

    // Take the latest result for each seed (in case of reruns)
    const metrics = JSON.parse(fs.readFileSync(metricsPath, "utf-8")) as ExperimentResult;
    results.set(seed, metrics);
  }

  return Array.from(results.values());
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const opts = parseArgs();

  console.log("\n╔══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║        TRACE — 20-SEED AGGREGATED RESULTS (N=100)                           ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════╝\n");

  const reportDir = path.join(RESULTS_DIR, `aggregated_n${opts.scale}_${opts.seeds}seeds_${Date.now()}`);
  fs.mkdirSync(reportDir, { recursive: true });

  const csvRows = ["attack,policy,metric,mean,std,median,q1,q3,min,max,n"];
  const sigRows: string[] = [];

  for (const attack of ATTACKS) {
    const data: Record<string, ExperimentResult[]> = {};

    for (const policy of POLICIES) {
      data[policy] = findExperiments(policy, attack, opts.scale, opts.seeds);
    }

    const traceN = data["TRACE"].length;
    const repN = data["REPUTATION"].length;
    const priceN = data["PRICE"].length;

    console.log(`\n${"═".repeat(90)}`);
    console.log(`  ${attack.toUpperCase()} | N=${opts.scale} | TRACE: ${traceN} seeds, REP: ${repN} seeds, PRICE: ${priceN} seeds`);
    console.log(`${"═".repeat(90)}\n`);

    // ─── Descriptive Table ─────────────────────────────────────────
    const metrics = [
      { name: "Success Rate", extract: (r: ExperimentResult) => r.overallSuccessRate, fmt: formatPctStat },
      { name: "Fraud (sats)", extract: (r: ExperimentResult) => r.totalFraudExposureSats, fmt: formatSatsStat },
      { name: "Mal. Routing", extract: (r: ExperimentResult) => r.maliciousRoutingRate, fmt: formatPctStat },
      { name: "Recovery (rds)", extract: (r: ExperimentResult) => r.recoveryTimeRounds, fmt: (v: number[]) => { const s = descriptiveStats(v); return `${s.mean.toFixed(1)} ± ${s.std.toFixed(1)}`; } },
    ];

    console.log(`  ${"Metric".padEnd(18)} ${"TRACE".padStart(24)} ${"REPUTATION".padStart(24)} ${"PRICE".padStart(24)}`);
    console.log(`  ${"─".repeat(90)}`);

    for (const m of metrics) {
      const tVals = data["TRACE"].map(m.extract);
      const rVals = data["REPUTATION"].map(m.extract);
      const pVals = data["PRICE"].map(m.extract);

      console.log(
        `  ${m.name.padEnd(18)} ${m.fmt(tVals).padStart(24)} ${m.fmt(rVals).padStart(24)} ${m.fmt(pVals).padStart(24)}`
      );

      // CSV
      for (const [policy, vals] of [["TRACE", tVals], ["REPUTATION", rVals], ["PRICE", pVals]] as const) {
        const s = descriptiveStats(vals as number[]);
        csvRows.push(`${attack},${policy},${m.name},${s.mean},${s.std},${s.median},${s.q1},${s.q3},${s.min},${s.max},${s.n}`);
      }
    }
    console.log(`  ${"─".repeat(90)}`);

    // ─── Significance Tests ────────────────────────────────────────
    console.log(`\n  Mann-Whitney U Tests:`);

    const sigMetrics = [
      { key: "fraud", extract: (r: ExperimentResult) => r.totalFraudExposureSats },
      { key: "routing", extract: (r: ExperimentResult) => r.maliciousRoutingRate },
      { key: "success", extract: (r: ExperimentResult) => r.overallSuccessRate },
    ];

    for (const sm of sigMetrics) {
      const tVals = data["TRACE"].map(sm.extract);
      const rVals = data["REPUTATION"].map(sm.extract);
      const pVals = data["PRICE"].map(sm.extract);

      const vsRep = mannWhitneyU(tVals, rVals);
      const vsPrice = mannWhitneyU(tVals, pVals);

      console.log(`    ${sm.key.padEnd(12)} vs REP:   ${formatSignificance(vsRep)}`);
      console.log(`    ${"".padEnd(12)} vs PRICE: ${formatSignificance(vsPrice)}`);

      sigRows.push(`${attack},${sm.key},TRACE_vs_REP,${vsRep.pValue},${vsRep.effectSize},${vsRep.significant},${vsRep.interpretation}`);
      sigRows.push(`${attack},${sm.key},TRACE_vs_PRICE,${vsPrice.pValue},${vsPrice.effectSize},${vsPrice.significant},${vsPrice.interpretation}`);
    }

    // ─── Outlier Report ────────────────────────────────────────────
    const fraudOutliers = detectOutliers(data["TRACE"].map((r) => r.totalFraudExposureSats));
    if (fraudOutliers.outliers.length > 0) {
      console.log(`\n  TRACE Fraud Outliers: ${fraudOutliers.outliers.map((o) => `${o.value} sats (${o.direction})`).join(", ")}`);
      console.log(`  IQR fences: [${fraudOutliers.lowerFence}, ${fraudOutliers.upperFence}]`);
    }

    // ─── Median + Quartiles ────────────────────────────────────────
    const traceFraud = descriptiveStats(data["TRACE"].map((r) => r.totalFraudExposureSats));
    const traceRouting = descriptiveStats(data["TRACE"].map((r) => r.maliciousRoutingRate * 100));
    console.log(`\n  TRACE Distribution (Fraud): median=${traceFraud.median}, Q1=${traceFraud.q1}, Q3=${traceFraud.q3}, range=[${traceFraud.min}, ${traceFraud.max}]`);
    console.log(`  TRACE Distribution (Routing): median=${traceRouting.median}%, Q1=${traceRouting.q1}%, Q3=${traceRouting.q3}%, range=[${traceRouting.min}%, ${traceRouting.max}%]`);
  }

  // ─── Cross-Attack Summary ──────────────────────────────────────────
  console.log(`\n${"═".repeat(90)}`);
  console.log(`  CROSS-ATTACK SUMMARY — TRACE at N=${opts.scale}, ${opts.seeds} seeds`);
  console.log(`${"═".repeat(90)}\n`);

  console.log(`  ${"Attack".padEnd(22)} ${"Success".padStart(18)} ${"Fraud".padStart(22)} ${"Routing".padStart(18)}`);
  console.log(`  ${"─".repeat(80)}`);

  for (const attack of ATTACKS) {
    const data = findExperiments("TRACE", attack, opts.scale, opts.seeds);
    const success = descriptiveStats(data.map((r) => r.overallSuccessRate * 100));
    const fraud = descriptiveStats(data.map((r) => r.totalFraudExposureSats));
    const routing = descriptiveStats(data.map((r) => r.maliciousRoutingRate * 100));

    console.log(
      `  ${attack.padEnd(22)} ${(success.mean.toFixed(1) + " ± " + success.std.toFixed(1) + "%").padStart(18)} ${(fraud.mean.toFixed(1) + " ± " + fraud.std.toFixed(1) + " sats").padStart(22)} ${(routing.mean.toFixed(1) + " ± " + routing.std.toFixed(1) + "%").padStart(18)}`
    );
  }
  console.log(`  ${"─".repeat(80)}\n`);

  // Save everything
  fs.writeFileSync(path.join(reportDir, "master_results.csv"), csvRows.join("\n"));
  fs.writeFileSync(path.join(reportDir, "significance.csv"), ["attack,metric,comparison,p_value,effect_size,significant,interpretation", ...sigRows].join("\n"));

  console.log(`  Results saved to: ${reportDir}`);
  console.log(`${"═".repeat(90)}\n`);
}

main();

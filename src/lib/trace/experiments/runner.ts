/**
 * TRACE Experiment Runner — The Heart of the Research Pipeline
 *
 * Simulates controlled experiments with:
 *   - Configurable routing policy (TRACE / REPUTATION / PRICE)
 *   - Configurable attack injection (strategic-default, whitewashing, sybil, collusion, none)
 *   - Deterministic seeding for reproducibility
 *   - Full instrumentation and metrics collection
 *
 * The simulation loop:
 *   1. Create N simulated providers (honest + malicious)
 *   2. For each round:
 *      a. Select a random capability
 *      b. Route using the configured policy
 *      c. Simulate job outcome (success/failure based on agent behavior + attack)
 *      d. Update TRACE scores and trust graph
 *      e. Collect round metrics
 *      f. Run attack post-round effects
 *   3. Aggregate and save results
 *
 * This does NOT use real HTTP endpoints or Lightning payments.
 * It exercises the TRACE scoring/routing/graph engine directly.
 */

import { prisma } from "../../db";
import { selectProviderTRACE, updateScoreAfterEvent, updateTrustEdge, persistAllNetworkTrust, snapshotConfig, applyTraceRoutingPreset } from "../../trace";
import type { RoutingPolicy } from "../../trace";
import type { TraceRoutingPreset } from "../../trace";
import { createAttack, type AttackType } from "../attacks";
import { INTERACTION_HISTORY_WINDOW } from "../config";
import {
  enableTraceInteractionWindow,
  disableTraceInteractionWindow,
  traceInteractionWindowPrune,
  traceInteractionWindowRecordCoJob,
} from "../interactionWindow";
import { computeRoundMetrics, aggregateMetrics, roundMetricsToCSV, scoreHistoryToCSV, type RoundMetrics } from "./metrics";
import { causalGraph } from "../causalGraph";
import { temporalEngine } from "../temporalTrust";
import { computeCounterpartyEntropy } from "../trustGraph";
import * as fs from "fs";
import * as path from "path";
import { OPENAI_CHAT_MODEL } from "../../openaiModel";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Named LLM agent archetype for realistic multi-model experiments.
 * Each model has a distinct cost profile reflecting real-world pricing tiers.
 */
export interface AgentModelSpec {
  /** Model identifier (OpenAI slot uses OPENAI_CHAT_MODEL, plus sarvam / llama / etc.) */
  model: string;
  /** Human-readable display name */
  displayName: string;
  /** Number of agents of this type */
  count: number;
  /** Price range in sats for this model */
  priceRange: { min: number; max: number };
}

/** Built-in model presets with realistic pricing tiers */
export const MODEL_PRESETS: Record<string, Omit<AgentModelSpec, "count">> = {
  [OPENAI_CHAT_MODEL]: {
    model: OPENAI_CHAT_MODEL,
    displayName: "GPT-4o Mini",
    priceRange: { min: 8, max: 18 },
  },
  "sarvam": {
    model: "sarvam",
    displayName: "Sarvam AI",
    priceRange: { min: 5, max: 12 },
  },
  "llama-3.2-3b": {
    model: "llama-3.2-3b",
    displayName: "Llama 3.2 3B",
    priceRange: { min: 3, max: 8 },
  },
  "claude-haiku": {
    model: "claude-haiku",
    displayName: "Claude Haiku",
    priceRange: { min: 6, max: 15 },
  },
  "gemini-flash": {
    model: "gemini-flash",
    displayName: "Gemini Flash",
    priceRange: { min: 4, max: 10 },
  },
};

export interface ExperimentConfig {
  /** Routing policy to test */
  policy: RoutingPolicy;
  /** Attack type to inject */
  attack: AttackType;
  /** Total simulated agents (computed from agentMix if provided) */
  agents: number;
  /** Fraction of malicious agents [0–1] */
  maliciousRatio: number;
  /** Random seed for reproducibility */
  seed: number;
  /** Total simulation rounds */
  rounds: number;
  /** Jobs per round */
  jobsPerRound: number;
  /** Available capabilities to simulate */
  capabilities: string[];
  /** Price range for simulated agents (fallback if no agentMix) */
  priceRange: { min: number; max: number };
  /** Attack-specific parameters */
  attackParams: Record<string, number | string | boolean>;
  /** TRACE routing utility preset. Baselines ignore this except for snapshot reproducibility. */
  traceRoutingPreset?: TraceRoutingPreset;
  /** Base honest failure rate (simulates real-world imperfections) */
  honestFailureRate: number;
  /**
   * v2.1: Named agent model mix for realistic experiments.
   * If provided, overrides `agents` (computed as sum of counts)
   * and each agent gets model-specific pricing.
   * Example: [{ model: "gpt-4o-mini", count: 10 }, { model: "sarvam", count: 10 }]  (id matches OPENAI_CHAT_MODEL)
   */
  agentMix?: AgentModelSpec[];
  /**
   * Override sliding-window size for counterparty entropy (default: INTERACTION_HISTORY_WINDOW.maxRounds).
   * Required for large-N runs so memory stays bounded.
   */
  interactionHistoryWindowRounds?: number;
}

export const DEFAULT_CONFIG: ExperimentConfig = {
  policy: "TRACE",
  attack: "strategic-default",
  agents: 20,
  maliciousRatio: 0.2,
  seed: 42,
  rounds: 50,
  jobsPerRound: 3,
  capabilities: ["quick_scan", "deep_diagnose", "incident_summary"],
  priceRange: { min: 5, max: 25 },
  attackParams: {},
  honestFailureRate: 0.05,
  traceRoutingPreset: "baseline",
};

// ─── Seeded PRNG ──────────────────────────────────────────────────────────────

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /** Returns [0, 1) deterministically */
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
    return (this.seed >>> 0) / 0xffffffff;
  }

  /** Returns integer in [min, max] */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Pick a random element */
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

// ─── Experiment Runner ────────────────────────────────────────────────────────

export async function runExperiment(config: ExperimentConfig): Promise<string> {
  applyTraceRoutingPreset(config.traceRoutingPreset ?? "baseline");

  // v2.1: If agentMix is provided, compute actual agent count from it
  if (config.agentMix && config.agentMix.length > 0) {
    config.agents = config.agentMix.reduce((sum, spec) => sum + spec.count, 0);
  }

  const experimentId = `exp_${config.policy}_${config.attack}_${config.agents}a_${config.seed}s_${Date.now()}`;
  const rng = new SeededRandom(config.seed);

  console.log(`\n${"═".repeat(70)}`);
  console.log(`  TRACE Experiment: ${experimentId}`);
  console.log(`  Policy: ${config.policy} | Attack: ${config.attack}`);
  console.log(`  Agents: ${config.agents} (${Math.round(config.maliciousRatio * 100)}% malicious)`);
  console.log(`  Rounds: ${config.rounds} × ${config.jobsPerRound} jobs/round`);
  console.log(`  Seed: ${config.seed}`);
  console.log(`${"═".repeat(70)}\n`);

  // ─── Step 0: Clean experiment state ───────────────────────────────
  await cleanExperimentState();

  const windowRounds =
    config.interactionHistoryWindowRounds ?? INTERACTION_HISTORY_WINDOW.maxRounds;
  enableTraceInteractionWindow(windowRounds);

  try {
  // v2.2: Reset causal graph for fresh experiment
  causalGraph.reset();

  // v2.3: Reset temporal trust engine for fresh experiment
  temporalEngine.reset();

  // ─── Step 1: Create simulated providers ───────────────────────────
  const { providerIds, maliciousIds: initialMaliciousIds } = await createSimulatedProviders(config, rng);
  console.log(`  ✓ Created ${providerIds.length} simulated providers`);

  // ─── Step 2: Set up attack ────────────────────────────────────────
  const attack = createAttack(config.attack, {
    totalAgents: config.agents,
    maliciousRatio: config.maliciousRatio,
    params: { ...config.attackParams, jobsPerRound: config.jobsPerRound },
  });

  const maliciousIds = new Set<string>();
  if (attack) {
    const agents = attack.assignAgents(providerIds, initialMaliciousIds);
    for (const a of agents) {
      if (a.isMalicious) maliciousIds.add(a.providerId);
    }
    console.log(`  ✓ Attack: ${attack.name} — ${maliciousIds.size} malicious agents`);
  } else {
    console.log(`  ✓ No attack (baseline run)`);
  }

  // ─── Step 3: Simulation loop ──────────────────────────────────────
  const roundMetrics: RoundMetrics[] = [];
  const defaultedMaliciousIds = new Set<string>();
  const scoreTracker: Array<{
    round: number;
    providerId: string;
    providerName: string;
    traceScore: number;
    riskTier: string;
    isMalicious: boolean;
  }> = [];

  const attackStartRound = (() => {
    if (config.attack === "none") return config.rounds;
    if (config.attack === "whitewashing") return Math.floor(config.rounds * 0.35);
    if (config.attack === "sybil-cluster") return 0;
    if (config.attack === "collusion-ring") return 0;
    if (config.attack === "combined-collusion-whitewash") return 0;
    return Math.floor(config.rounds * 0.6); // strategic-default
  })();

  for (let round = 0; round < config.rounds; round++) {


    const simPrices = await prisma.provider.findMany({
      where: { isActive: true, id: { startsWith: "sim-agent-" } },
      select: { capability: true, priceSats: true },
    });
    const byCap = new Map<string, number[]>();
    for (const p of simPrices) {
      if (!byCap.has(p.capability)) byCap.set(p.capability, []);
      byCap.get(p.capability)!.push(p.priceSats);
    }
    const medianByCap = new Map<string, number>();
    for (const [cap, prices] of byCap) {
      const s = [...prices].sort((a, b) => a - b);
      medianByCap.set(cap, s.length ? s[Math.floor(s.length / 2)] : 0);
    }

    const roundJobs: Array<{
      providerId: string;
      success: boolean;
      priceSats: number;
      traceScore: number;
    }> = [];

    // v2.4: Track agents that defaulted THIS round — skip them in subsequent
    // jobs of the same round before persistAllNetworkTrust() has propagated.
    // Only applies to TRACE (baselines are unaware of defaults within a round).
    const roundDefaultedIds = new Set<string>();

    for (let job = 0; job < config.jobsPerRound; job++) {
      const capability = rng.pick(config.capabilities);

      // v2.4: For TRACE, retry routing if the first selection was a within-round defaulter.
      // Burn the same RNG calls to keep determinism for non-TRACE policies.
      let result = await selectProviderTRACE(capability, config.policy, experimentId, undefined, {
        enabled: true,
        round,
        random: () => rng.next(),
      });
      if (
        result
        && config.policy === "TRACE"
        && roundDefaultedIds.has(result.provider.id)
      ) {
        // First pick was a within-round defaulter — re-route to the next best candidate
        const altCandidate = result.candidates
          .filter((c) => !c.rejected && !roundDefaultedIds.has(c.providerId))
          .sort((a, b) => b.utility - a.utility)[0];
        if (altCandidate) {
          // Swap provider to the alternate (routing decision already logged with the defaulter; acceptable)
          const providers = await prisma.provider.findMany({
            where: { id: altCandidate.providerId },
          });
          if (providers[0]) {
            result = { ...result, provider: providers[0], utility: altCandidate.utility };
          }
        }
      }
      if (!result) continue;
      const provider = result.provider;
      const isMalicious = maliciousIds.has(provider.id);

      if (attack) {
        attack.observeRouting(provider.id, round, maliciousIds);
      }

      const medianPrice = medianByCap.get(capability) ?? provider.priceSats;

      // Determine outcome
      let success: boolean;
      if (isMalicious && attack) {
        const attackAgent = attack["agents"].find((a: { providerId: string }) => a.providerId === provider.id);
        if (attackAgent) {
          const decision = attack.decide(attackAgent, round, config.rounds, {
            jobPriceSats: provider.priceSats,
            medianJobPriceSats: medianPrice,
          });
          success = !decision.shouldDefault;
        } else {
          success = rng.next() > config.honestFailureRate;
        }
      } else {
        // Honest agents: small random failure rate
        success = rng.next() > config.honestFailureRate;
      }

      // Simulate job in DB
      const jobRecord = await prisma.job.create({
        data: {
          buyerId: "experiment-buyer",
          providerId: provider.id,
          capability,
          inputHash: `sim_${round}_${job}`,
          input: JSON.stringify({ simulated: true, round, job }),
          status: success ? "completed" : "failed",
          priceSats: provider.priceSats,
          feeSats: Math.ceil(provider.priceSats * 0.1),
          escrowStatus: success ? "released" : "refunded",
          completedAt: new Date(),
        },
      });

      // Update TRACE scores
      try {
        if (success) {
          await updateScoreAfterEvent(provider.id, "JOB_SUCCESS", jobRecord.id, provider.priceSats);
          await updateScoreAfterEvent(provider.id, "PAYMENT_SETTLED", jobRecord.id, provider.priceSats);
        } else {
          await updateScoreAfterEvent(provider.id, "JOB_FAILURE", jobRecord.id, provider.priceSats);
          // ALL failures are treated equally — no oracle knowledge
          if (isMalicious) {
            defaultedMaliciousIds.add(provider.id); // keep for METRICS only
          }
          roundDefaultedIds.add(provider.id); // track ALL failures for within-round re-routing
          await updateScoreAfterEvent(provider.id, "DEFAULT", jobRecord.id, provider.priceSats);
        }
      } catch {
        // Score update failures should not halt experiment
      }

      // Update trust graph edges (if we have a previous job this round)
      if (roundJobs.length > 0 && success) {
        const prevJob = roundJobs[roundJobs.length - 1];
        if (prevJob.providerId !== provider.id) {
          try {
            await updateTrustEdge(prevJob.providerId, provider.id, provider.priceSats, true);
            traceInteractionWindowRecordCoJob(round, prevJob.providerId, provider.id);
            // v2.2: Record interaction for causal graph
            causalGraph.recordInteraction(prevJob.providerId, provider.id);
            // v2.3: Record trust-building interaction for temporal analysis
            temporalEngine.recordTrustInteraction(prevJob.providerId, provider.id, provider.priceSats);
          } catch {
            // Graph update failures should not halt experiment
          }
        }
      }

      // v2.2: Record failures in causal graph for cascade tracking
      if (!success && isMalicious) {
        causalGraph.recordFailure({
          agentId: provider.id,
          round,
          type: "default",
          damageSats: provider.priceSats,
          jobId: jobRecord.id,
        });
      }

      // Update reputation (legacy, for comparison)
      const persistedProvider = await prisma.provider.findUnique({ where: { id: provider.id } });
      const totalJobs = persistedProvider?.totalJobs ?? 0;
      const previousReputationJobs = Math.max(totalJobs - 1, 0);
      const newRating = success ? 5.0 : 1.0;
      const currentRep = persistedProvider?.reputationScore ?? 3.0;
      const newRep = (currentRep * previousReputationJobs + newRating) / (previousReputationJobs + 1);
      await prisma.provider.update({
        where: { id: provider.id },
        data: {
          reputationScore: Math.round(newRep * 100) / 100,
        },
      });

      roundJobs.push({
        providerId: provider.id,
        success,
        priceSats: provider.priceSats,
        traceScore: provider.traceScore,
      });
    }

    traceInteractionWindowPrune(round);

    // Run attack post-round effects
    if (attack) {
      const postResult = await attack.postRound(round, config.rounds);
      if (postResult.actions.length > 0 && round % 10 === 0) {
        console.log(`    Round ${round}: ${postResult.actions.length} attack actions`);
      }
    }

    try {
      await persistAllNetworkTrust();
    } catch {}
    try {
      const { updateSybilRiskScores } = await import("../../trace");
      await updateSybilRiskScores();
    } catch {}

    if (process.env.TRACE_DEBUG_SYBIL === "1") {
      const sybilTop = await prisma.provider.findMany({
        where: { isActive: true },
        select: { id: true, name: true, sybilRisk: true },
        orderBy: { sybilRisk: "desc" },
        take: 5,
      });
      const summary = sybilTop
        .map((p) => `${p.name ?? p.id.substring(0, 6)}:${p.sybilRisk.toFixed(2)}`)
        .join(", ");
      console.log(`    Round ${round}: top sybilRisk -> ${summary}`);
    }

    // Collect provider scores for this round
    const allProviders = await prisma.provider.findMany({
      where: { isActive: true },
      select: { id: true, name: true, traceScore: true, riskTier: true, totalJobs: true, networkTrust: true },
    });

    const providerScores = new Map<string, number>();
    for (const p of allProviders) {
      providerScores.set(p.id, p.traceScore);
      scoreTracker.push({
        round,
        providerId: p.id,
        providerName: p.name,
        traceScore: p.traceScore,
        riskTier: p.riskTier,
        isMalicious: maliciousIds.has(p.id),
      });

      // v2.3: Record trust snapshot for temporal analysis
      try {
        const { diversityScore } = await computeCounterpartyEntropy(p.id);
        const totalRoundJobs = roundJobs.filter((j) => j.providerId === p.id).length;
        const routingShare = config.jobsPerRound > 0 ? totalRoundJobs / config.jobsPerRound : 0;
        temporalEngine.recordSnapshot(p.id, {
          round,
          traceScore: p.traceScore,
          entropy: diversityScore,
          routingShare,
          interactionCount: p.totalJobs,
          diversityScore,
        });
      } catch {
        // Non-fatal
      }
    }

    // Compute round metrics
    const metrics = computeRoundMetrics(round, roundJobs, maliciousIds, providerScores, defaultedMaliciousIds);
    roundMetrics.push(metrics);

    // Progress logging
    if (round % 10 === 0 || round === config.rounds - 1) {
      const m = metrics;
      console.log(
        `  Round ${String(round).padStart(3)}: ` +
        `success=${(m.successRate * 100).toFixed(0)}% ` +
        `fraud=${m.fraudExposureSats}sats ` +
        `mal_routed=${m.maliciousRoutingCount}/${m.totalJobs} ` +
        `avg_trace=${m.avgTraceScore.toFixed(0)} ` +
        `mal_trace=${m.avgMaliciousTraceScore.toFixed(0)} ` +
        `honest_trace=${m.avgHonestTraceScore.toFixed(0)}`
      );
    }
  }

  // ─── Step 4: Aggregate metrics ────────────────────────────────────
  const finalMetrics = aggregateMetrics(
    experimentId,
    config.policy,
    config.attack,
    config.agents,
    maliciousIds.size,
    roundMetrics,
    attackStartRound
  );

  // ─── Step 5: Save results ─────────────────────────────────────────
  const resultsDir = await saveResults(experimentId, config, finalMetrics, roundMetrics, scoreTracker, attack);

  // ─── Step 6: Print summary ────────────────────────────────────────
  console.log(`\n${"─".repeat(70)}`);
  console.log(`  RESULTS: ${experimentId}`);
  console.log(`${"─".repeat(70)}`);
  console.log(`  Overall Success Rate:        ${(finalMetrics.overallSuccessRate * 100).toFixed(1)}%`);
  console.log(`  Total Fraud Exposure:        ${finalMetrics.totalFraudExposureSats} sats`);
  console.log(`  Max Single-Round Fraud:      ${finalMetrics.maxFraudExposureInSingleRound} sats`);
  console.log(`  Malicious Routing Rate:      ${(finalMetrics.maliciousRoutingRate * 100).toFixed(1)}%`);
  console.log(`  Recovery Time:               ${finalMetrics.recoveryTimeRounds} rounds`);
  console.log(`  Pre-Attack Success:          ${(finalMetrics.preAttackSuccessRate * 100).toFixed(1)}%`);
  console.log(`  During-Attack Success:       ${(finalMetrics.duringAttackSuccessRate * 100).toFixed(1)}%`);
  console.log(`  Post-Attack Success:         ${(finalMetrics.postAttackSuccessRate * 100).toFixed(1)}%`);
  console.log(`  Peak Malicious TRACE Score:  ${finalMetrics.peakMaliciousTraceScore}`);
  console.log(`  Final Malicious TRACE Score: ${finalMetrics.finalMaliciousTraceScore}`);
  console.log(`  Score Drop Magnitude:        ${finalMetrics.maliciousScoreDropMagnitude}`);
  console.log(`  Avg Routing Concentration:   ${finalMetrics.avgRoutingConcentration.toFixed(4)}`);
  console.log(`${"─".repeat(70)}`);
  console.log(`  Results saved to: ${resultsDir}`);
  console.log(`${"═".repeat(70)}\n`);

  return resultsDir;
  } finally {
    disableTraceInteractionWindow();
  }
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

async function cleanExperimentState(): Promise<void> {
  // Clear experiment-related data (keep real providers intact)
  await prisma.routingDecision.deleteMany({});
  await prisma.scoreHistory.deleteMany({});
  await prisma.economicEvent.deleteMany({});
  await prisma.trustEdge.deleteMany({});
  await prisma.job.deleteMany({ where: { buyerId: "experiment-buyer" } });
  // Delete simulated providers
  await prisma.provider.deleteMany({
    where: { id: { startsWith: "sim-agent-" } },
  });
  // Create experiment buyer if not exists
  await prisma.buyer.upsert({
    where: { id: "experiment-buyer" },
    create: {
      id: "experiment-buyer",
      name: "Experiment Buyer",
      dailyBudgetSats: 999999,
      perIncidentCapSats: 999999,
    },
    update: {},
  });
}

async function createSimulatedProviders(
  config: ExperimentConfig,
  rng: SeededRandom
): Promise<{ providerIds: string[]; maliciousIds: Set<string> }> {
  const ids: string[] = [];
  const maliciousIds = new Set<string>();

  // Build the ordered agent list with model info
  interface AgentDef {
    index: number;
    model: string;
    displayName: string;
    modelIndex: number;  // index within that model type
    priceRange: { min: number; max: number };
  }

  const agentDefs: AgentDef[] = [];

  if (config.agentMix && config.agentMix.length > 0) {
    // v2.1: Named model mix — each agent gets model-specific naming and pricing
    let globalIndex = 0;
    for (const spec of config.agentMix) {
      for (let j = 0; j < spec.count; j++) {
        agentDefs.push({
          index: globalIndex++,
          model: spec.model,
          displayName: spec.displayName,
          modelIndex: j,
          priceRange: spec.priceRange,
        });
      }
    }
  } else {
    // Fallback: generic agents with uniform pricing
    for (let i = 0; i < config.agents; i++) {
      agentDefs.push({
        index: i,
        model: "generic",
        displayName: "Agent",
        modelIndex: i,
        priceRange: config.priceRange,
      });
    }
  }

  const totalAgents = agentDefs.length;
  const numMalicious = Math.floor(totalAgents * config.maliciousRatio);

  // P0/P1: Shuffle to assign malicious labels independently of price order
  const shuffledIndices = Array.from({ length: totalAgents }, (_, i) => i);
  for (let i = shuffledIndices.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
  }
  const maliciousIndexSet = new Set(shuffledIndices.slice(0, numMalicious));

  // Build all provider records first, then batch-insert.
  // At large N (≥ 100) this avoids thousands of round-trips to SQLite.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = [];

  for (const def of agentDefs) {
    const id = `sim-agent-${String(def.index).padStart(5, "0")}`;
    const capability = config.capabilities[def.index % config.capabilities.length];
    
    // P1: Malicious price strategy
    let price = rng.int(def.priceRange.min, def.priceRange.max);
    const isMalicious = maliciousIndexSet.has(def.index);
    if (isMalicious) {
      maliciousIds.add(id);
      const strategy = config.attackParams?.maliciousPriceStrategy as string | undefined;
      if (strategy === "cheap") {
        price = Math.max(1, Math.floor(def.priceRange.min * 0.8)); // 20% undercut
      } else if (strategy === "expensive") {
        price = Math.floor(def.priceRange.max * 1.2); // 20% overprice
      }
    }
    const stakeSats = config.policy === "STAKE_WEIGHTED" ? price * rng.int(5, 20) : 0;

    const name = config.agentMix
      ? `${def.displayName} #${String(def.modelIndex + 1).padStart(2, "0")}${isMalicious ? " [M]" : ""}`
      : `Agent ${String(def.index).padStart(5, "0")}${isMalicious ? " [M]" : ""}`;

    const description = config.agentMix
      ? `Simulated ${def.model} ${isMalicious ? "malicious" : "honest"} agent`
      : `Simulated ${isMalicious ? "malicious" : "honest"} provider for experiments`;

    rows.push({
      id,
      name,
      description,
      capability,
      priceSats: price,
      reputationScore: 3.0,
      endpointUrl: "/api/agents/simulated",
      isActive: true,
      traceScore: 500,
      riskTier: "B",
      defaultProbability: 0.05,
      completionRate: 1.0,
      repaymentRate: 1.0,
      successfulEscrowRate: 1.0,
      disputeRate: 0.0,
      networkTrust: 0.0,
      sybilRisk: 0.0,
      stakeSats,
      stakeStatus: stakeSats > 0 ? "staked" : "none",
      stakeRatio: stakeSats > 0 ? 1.0 : 0.0,
      scoreVolatility: 0.0,
      totalEconomicVolume: 0,
      successfulJobs: 0,
      failedJobs: 0,
      defaultedJobs: 0,
      disputedJobs: 0,
    });

    ids.push(id);
  }

  // Batch insert in chunks of 500 to stay within SQLite limits
  const CHUNK = 500;
  for (let start = 0; start < rows.length; start += CHUNK) {
    await prisma.provider.createMany({ data: rows.slice(start, start + CHUNK) });
  }

  // Print agent mix summary if using named models
  if (config.agentMix) {
    const modelCounts = config.agentMix.map((s) => `${s.count}× ${s.displayName}`).join(", ");
    console.log(`  ✓ Agent Mix: ${modelCounts}`);
    console.log(`  ✓ Total: ${totalAgents} agents (${numMalicious} malicious from ${config.agentMix.length} model types)`);
  }

  return { providerIds: ids, maliciousIds };
}

async function saveResults(
  experimentId: string,
  config: ExperimentConfig,
  metrics: ReturnType<typeof aggregateMetrics>,
  rounds: RoundMetrics[],
  scoreHistory: Array<{
    round: number;
    providerId: string;
    providerName: string;
    traceScore: number;
    riskTier: string;
    isMalicious: boolean;
  }>,
  attack: ReturnType<typeof createAttack>
): Promise<string> {
  const resultsDir = path.join(process.cwd(), "results", experimentId);
  fs.mkdirSync(resultsDir, { recursive: true });

  // config.json — full experiment configuration
  fs.writeFileSync(
    path.join(resultsDir, "config.json"),
    JSON.stringify({
      experimentId,
      config,
      attack: attack?.toJSON() ?? { name: "none" },
      traceConfig: snapshotConfig(),
      timestamp: new Date().toISOString(),
    }, null, 2)
  );

  // metrics.json — aggregate results
  const { rounds: _rounds, ...metricsWithoutRounds } = metrics;
  fs.writeFileSync(
    path.join(resultsDir, "metrics.json"),
    JSON.stringify(metricsWithoutRounds, null, 2)
  );

  // routing_logs.csv — per-round routing metrics
  fs.writeFileSync(
    path.join(resultsDir, "routing_logs.csv"),
    roundMetricsToCSV(rounds)
  );

  // score_history.csv — per-round per-provider TRACE scores
  fs.writeFileSync(
    path.join(resultsDir, "score_history.csv"),
    scoreHistoryToCSV(scoreHistory)
  );

  // summary.txt — human-readable summary
  const summary = [
    `TRACE Experiment: ${experimentId}`,
    `Date: ${new Date().toISOString()}`,
    ``,
    `Configuration:`,
    `  Policy: ${config.policy}`,
    `  Attack: ${config.attack}`,
    `  Agents: ${config.agents} (${Math.round(config.maliciousRatio * 100)}% malicious)`,
    `  Rounds: ${config.rounds} × ${config.jobsPerRound} jobs/round`,
    `  Seed: ${config.seed}`,
    ``,
    `Results:`,
    `  Overall Success Rate:        ${(metrics.overallSuccessRate * 100).toFixed(1)}%`,
    `  Total Fraud Exposure:        ${metrics.totalFraudExposureSats} sats`,
    `  Malicious Routing Rate:      ${(metrics.maliciousRoutingRate * 100).toFixed(1)}%`,
    `  Recovery Time:               ${metrics.recoveryTimeRounds} rounds`,
    `  Pre-Attack Success:          ${(metrics.preAttackSuccessRate * 100).toFixed(1)}%`,
    `  During-Attack Success:       ${(metrics.duringAttackSuccessRate * 100).toFixed(1)}%`,
    `  Post-Attack Success:         ${(metrics.postAttackSuccessRate * 100).toFixed(1)}%`,
    `  Peak Malicious TRACE Score:  ${metrics.peakMaliciousTraceScore}`,
    `  Final Malicious TRACE Score: ${metrics.finalMaliciousTraceScore}`,
    `  Score Drop Magnitude:        ${metrics.maliciousScoreDropMagnitude}`,
    ``,
  ].join("\n");

  fs.writeFileSync(path.join(resultsDir, "summary.txt"), summary);

  return resultsDir;
}

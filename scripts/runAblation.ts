/**
 * TRACE v2.1 — Ablation Study
 *
 * Systematically removes each v2.1 defense mechanism to measure
 * its individual contribution to collusion resistance.
 *
 * Ablations:
 *   1. FULL v2.1 (baseline)
 *   2. No entropy penalty (remove cliquePenalty from utility)
 *   3. No repeated-pair decay (set decayConstant = Infinity)
 *   4. No volume weighting (set minVolumeForFullWeight = 1)
 *   5. No diversity floor (remove anti-over-hardening guard)
 *   6. v2-equivalent (remove ALL v2.1 features)
 *
 * Usage:
 *   npx tsx scripts/runAblation.ts
 *   npx tsx scripts/runAblation.ts --seed 42 --agents 50
 */

import {
  runExperiment,
  DEFAULT_CONFIG,
  MODEL_PRESETS,
  type ExperimentConfig,
  type AgentModelSpec,
} from "../src/lib/trace/experiments";
import { OPENAI_CHAT_MODEL } from "../src/lib/openaiModel";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

// ─── Types ────────────────────────────────────────────────────────────────────

interface AblationVariant {
  name: string;
  description: string;
  /** Config overrides applied BEFORE the experiment runs */
  configPatch: () => void;
  /** Config restore applied AFTER the experiment runs */
  configRestore: () => void;
}

// We need to dynamically modify the config module at runtime.
// Import the mutable config objects:
import * as traceConfig from "../src/lib/trace/config";

// Store original values
const ORIGINAL_MU = (traceConfig.ROUTING_UTILITY as any).mu_cliquePenalty;
const ORIGINAL_DECAY = (traceConfig.REPEATED_PAIR as any).decayConstant;
const ORIGINAL_MIN_VOL = (traceConfig.ECONOMIC_VOLUME_WEIGHTING as any).minVolumeForFullWeight;
const ORIGINAL_MIN_ENTROPY = (traceConfig.COUNTERPARTY_DIVERSITY as any).minEntropyForFullTrust;

// ─── Ablation Variants ────────────────────────────────────────────────────────

const ablations: AblationVariant[] = [
  {
    name: "full-v2.1",
    description: "Full TRACE v2.1 (all features enabled)",
    configPatch: () => {},
    configRestore: () => {},
  },
  {
    name: "no-clique-penalty",
    description: "Remove μ·cliquePenalty from utility (entropy still affects trust, but no direct routing penalty)",
    configPatch: () => {
      (traceConfig.ROUTING_UTILITY as any).mu_cliquePenalty = 0;
    },
    configRestore: () => {
      (traceConfig.ROUTING_UTILITY as any).mu_cliquePenalty = ORIGINAL_MU;
    },
  },
  {
    name: "no-repeated-decay",
    description: "Remove repeated-pair exponential decay (all interactions weighted equally)",
    configPatch: () => {
      (traceConfig.REPEATED_PAIR as any).decayConstant = 99999;
    },
    configRestore: () => {
      (traceConfig.REPEATED_PAIR as any).decayConstant = ORIGINAL_DECAY;
    },
  },
  {
    name: "no-volume-weight",
    description: "Remove economic volume weighting (tiny transactions get full trust)",
    configPatch: () => {
      (traceConfig.ECONOMIC_VOLUME_WEIGHTING as any).minVolumeForFullWeight = 0.01;
    },
    configRestore: () => {
      (traceConfig.ECONOMIC_VOLUME_WEIGHTING as any).minVolumeForFullWeight = ORIGINAL_MIN_VOL;
    },
  },
  {
    name: "no-entropy-scoring",
    description: "Remove all entropy-based diversity scoring (clique penalty + diversity-adjusted trust)",
    configPatch: () => {
      (traceConfig.ROUTING_UTILITY as any).mu_cliquePenalty = 0;
      (traceConfig.COUNTERPARTY_DIVERSITY as any).minEntropyForFullTrust = 0.001; // Everything gets full score
    },
    configRestore: () => {
      (traceConfig.ROUTING_UTILITY as any).mu_cliquePenalty = ORIGINAL_MU;
      (traceConfig.COUNTERPARTY_DIVERSITY as any).minEntropyForFullTrust = ORIGINAL_MIN_ENTROPY;
    },
  },
  {
    name: "v2-equivalent",
    description: "Remove ALL v2.1 features (equivalent to v2 behavior)",
    configPatch: () => {
      (traceConfig.ROUTING_UTILITY as any).mu_cliquePenalty = 0;
      (traceConfig.COUNTERPARTY_DIVERSITY as any).minEntropyForFullTrust = 0.001;
      (traceConfig.REPEATED_PAIR as any).decayConstant = 99999;
      (traceConfig.ECONOMIC_VOLUME_WEIGHTING as any).minVolumeForFullWeight = 0.01;
    },
    configRestore: () => {
      (traceConfig.ROUTING_UTILITY as any).mu_cliquePenalty = ORIGINAL_MU;
      (traceConfig.COUNTERPARTY_DIVERSITY as any).minEntropyForFullTrust = ORIGINAL_MIN_ENTROPY;
      (traceConfig.REPEATED_PAIR as any).decayConstant = ORIGINAL_DECAY;
      (traceConfig.ECONOMIC_VOLUME_WEIGHTING as any).minVolumeForFullWeight = ORIGINAL_MIN_VOL;
    },
  },
];

// ─── CLI Args ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string, def: string): string => {
    const idx = args.indexOf(`--${flag}`);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : def;
  };

  return {
    seed: parseInt(get("seed", "42")),
    agents: parseInt(get("agents", "50")),
    rounds: parseInt(get("rounds", "60")),
    jobs: parseInt(get("jobs", "5")),
    malicious: parseFloat(get("malicious", "0.3")),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface AblationResult {
  variant: string;
  description: string;
  successRate: number;
  fraudExposure: number;
  maliciousRouting: number;
  recoveryTime: number;
  duringAttackSuccess: number;
  peakMaliciousScore: number;
  finalMaliciousScore: number;
  resultsDir: string;
}

function buildMix(agents: number): AgentModelSpec[] {
  const gpt = MODEL_PRESETS[OPENAI_CHAT_MODEL];
  const sarvam = MODEL_PRESETS["sarvam"];
  const llama = MODEL_PRESETS["llama-3.2-3b"];
  const third = Math.floor(agents / 3);
  const remainder = agents - third * 3;
  return [
    { ...gpt, count: third + (remainder > 0 ? 1 : 0) },
    { ...sarvam, count: third + (remainder > 1 ? 1 : 0) },
    { ...llama, count: third },
  ];
}

async function main() {
  const opts = parseArgs();
  const mix = buildMix(opts.agents);
  const allResults: AblationResult[] = [];

  console.log("\n╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║              TRACE v2.1 — ABLATION STUDY                            ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝\n");
  console.log(`  Attack: collusion-ring`);
  console.log(`  Agents: ${opts.agents} (${mix.map((s) => `${s.count}×${s.model}`).join(", ")})`);
  console.log(`  Malicious: ${(opts.malicious * 100).toFixed(0)}%`);
  console.log(`  Rounds: ${opts.rounds} × ${opts.jobs} jobs/round`);
  console.log(`  Seed: ${opts.seed}`);
  console.log(`  Variants: ${ablations.length}\n`);

  for (const ablation of ablations) {
    console.log(`\n${"━".repeat(70)}`);
    console.log(`  ABLATION: ${ablation.name}`);
    console.log(`  ${ablation.description}`);
    console.log(`${"━".repeat(70)}`);

    // Apply config patch
    ablation.configPatch();

    const config: ExperimentConfig = {
      ...DEFAULT_CONFIG,
      policy: "TRACE",
      attack: "collusion-ring",
      agents: opts.agents,
      agentMix: mix,
      maliciousRatio: opts.malicious,
      rounds: opts.rounds,
      jobsPerRound: opts.jobs,
      seed: opts.seed,
    };

    const dir = await runExperiment(config);

    // Restore config
    ablation.configRestore();

    // Read metrics
    const metricsPath = path.join(dir, "metrics.json");
    const metrics = JSON.parse(fs.readFileSync(metricsPath, "utf-8"));

    allResults.push({
      variant: ablation.name,
      description: ablation.description,
      successRate: metrics.overallSuccessRate,
      fraudExposure: metrics.totalFraudExposureSats,
      maliciousRouting: metrics.maliciousRoutingRate,
      recoveryTime: metrics.recoveryTimeRounds,
      duringAttackSuccess: metrics.duringAttackSuccessRate,
      peakMaliciousScore: metrics.peakMaliciousTraceScore,
      finalMaliciousScore: metrics.finalMaliciousTraceScore,
      resultsDir: dir,
    });
  }

  // ─── Report ─────────────────────────────────────────────────────────
  const reportDir = path.join(process.cwd(), "results", `ablation_${opts.seed}_${Date.now()}`);
  fs.mkdirSync(reportDir, { recursive: true });

  console.log(`\n${"═".repeat(70)}`);
  console.log(`  ABLATION RESULTS — Collusion Ring (N=${opts.agents})`);
  console.log(`${"═".repeat(70)}\n`);

  console.log(`  ${"Variant".padEnd(24)} ${"Success".padStart(10)} ${"Fraud".padStart(12)} ${"Mal.Route".padStart(12)} ${"Recovery".padStart(10)}`);
  console.log(`  ${"─".repeat(68)}`);

  // Find baseline for delta computation
  const baseline = allResults[0];

  for (const r of allResults) {
    const fraudDelta = r.fraudExposure - baseline.fraudExposure;
    const deltaStr = r.variant === "full-v2.1" ? "" : ` (Δfraud: ${fraudDelta >= 0 ? "+" : ""}${fraudDelta})`;

    console.log(
      `  ${r.variant.padEnd(24)} ` +
      `${(r.successRate * 100).toFixed(1).padStart(9)}% ` +
      `${(r.fraudExposure + " sats").padStart(12)} ` +
      `${(r.maliciousRouting * 100).toFixed(1).padStart(11)}% ` +
      `${(r.recoveryTime + " rds").padStart(10)}` +
      deltaStr
    );
  }

  console.log(`  ${"─".repeat(68)}`);

  // Feature importance ranking
  console.log(`\n  Feature Importance (by fraud increase when removed):`);
  console.log(`  ${"─".repeat(50)}`);

  const featureImpact = allResults
    .filter((r) => r.variant !== "full-v2.1" && r.variant !== "v2-equivalent")
    .map((r) => ({
      name: r.variant,
      fraudIncrease: r.fraudExposure - baseline.fraudExposure,
      routingIncrease: (r.maliciousRouting - baseline.maliciousRouting) * 100,
    }))
    .sort((a, b) => b.fraudIncrease - a.fraudIncrease);

  for (const f of featureImpact) {
    console.log(
      `  ${f.name.padEnd(24)} fraud: +${String(f.fraudIncrease).padStart(4)} sats    routing: +${f.routingIncrease.toFixed(1).padStart(6)}%`
    );
  }
  console.log(`  ${"─".repeat(50)}\n`);

  // Save
  const csv = [
    "variant,description,success_rate,fraud_exposure_sats,malicious_routing,recovery_time,during_attack_success,peak_malicious_score,final_malicious_score",
    ...allResults.map((r) =>
      `${r.variant},"${r.description}",${r.successRate.toFixed(4)},${r.fraudExposure},${r.maliciousRouting.toFixed(4)},${r.recoveryTime},${r.duringAttackSuccess.toFixed(4)},${r.peakMaliciousScore},${r.finalMaliciousScore}`
    ),
  ].join("\n");

  fs.writeFileSync(path.join(reportDir, "ablation_results.csv"), csv);
  fs.writeFileSync(path.join(reportDir, "ablation_results.json"), JSON.stringify(allResults, null, 2));

  console.log(`  Results saved to: ${reportDir}`);
  console.log(`${"═".repeat(70)}\n`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));

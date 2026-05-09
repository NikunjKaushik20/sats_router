/**
 * TRACE v2.1 — Weight Sensitivity Analysis
 *
 * Perturbs core TRACE parameters ±30% to measure robustness:
 *   - Entropy weight
 *   - Clique penalty (μ)
 *   - Repeated-pair decay constant
 *   - Sybil suppression weight (λ)
 *
 * Measures: Does TRACE degrade gracefully or collapse?
 *
 * Usage:
 *   npx tsx scripts/runSensitivity.ts
 *   npx tsx scripts/runSensitivity.ts --seeds 5 --agents 50
 */

import {
  runExperiment,
  DEFAULT_CONFIG,
  MODEL_PRESETS,
  type ExperimentConfig,
  type AgentModelSpec,
} from "../src/lib/trace/experiments";
import { descriptiveStats, type ExperimentResult } from "../src/lib/trace/experiments/statistics";
import * as traceConfig from "../src/lib/trace/config";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

// ─── Types ────────────────────────────────────────────────────────────────────

interface SensitivityParam {
  name: string;
  configObj: string;
  configKey: string;
  originalValue: number;
  /** Access and mutate the config at runtime */
  get: () => number;
  set: (val: number) => void;
}

interface SensitivityResult {
  param: string;
  perturbation: string;
  value: number;
  seeds: number[];
  fraudMean: number;
  fraudStd: number;
  routingMean: number;
  routingStd: number;
  successMean: number;
  successStd: number;
}

// ─── Parameter Definitions ────────────────────────────────────────────────────

const PARAMS: SensitivityParam[] = [
  {
    name: "clique_penalty_μ",
    configObj: "ROUTING_UTILITY",
    configKey: "mu_cliquePenalty",
    originalValue: (traceConfig.ROUTING_UTILITY as any).mu_cliquePenalty,
    get: () => (traceConfig.ROUTING_UTILITY as any).mu_cliquePenalty,
    set: (v) => { (traceConfig.ROUTING_UTILITY as any).mu_cliquePenalty = v; },
  },
  {
    name: "sybil_penalty_λ",
    configObj: "ROUTING_UTILITY",
    configKey: "lambda_sybilPenalty",
    originalValue: (traceConfig.ROUTING_UTILITY as any).lambda_sybilPenalty,
    get: () => (traceConfig.ROUTING_UTILITY as any).lambda_sybilPenalty,
    set: (v) => { (traceConfig.ROUTING_UTILITY as any).lambda_sybilPenalty = v; },
  },
  {
    name: "repeated_pair_decay",
    configObj: "REPEATED_PAIR",
    configKey: "decayConstant",
    originalValue: (traceConfig.REPEATED_PAIR as any).decayConstant,
    get: () => (traceConfig.REPEATED_PAIR as any).decayConstant,
    set: (v) => { (traceConfig.REPEATED_PAIR as any).decayConstant = v; },
  },
  {
    name: "min_entropy_threshold",
    configObj: "COUNTERPARTY_DIVERSITY",
    configKey: "minEntropyForFullTrust",
    originalValue: (traceConfig.COUNTERPARTY_DIVERSITY as any).minEntropyForFullTrust,
    get: () => (traceConfig.COUNTERPARTY_DIVERSITY as any).minEntropyForFullTrust,
    set: (v) => { (traceConfig.COUNTERPARTY_DIVERSITY as any).minEntropyForFullTrust = v; },
  },
];

const PERTURBATIONS = [
  { label: "-30%", factor: 0.7 },
  { label: "baseline", factor: 1.0 },
  { label: "+30%", factor: 1.3 },
];

// ─── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string, def: string): string => {
    const idx = args.indexOf(`--${flag}`);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : def;
  };
  return {
    seeds: parseInt(get("seeds", "5")),
    agents: parseInt(get("agents", "50")),
    attack: get("attack", "collusion-ring") as any,
  };
}

// ─── Mix Builder ──────────────────────────────────────────────────────────────

function buildMix(n: number): AgentModelSpec[] {
  const gpt = MODEL_PRESETS["gpt-4o-mini"];
  const sarvam = MODEL_PRESETS["sarvam"];
  const llama = MODEL_PRESETS["llama-3.2-3b"];
  const third = Math.floor(n / 3);
  const rem = n - third * 3;
  return [
    { ...gpt, count: third + (rem > 0 ? 1 : 0) },
    { ...sarvam, count: third + (rem > 1 ? 1 : 0) },
    { ...llama, count: third },
  ];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  const mix = buildMix(opts.agents);
  const totalRuns = PARAMS.length * PERTURBATIONS.length * opts.seeds;

  console.log("\n╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║         TRACE v2.1 — WEIGHT SENSITIVITY ANALYSIS                    ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝\n");
  console.log(`  Attack: ${opts.attack}`);
  console.log(`  Agents: ${opts.agents}`);
  console.log(`  Seeds: ${opts.seeds}`);
  console.log(`  Parameters: ${PARAMS.map((p) => p.name).join(", ")}`);
  console.log(`  Perturbations: ${PERTURBATIONS.map((p) => p.label).join(", ")}`);
  console.log(`  Total runs: ${totalRuns}`);
  console.log(`  Estimated time: ~${Math.ceil(totalRuns * 20 / 60)} minutes\n`);

  const results: SensitivityResult[] = [];
  let completed = 0;

  for (const param of PARAMS) {
    for (const perturb of PERTURBATIONS) {
      const perturbedValue = param.originalValue * perturb.factor;

      // Apply perturbation
      param.set(perturbedValue);

      const seedMetrics: ExperimentResult[] = [];
      const seedList: number[] = [];

      for (let seed = 1; seed <= opts.seeds; seed++) {
        completed++;
        console.log(`  [${completed}/${totalRuns}] ${param.name} ${perturb.label} (${perturbedValue.toFixed(3)}) seed=${seed}`);

        const config: ExperimentConfig = {
          ...DEFAULT_CONFIG,
          policy: "TRACE",
          attack: opts.attack,
          agents: opts.agents,
          agentMix: mix,
          maliciousRatio: 0.3,
          rounds: 60,
          jobsPerRound: 5,
          seed,
        };

        const dir = await runExperiment(config);
        const metrics = JSON.parse(fs.readFileSync(path.join(dir, "metrics.json"), "utf-8")) as ExperimentResult;
        seedMetrics.push(metrics);
        seedList.push(seed);
      }

      // Restore original
      param.set(param.originalValue);

      const fraudStats = descriptiveStats(seedMetrics.map((m) => m.totalFraudExposureSats));
      const routingStats = descriptiveStats(seedMetrics.map((m) => m.maliciousRoutingRate * 100));
      const successStats = descriptiveStats(seedMetrics.map((m) => m.overallSuccessRate * 100));

      results.push({
        param: param.name,
        perturbation: perturb.label,
        value: perturbedValue,
        seeds: seedList,
        fraudMean: fraudStats.mean,
        fraudStd: fraudStats.std,
        routingMean: routingStats.mean,
        routingStd: routingStats.std,
        successMean: successStats.mean,
        successStd: successStats.std,
      });
    }
  }

  // ─── Report ─────────────────────────────────────────────────────────
  const reportDir = path.join(process.cwd(), "results", `sensitivity_${opts.attack}_${Date.now()}`);
  fs.mkdirSync(reportDir, { recursive: true });

  console.log(`\n${"═".repeat(80)}`);
  console.log(`  SENSITIVITY RESULTS — ${opts.attack} (N=${opts.agents})`);
  console.log(`${"═".repeat(80)}\n`);

  console.log(`  ${"Parameter".padEnd(24)} ${"Perturb".padStart(10)} ${"Value".padStart(8)} ${"Fraud".padStart(18)} ${"Routing".padStart(18)} ${"Success".padStart(18)}`);
  console.log(`  ${"─".repeat(96)}`);

  for (const r of results) {
    const isBaseline = r.perturbation === "baseline";
    const marker = isBaseline ? " ◀" : "";
    console.log(
      `  ${r.param.padEnd(24)} ${r.perturbation.padStart(10)} ${r.value.toFixed(3).padStart(8)} ` +
      `${(r.fraudMean.toFixed(1) + " ± " + r.fraudStd.toFixed(1)).padStart(18)} ` +
      `${(r.routingMean.toFixed(1) + " ± " + r.routingStd.toFixed(1) + "%").padStart(18)} ` +
      `${(r.successMean.toFixed(1) + " ± " + r.successStd.toFixed(1) + "%").padStart(18)}${marker}`
    );
  }

  console.log(`  ${"─".repeat(96)}`);

  // Stability assessment
  console.log(`\n  Stability Assessment:`);
  console.log(`  ${"─".repeat(60)}`);

  for (const param of PARAMS) {
    const paramResults = results.filter((r) => r.param === param.name);
    const baselineResult = paramResults.find((r) => r.perturbation === "baseline");
    if (!baselineResult) continue;

    const maxFraudDelta = Math.max(
      ...paramResults.map((r) => Math.abs(r.fraudMean - baselineResult.fraudMean))
    );
    const maxRoutingDelta = Math.max(
      ...paramResults.map((r) => Math.abs(r.routingMean - baselineResult.routingMean))
    );

    const stable = maxFraudDelta < 30 && maxRoutingDelta < 10;
    console.log(
      `  ${param.name.padEnd(24)} max Δfraud: ${maxFraudDelta.toFixed(1).padStart(6)} sats  max Δrouting: ${maxRoutingDelta.toFixed(1).padStart(6)}%  ${stable ? "✅ STABLE" : "⚠️ SENSITIVE"}`
    );
  }

  console.log(`  ${"─".repeat(60)}\n`);

  // Save
  const csv = [
    "param,perturbation,value,fraud_mean,fraud_std,routing_mean,routing_std,success_mean,success_std",
    ...results.map((r) =>
      `${r.param},${r.perturbation},${r.value.toFixed(4)},${r.fraudMean},${r.fraudStd},${r.routingMean},${r.routingStd},${r.successMean},${r.successStd}`
    ),
  ].join("\n");

  fs.writeFileSync(path.join(reportDir, "sensitivity_results.csv"), csv);
  fs.writeFileSync(path.join(reportDir, "sensitivity_results.json"), JSON.stringify(results, null, 2));

  console.log(`  Results saved to: ${reportDir}`);
  console.log(`${"═".repeat(80)}\n`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));

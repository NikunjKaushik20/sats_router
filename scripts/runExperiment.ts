/**
 * TRACE Experiment CLI
 *
 * Usage:
 *   npm run experiment                          # Run default strategic-default experiment
 *   npm run experiment -- --policy trace --attack strategic-default --agents 20 --seed 42
 *   npm run experiment -- --policy reputation   # Baseline comparison
 *   npm run experiment -- --attack none         # No attack (baseline)
 *   npm run experiment -- --compare             # Run TRACE vs REPUTATION vs PRICE comparison
 *
 * Options:
 *   --policy       trace | reputation | price          [default: trace]
 *   --attack       strategic-default | whitewashing | sybil-cluster | collusion-ring | none  [default: strategic-default]
 *   --agents       Number of simulated agents          [default: 20]
 *   --malicious    Malicious ratio (0–1)                [default: 0.2]
 *   --rounds       Simulation rounds                    [default: 50]
 *   --jobs         Jobs per round                       [default: 3]
 *   --seed         Random seed                          [default: 42]
 *   --compare      Run all 3 policies and compare
 */

import { runExperiment, DEFAULT_CONFIG, MODEL_PRESETS, type ExperimentConfig, type AgentModelSpec } from "../src/lib/trace/experiments";
import type { RoutingPolicy } from "../src/lib/trace";
import type { AttackType } from "../src/lib/trace/attacks";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

// ─── Parse CLI Args ───────────────────────────────────────────────────────────

function parseArgs(): {
  policy: RoutingPolicy;
  attack: AttackType;
  agents: number;
  malicious: number;
  rounds: number;
  jobs: number;
  seed: number;
  compare: boolean;
  agentMix?: AgentModelSpec[];
} {
  const args = process.argv.slice(2);
  const get = (flag: string, def: string): string => {
    const idx = args.indexOf(`--${flag}`);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : def;
  };

  // Parse --mix flag: format is "10:gpt-4o-mini,10:sarvam,10:llama-3.2-3b"
  let agentMix: AgentModelSpec[] | undefined;
  const mixStr = get("mix", "");
  if (mixStr) {
    agentMix = mixStr.split(",").map((part) => {
      const [countStr, model] = part.trim().split(":");
      const preset = MODEL_PRESETS[model];
      if (!preset) {
        console.error(`Unknown model: ${model}. Available: ${Object.keys(MODEL_PRESETS).join(", ")}`);
        process.exit(1);
      }
      return { ...preset, count: parseInt(countStr) };
    });
  }

  return {
    policy: get("policy", "trace") as RoutingPolicy,
    attack: get("attack", "strategic-default") as AttackType,
    agents: parseInt(get("agents", "20")),
    malicious: parseFloat(get("malicious", "0.2")),
    rounds: parseInt(get("rounds", "50")),
    jobs: parseInt(get("jobs", "3")),
    seed: parseInt(get("seed", "42")),
    compare: args.includes("--compare"),
    agentMix,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();

  if (opts.compare) {
    // Run all 3 policies with the same attack and seed
    console.log("\n╔══════════════════════════════════════════════════════════════════════╗");
    console.log("║                    TRACE COMPARISON EXPERIMENT                       ║");
    console.log("╚══════════════════════════════════════════════════════════════════════╝\n");

    const policies: RoutingPolicy[] = ["TRACE", "REPUTATION", "PRICE"];
    const results: Array<{ policy: string; dir: string }> = [];

    for (const policy of policies) {
      const config: ExperimentConfig = {
        ...DEFAULT_CONFIG,
        policy,
        attack: opts.attack,
        agents: opts.agents,
        agentMix: opts.agentMix,
        maliciousRatio: opts.malicious,
        rounds: opts.rounds,
        jobsPerRound: opts.jobs,
        seed: opts.seed,
      };

      const dir = await runExperiment(config);
      results.push({ policy, dir });
    }

    // Generate comparison report
    generateComparisonReport(results, opts);
  } else {
    // Single experiment
    const config: ExperimentConfig = {
      ...DEFAULT_CONFIG,
      policy: opts.policy,
      attack: opts.attack,
      agents: opts.agents,
      agentMix: opts.agentMix,
      maliciousRatio: opts.malicious,
      rounds: opts.rounds,
      jobsPerRound: opts.jobs,
      seed: opts.seed,
    };

    await runExperiment(config);
  }
}

function generateComparisonReport(
  results: Array<{ policy: string; dir: string }>,
  opts: ReturnType<typeof parseArgs>
) {
  const metrics = results.map(({ policy, dir }) => {
    const metricsPath = path.join(dir, "metrics.json");
    const data = JSON.parse(fs.readFileSync(metricsPath, "utf-8"));
    return { policy, ...data };
  });

  const reportDir = path.join(process.cwd(), "results", `comparison_${opts.attack}_${opts.seed}_${Date.now()}`);
  fs.mkdirSync(reportDir, { recursive: true });

  // Comparison table
  const table = [
    "Metric," + metrics.map((m) => m.policy).join(","),
    "Overall Success Rate," + metrics.map((m) => (m.overallSuccessRate * 100).toFixed(1) + "%").join(","),
    "Total Fraud Exposure," + metrics.map((m) => m.totalFraudExposureSats + " sats").join(","),
    "Malicious Routing Rate," + metrics.map((m) => (m.maliciousRoutingRate * 100).toFixed(1) + "%").join(","),
    "Recovery Time (rounds)," + metrics.map((m) => m.recoveryTimeRounds).join(","),
    "Pre-Attack Success," + metrics.map((m) => (m.preAttackSuccessRate * 100).toFixed(1) + "%").join(","),
    "During-Attack Success," + metrics.map((m) => (m.duringAttackSuccessRate * 100).toFixed(1) + "%").join(","),
    "Post-Attack Success," + metrics.map((m) => (m.postAttackSuccessRate * 100).toFixed(1) + "%").join(","),
    "Peak Malicious Score," + metrics.map((m) => m.peakMaliciousTraceScore).join(","),
    "Final Malicious Score," + metrics.map((m) => m.finalMaliciousTraceScore).join(","),
    "Score Drop," + metrics.map((m) => m.maliciousScoreDropMagnitude).join(","),
    "Max Single-Round Fraud," + metrics.map((m) => m.maxFraudExposureInSingleRound + " sats").join(","),
    "Routing Concentration," + metrics.map((m) => m.avgRoutingConcentration.toFixed(4)).join(","),
  ].join("\n");

  fs.writeFileSync(path.join(reportDir, "comparison.csv"), table);

  // Human-readable report
  const report = [
    `═══════════════════════════════════════════════════════════════════════`,
    `  COMPARISON REPORT: ${opts.attack} attack`,
    `  Agents: ${opts.agents} (${Math.round(opts.malicious * 100)}% malicious)`,
    `  Rounds: ${opts.rounds} | Seed: ${opts.seed}`,
    `═══════════════════════════════════════════════════════════════════════`,
    ``,
    `  ${"Metric".padEnd(30)} ${"TRACE".padStart(12)} ${"REPUTATION".padStart(12)} ${"PRICE".padStart(12)}`,
    `  ${"─".repeat(66)}`,
  ];

  const m = metrics;
  const rows: Array<[string, ...string[]]> = [
    ["Success Rate", ...m.map((x: { overallSuccessRate: number }) => (x.overallSuccessRate * 100).toFixed(1) + "%")],
    ["Fraud Exposure", ...m.map((x: { totalFraudExposureSats: number }) => x.totalFraudExposureSats + " sats")],
    ["Malicious Routing", ...m.map((x: { maliciousRoutingRate: number }) => (x.maliciousRoutingRate * 100).toFixed(1) + "%")],
    ["Recovery Time", ...m.map((x: { recoveryTimeRounds: number }) => x.recoveryTimeRounds + " rounds")],
    ["During-Attack Success", ...m.map((x: { duringAttackSuccessRate: number }) => (x.duringAttackSuccessRate * 100).toFixed(1) + "%")],
    ["Post-Attack Success", ...m.map((x: { postAttackSuccessRate: number }) => (x.postAttackSuccessRate * 100).toFixed(1) + "%")],
    ["Score Drop", ...m.map((x: { maliciousScoreDropMagnitude: number }) => x.maliciousScoreDropMagnitude.toFixed(1))],
  ];

  for (const [label, ...values] of rows) {
    report.push(`  ${label.padEnd(30)} ${values.map((v) => v.padStart(12)).join(" ")}`);
  }

  report.push(`  ${"─".repeat(66)}`);
  report.push(`  Results saved to: ${reportDir}`);
  report.push(`═══════════════════════════════════════════════════════════════════════`);

  const reportText = report.join("\n");
  console.log("\n" + reportText + "\n");
  fs.writeFileSync(path.join(reportDir, "comparison.txt"), reportText);
  fs.writeFileSync(path.join(reportDir, "all_metrics.json"), JSON.stringify(metrics, null, 2));
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));

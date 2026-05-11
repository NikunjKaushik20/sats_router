

import {
  runExperiment,
  DEFAULT_CONFIG,
  MODEL_PRESETS,
  type ExperimentConfig,
  type AgentModelSpec,
} from "../src/lib/trace/experiments";
import { OPENAI_CHAT_MODEL } from "../src/lib/openaiModel";
import type { AttackType } from "../src/lib/trace/attacks";
import { ADAPTIVE_SCALING } from "../src/lib/trace/adaptiveConfig";
import { CAUSAL_CONFIG } from "../src/lib/trace/causalGraph";
import { TEMPORAL_CONFIG } from "../src/lib/trace/temporalTrust";
import { snapshotConfig } from "../src/lib/trace/config";
import {
  descriptiveStats,
  mannWhitneyU,
  detectOutliers,
  type ExperimentResult,
} from "../src/lib/trace/experiments/statistics";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

// ─── Constants ────────────────────────────────────────────────────────────────

type TraceVersion = "v2.1" | "v2.2" | "v2.3";

const ALL_ATTACKS: AttackType[] = ["strategic-default", "sybil-cluster", "collusion-ring", "whitewashing"];
const ALL_SCALES = [50, 100];
const DEFAULT_SEEDS = 20;
const ROUNDS = 60;
const JOBS_PER_ROUND = 5;
const MALICIOUS_RATIO = 0.3;

// ─── Version Feature Toggles ──────────────────────────────────────────────────

/**
 * Set feature flags to simulate a specific TRACE version.
 *
 * v2.1: No adaptive scaling, no causal graph, no temporal analysis
 * v2.2: Adaptive scaling + causal graph ON, temporal OFF
 * v2.3: Everything enabled (adaptive + causal + temporal)
 *
 * This is the ONLY thing that changes between runs — guaranteeing
 * the comparison is fair.
 */
function setVersion(version: TraceVersion): void {
  switch (version) {
    case "v2.1":
      (ADAPTIVE_SCALING as any).enabled = false;
      (CAUSAL_CONFIG as any).enabled = false;
      (TEMPORAL_CONFIG as any).enabled = false;
      break;
    case "v2.2":
      (ADAPTIVE_SCALING as any).enabled = true;
      (CAUSAL_CONFIG as any).enabled = true;
      (TEMPORAL_CONFIG as any).enabled = false;
      break;
    case "v2.3":
      (ADAPTIVE_SCALING as any).enabled = true;
      (CAUSAL_CONFIG as any).enabled = true;
      (TEMPORAL_CONFIG as any).enabled = true;
      break;
  }
}

// ─── Agent Mix Builder ────────────────────────────────────────────────────────

function buildMix(n: number): AgentModelSpec[] {
  const gpt = MODEL_PRESETS[OPENAI_CHAT_MODEL];
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

// ─── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string, def: string): string => {
    const idx = args.indexOf(`--${flag}`);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : def;
  };

  // Versions are hardcoded — this is a v2.1 vs v2.2 vs v2.3 comparison tool
  const versions: TraceVersion[] = ["v2.1", "v2.2", "v2.3"];
  const attackStr = get("attacks", "");
  const attacks = attackStr ? [attackStr as AttackType] : ALL_ATTACKS;
  const agentStr = get("agents", "");
  const scales = agentStr ? [parseInt(agentStr)] : ALL_SCALES;
  const seeds = parseInt(get("seeds", String(DEFAULT_SEEDS)));

  return { versions, attacks, scales, seeds };
}

// ─── Result Types ─────────────────────────────────────────────────────────────

interface VersionCellResult {
  version: TraceVersion;
  attack: AttackType;
  scale: number;
  seedResults: Array<{ seed: number; metrics: ExperimentResult; dir: string }>;
}

// ─── Statistical Extensions ───────────────────────────────────────────────────

/**
 * Cliff's Delta: non-parametric effect size measure.
 *
 *   |d| < 0.147: negligible
 *   |d| < 0.33:  small
 *   |d| < 0.474: medium
 *   |d| >= 0.474: large
 */
function cliffsDelta(groupA: number[], groupB: number[]): { delta: number; interpretation: string } {
  let moreCount = 0;
  let lessCount = 0;
  for (const a of groupA) {
    for (const b of groupB) {
      if (a > b) moreCount++;
      else if (a < b) lessCount++;
    }
  }
  const n = groupA.length * groupB.length;
  const delta = n > 0 ? (moreCount - lessCount) / n : 0;
  const absDelta = Math.abs(delta);

  let interpretation: string;
  if (absDelta < 0.147) interpretation = "negligible";
  else if (absDelta < 0.33) interpretation = "small";
  else if (absDelta < 0.474) interpretation = "medium";
  else interpretation = "large";

  return { delta: Math.round(delta * 10000) / 10000, interpretation };
}

/**
 * Catastrophic seed analysis: counts seeds where fraud > median + 2σ.
 */
function catastrophicSeedRate(values: number[]): { rate: number; threshold: number; count: number } {
  const stats = descriptiveStats(values);
  const threshold = stats.median + 2 * stats.std;
  const catastrophic = values.filter((v) => v > threshold);
  return {
    rate: values.length > 0 ? catastrophic.length / values.length : 0,
    threshold: Math.round(threshold * 100) / 100,
    count: catastrophic.length,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  const totalExperiments = opts.versions.length * opts.attacks.length * opts.scales.length * opts.seeds;

  console.log("\n╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║       TRACE — VERSION COMPARISON VALIDATION SUITE                   ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝\n");
  console.log(`  Versions: ${opts.versions.join(" vs ")}`);
  console.log(`  Attacks: ${opts.attacks.join(", ")}`);
  console.log(`  Scales: N=${opts.scales.join(", N=")}`);
  console.log(`  Seeds: 1–${opts.seeds}`);
  console.log(`  Total experiments: ${totalExperiments}`);
  console.log(`  Estimated time: ~${Math.ceil(totalExperiments * 20 / 60)} minutes\n`);

  // Save frozen config snapshot
  setVersion("v2.3");
  const configDir = path.join(process.cwd(), "configs");
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    path.join(configDir, "v2_3_final.json"),
    JSON.stringify(snapshotConfig(), null, 2)
  );
  console.log(`  ✓ Frozen v2.3 config saved to configs/v2_3_final.json\n`);

  const allCells: VersionCellResult[] = [];
  let completed = 0;

  for (const version of opts.versions) {
    setVersion(version);
    console.log(`\n${"━".repeat(70)}`);
    console.log(`  Running ${version} experiments...`);
    console.log(`${"━".repeat(70)}\n`);

    for (const attack of opts.attacks) {
      for (const scale of opts.scales) {
        const mix = buildMix(scale);
        const cell: VersionCellResult = { version, attack, scale, seedResults: [] };

        for (let seed = 1; seed <= opts.seeds; seed++) {
          completed++;
          const progress = `[${completed}/${totalExperiments}]`;
          console.log(`\n${progress} ${version} | ${attack} | N=${scale} | seed=${seed}`);

          const config: ExperimentConfig = {
            ...DEFAULT_CONFIG,
            policy: "TRACE",
            attack,
            agents: scale,
            agentMix: mix,
            maliciousRatio: MALICIOUS_RATIO,
            rounds: ROUNDS,
            jobsPerRound: JOBS_PER_ROUND,
            seed,
          };

          const dir = await runExperiment(config);
          const metricsPath = path.join(dir, "metrics.json");
          const metrics = JSON.parse(fs.readFileSync(metricsPath, "utf-8")) as ExperimentResult;
          cell.seedResults.push({ seed, metrics, dir });
        }

        allCells.push(cell);
      }
    }
  }

  // ─── Generate Analysis ──────────────────────────────────────────────
  const reportDir = path.join(process.cwd(), "results", `version_comparison_${Date.now()}`);
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "raw_cells.json"), JSON.stringify(allCells, null, 2));

  // ─── Build Comprehensive Report ─────────────────────────────────────
  const report: string[] = [
    "# TRACE v2.1 vs v2.2 vs v2.3 — Validation Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Seeds: ${opts.seeds} | Scales: ${opts.scales.join(", ")} | Attacks: ${opts.attacks.join(", ")}`,
    `Versions: ${opts.versions.join(", ")}`,
    "",
  ];

  const masterCSV: string[] = [
    "version,attack,scale,metric,mean,std,median,q1,q3,min,max,n",
  ];

  const significanceCSV: string[] = [
    "attack,scale,comparison,metric,mannWhitney_U,z,pValue,effectSize_r,cliffsDelta,delta_interpretation,significant",
  ];

  const decisionsCSV: string[] = [
    "attack,scale,criterion,best_version,values",
  ];

  // Generate pairwise version combinations for statistical tests
  const versionPairs: [TraceVersion, TraceVersion][] = [];
  for (let i = 0; i < opts.versions.length; i++) {
    for (let j = i + 1; j < opts.versions.length; j++) {
      versionPairs.push([opts.versions[i], opts.versions[j]]);
    }
  }

  for (const attack of opts.attacks) {
    for (const scale of opts.scales) {
      // Collect all version cells for this attack/scale
      const versionData = new Map<TraceVersion, ExperimentResult[]>();
      for (const version of opts.versions) {
        const cell = allCells.find((c) => c.version === version && c.attack === attack && c.scale === scale);
        if (cell) versionData.set(version, cell.seedResults.map((r) => r.metrics));
      }
      if (versionData.size < 2) continue;

      report.push(`## ${attack} | N=${scale}`);
      report.push("");

      // ── Primary Metrics Table (all versions) ──────────────────────
      const metricDefs: Array<{
        name: string;
        extract: (r: ExperimentResult) => number;
        lowerBetter: boolean;
      }> = [
          { name: "Success Rate", extract: (r) => r.overallSuccessRate, lowerBetter: false },
          { name: "Fraud (sats)", extract: (r) => r.totalFraudExposureSats, lowerBetter: true },
          { name: "Mal. Routing", extract: (r) => r.maliciousRoutingRate, lowerBetter: true },
          { name: "Recovery (rds)", extract: (r) => r.recoveryTimeRounds, lowerBetter: true },
          { name: "Concentration", extract: (r) => r.avgRoutingConcentration, lowerBetter: true },
        ];

      // Header with all version columns
      report.push(`| Metric | ${opts.versions.join(" | ")} |`);
      report.push(`|--------${opts.versions.map(() => "|------").join("")}|`);

      for (const m of metricDefs) {
        const cells: string[] = [];
        for (const version of opts.versions) {
          const data = versionData.get(version);
          if (data) {
            const stats = descriptiveStats(data.map(m.extract));
            cells.push(stats.formatted);
            masterCSV.push(`${version},${attack},${scale},${m.name},${stats.mean},${stats.std},${stats.median},${stats.q1},${stats.q3},${stats.min},${stats.max},${stats.n}`);
          } else {
            cells.push("N/A");
          }
        }
        report.push(`| ${m.name} | ${cells.join(" | ")} |`);
      }
      report.push("");

      // ── Pairwise Statistical Tests ────────────────────────────────
      report.push("### Pairwise Statistical Tests");
      report.push("");
      report.push("| Comparison | Metric | Δ (mean) | p-value | Cliff's δ | Verdict |");
      report.push("|------------|--------|----------|---------|-----------|---------|");

      for (const [vA, vB] of versionPairs) {
        const dataA = versionData.get(vA);
        const dataB = versionData.get(vB);
        if (!dataA || !dataB) continue;

        for (const m of metricDefs) {
          const valsA = dataA.map(m.extract);
          const valsB = dataB.map(m.extract);
          const statsA = descriptiveStats(valsA);
          const statsB = descriptiveStats(valsB);
          const mwu = mannWhitneyU(valsA, valsB);
          const cliff = cliffsDelta(valsA, valsB);

          const delta = statsB.mean - statsA.mean;
          const improved = m.lowerBetter ? delta < 0 : delta > 0;
          const verdict = mwu.significant
            ? (improved ? `✅ ${vB} better` : `❌ ${vB} worse`)
            : "➖ ns";

          report.push(
            `| ${vA}→${vB} | ${m.name} | ${delta >= 0 ? "+" : ""}${delta.toFixed(2)} | ${mwu.pValue.toFixed(4)} | ${cliff.delta.toFixed(3)} (${cliff.interpretation}) | ${verdict} |`
          );

          significanceCSV.push(`${attack},${scale},${vA}_vs_${vB},${m.name},${mwu.U},${mwu.z},${mwu.pValue},${mwu.effectSize},${cliff.delta},${cliff.interpretation},${mwu.significant}`);
        }
      }
      report.push("");

      // ── Stability Analysis (all versions) ─────────────────────────
      report.push("### Stability Analysis");
      report.push("");
      report.push(`| Metric | ${opts.versions.map((v) => `${v} σ`).join(" | ")} | Best |`);
      report.push(`|--------${opts.versions.map(() => "|------").join("")}|------|`);

      const fraudStds = new Map<TraceVersion, number>();
      const routingStds = new Map<TraceVersion, number>();
      for (const version of opts.versions) {
        const data = versionData.get(version);
        if (data) {
          fraudStds.set(version, descriptiveStats(data.map((r) => r.totalFraudExposureSats)).std);
          routingStds.set(version, descriptiveStats(data.map((r) => r.maliciousRoutingRate)).std);
        }
      }

      const bestFraudStd = [...fraudStds.entries()].sort((a, b) => a[1] - b[1])[0];
      const bestRoutingStd = [...routingStds.entries()].sort((a, b) => a[1] - b[1])[0];
      report.push(`| Fraud σ | ${opts.versions.map((v) => (fraudStds.get(v) ?? 0).toFixed(2)).join(" | ")} | **${bestFraudStd?.[0] ?? "?"}** |`);
      report.push(`| Routing σ | ${opts.versions.map((v) => (routingStds.get(v) ?? 0).toFixed(4)).join(" | ")} | **${bestRoutingStd?.[0] ?? "?"}** |`);
      report.push("");

      // ── Catastrophic Outlier Analysis ─────────────────────────────
      report.push("### Catastrophic Outlier Analysis");
      report.push("");
      report.push("| Version | Catastrophic Seeds | Rate | IQR Outliers |");
      report.push("|---------|-------------------|------|-------------|");

      for (const version of opts.versions) {
        const data = versionData.get(version);
        if (!data) continue;
        const fraudVals = data.map((r) => r.totalFraudExposureSats);
        const cat = catastrophicSeedRate(fraudVals);
        const outliers = detectOutliers(fraudVals);
        report.push(`| ${version} | ${cat.count}/${opts.seeds} (${(cat.rate * 100).toFixed(0)}%) | >${cat.threshold.toFixed(0)} sats | ${outliers.outliers.length} |`);
      }
      report.push("");

      // ── Honest Routing Analysis ───────────────────────────────────
      report.push("### Honest Routing Analysis");
      report.push("");
      report.push(`| Metric | ${opts.versions.join(" | ")} |`);
      report.push(`|--------${opts.versions.map(() => "|------").join("")}|`);

      const honestMeans: string[] = [];
      const honestStds: string[] = [];
      for (const version of opts.versions) {
        const data = versionData.get(version);
        if (data) {
          const honest = data.map((r) => 1 - r.maliciousRoutingRate);
          const stats = descriptiveStats(honest);
          honestMeans.push(`${(stats.mean * 100).toFixed(1)}%`);
          honestStds.push(`${(stats.std * 100).toFixed(2)}%`);
        } else {
          honestMeans.push("N/A");
          honestStds.push("N/A");
        }
      }
      report.push(`| Honest Routing Mean | ${honestMeans.join(" | ")} |`);
      report.push(`| Honest Routing σ | ${honestStds.join(" | ")} |`);
      report.push("");

      // ── Decision CSV ──────────────────────────────────────────────
      const fraudMeans = opts.versions.map((v) => {
        const data = versionData.get(v);
        return data ? descriptiveStats(data.map((r) => r.totalFraudExposureSats)).mean : Infinity;
      });
      const bestFraudVersion = opts.versions[fraudMeans.indexOf(Math.min(...fraudMeans))];
      decisionsCSV.push(`${attack},${scale},fraud_mean,${bestFraudVersion},${fraudMeans.join("|")}`);

      const variances = opts.versions.map((v) => fraudStds.get(v) ?? Infinity);
      const bestVarVersion = opts.versions[variances.indexOf(Math.min(...variances))];
      decisionsCSV.push(`${attack},${scale},fraud_variance,${bestVarVersion},${variances.map((v) => v.toFixed(2)).join("|")}`);

      report.push("---");
      report.push("");
    }
  }

  // ─── Decision Gate — Best Version Selection ─────────────────────────
  report.push("## Decision Gate — Best Version Selection");
  report.push("");

  // Score each version across all combos using 4 criteria per combo
  const versionScores = new Map<TraceVersion, { wins: number; total: number; details: string[] }>();
  for (const v of opts.versions) versionScores.set(v, { wins: 0, total: 0, details: [] });

  for (const attack of opts.attacks) {
    for (const scale of opts.scales) {
      const versionData = new Map<TraceVersion, ExperimentResult[]>();
      for (const version of opts.versions) {
        const cell = allCells.find((c) => c.version === version && c.attack === attack && c.scale === scale);
        if (cell) versionData.set(version, cell.seedResults.map((r) => r.metrics));
      }
      if (versionData.size < 2) continue;

      // Criterion 1: lowest fraud mean
      const fraudMeans = new Map<TraceVersion, number>();
      for (const [v, data] of versionData) {
        fraudMeans.set(v, descriptiveStats(data.map((r) => r.totalFraudExposureSats)).mean);
      }
      const bestFraud = [...fraudMeans.entries()].sort((a, b) => a[1] - b[1])[0][0];
      versionScores.get(bestFraud)!.wins++;
      versionScores.get(bestFraud)!.details.push(`${attack}/N=${scale}: lowest fraud`);

      // Criterion 2: lowest fraud variance
      const fraudVars = new Map<TraceVersion, number>();
      for (const [v, data] of versionData) {
        fraudVars.set(v, descriptiveStats(data.map((r) => r.totalFraudExposureSats)).std);
      }
      const bestVar = [...fraudVars.entries()].sort((a, b) => a[1] - b[1])[0][0];
      versionScores.get(bestVar)!.wins++;
      versionScores.get(bestVar)!.details.push(`${attack}/N=${scale}: lowest variance`);

      // Criterion 3: highest honest routing
      const honestRouting = new Map<TraceVersion, number>();
      for (const [v, data] of versionData) {
        honestRouting.set(v, descriptiveStats(data.map((r) => 1 - r.maliciousRoutingRate)).mean);
      }
      const bestHonest = [...honestRouting.entries()].sort((a, b) => b[1] - a[1])[0][0];
      versionScores.get(bestHonest)!.wins++;
      versionScores.get(bestHonest)!.details.push(`${attack}/N=${scale}: best honest routing`);

      // Criterion 4: fewest catastrophic seeds
      const catSeeds = new Map<TraceVersion, number>();
      for (const [v, data] of versionData) {
        catSeeds.set(v, catastrophicSeedRate(data.map((r) => r.totalFraudExposureSats)).count);
      }
      const bestCat = [...catSeeds.entries()].sort((a, b) => a[1] - b[1])[0][0];
      versionScores.get(bestCat)!.wins++;
      versionScores.get(bestCat)!.details.push(`${attack}/N=${scale}: fewest catastrophic seeds`);

      for (const v of opts.versions) {
        versionScores.get(v)!.total += 4;
      }
    }
  }

  report.push("| Version | Wins | Total Criteria | Win Rate |");
  report.push("|---------|------|----------------|----------|");
  let bestVersion: TraceVersion = "v2.1";
  let bestWins = 0;
  for (const [v, score] of versionScores) {
    const rate = score.total > 0 ? (score.wins / score.total * 100).toFixed(0) : "0";
    report.push(`| **${v}** | ${score.wins} | ${score.total} | **${rate}%** |`);
    if (score.wins > bestWins) {
      bestWins = score.wins;
      bestVersion = v;
    }
  }
  report.push("");

  // Detail breakdown
  report.push("### Win Breakdown");
  report.push("");
  for (const [v, score] of versionScores) {
    report.push(`**${v}** (${score.wins} wins):`);
    if (score.details.length === 0) {
      report.push("  - (none)");
    } else {
      for (const d of score.details) {
        report.push(`  - ${d}`);
      }
    }
    report.push("");
  }

  report.push(`> **RECOMMENDED PAPER SYSTEM: ${bestVersion}** — Won ${bestWins}/${versionScores.get(bestVersion)!.total} criteria across all conditions.`);
  report.push("");

  // ─── Save All Outputs ──────────────────────────────────────────────
  fs.writeFileSync(path.join(reportDir, "validation_report.md"), report.join("\n"));
  fs.writeFileSync(path.join(reportDir, "master_results.csv"), masterCSV.join("\n"));
  fs.writeFileSync(path.join(reportDir, "significance.csv"), significanceCSV.join("\n"));
  fs.writeFileSync(path.join(reportDir, "decisions.csv"), decisionsCSV.join("\n"));

  // Print summary
  console.log("\n" + report.join("\n"));
  console.log(`\n  All results saved to: ${reportDir}`);
  console.log(`${"═".repeat(70)}\n`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));

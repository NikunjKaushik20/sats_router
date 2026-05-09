/**
 * TRACE — Master Results Aggregator
 * Collects all experimental results into a unified paper/results/master_results.csv
 */

import * as fs from "fs";
import * as path from "path";

const RESULTS_DIR = path.join(process.cwd(), "results");
const OUTPUT_CSV = path.join(process.cwd(), "paper", "results", "master_results.csv");
const OUTPUT_PAPER_CSV = path.join(process.cwd(), "paper", "results", "version_comparison.csv");

interface MetricsFile {
  overallSuccessRate: number;
  totalFraudExposureSats: number;
  maliciousRoutingRate: number;
  recoveryTimeRounds: number;
  avgRoutingConcentration: number;
  maxSingleRoundFraud?: number;
}

function parseExpDir(dir: string): {
  policy?: string; attack?: string; agents?: number; seed?: number;
} {
  const name = path.basename(dir);
  const m = name.match(/exp_(\w+)_([\w-]+)_(\d+)a_(\d+)s_/);
  if (!m) return {};
  return { policy: m[1], attack: m[2], agents: parseInt(m[3]), seed: parseInt(m[4]) };
}

const rows: string[] = [
  "experiment_id,policy,attack,agents,seed,success_rate,fraud_sats,mal_routing_rate,recovery_rds,concentration,max_round_fraud"
];

// Scan all experiment directories
const dirs = fs.readdirSync(RESULTS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name.startsWith("exp_"))
  .map(d => path.join(RESULTS_DIR, d.name));

for (const dir of dirs) {
  const metricsPath = path.join(dir, "metrics.json");
  if (!fs.existsSync(metricsPath)) continue;

  const meta = parseExpDir(dir);
  if (!meta.policy) continue;

  const m: MetricsFile = JSON.parse(fs.readFileSync(metricsPath, "utf-8"));
  rows.push([
    path.basename(dir),
    meta.policy,
    meta.attack,
    meta.agents,
    meta.seed,
    m.overallSuccessRate.toFixed(4),
    m.totalFraudExposureSats.toFixed(1),
    m.maliciousRoutingRate.toFixed(4),
    m.recoveryTimeRounds.toFixed(1),
    m.avgRoutingConcentration.toFixed(4),
    (m.maxSingleRoundFraud ?? 0).toFixed(1),
  ].join(","));
}

fs.writeFileSync(OUTPUT_CSV, rows.join("\n"));
console.log(`✓ Master results: ${rows.length - 1} experiments → paper/results/master_results.csv`);

// Also copy version comparison CSVs
const compDirs = fs.readdirSync(RESULTS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name.startsWith("version_comparison_"))
  .map(d => path.join(RESULTS_DIR, d.name));

const allCompRows: string[] = ["attack,scale,comparison,metric,mean_a,mean_b,delta,p_value,cliffs_delta,interpretation,significant"];

for (const compDir of compDirs) {
  const sigPath = path.join(compDir, "significance.csv");
  if (!fs.existsSync(sigPath)) continue;
  const lines = fs.readFileSync(sigPath, "utf-8").split("\n").slice(1).filter(Boolean);
  allCompRows.push(...lines);
}

fs.writeFileSync(OUTPUT_PAPER_CSV, allCompRows.join("\n"));
console.log(`✓ Version comparison: ${allCompRows.length - 1} tests → paper/results/version_comparison.csv`);

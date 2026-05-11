/**
 * Compute the v2.1 / v2.2 / v2.3 comparison statistics from the
 * actual experiment inventory (effective version deduced from
 * feature flags), for use in Table 9 and Figure 5.
 *
 * Output: results/version_comparison_<ts>/{aggregate.csv,
 *         pairwise.csv, fraud_distributions.csv}
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..", "results");

interface Run {
  effVersion: string;
  attack: string;
  agents: number;
  seed: number;
  fraud: number;
  malRouting: number;
  successRate: number;
}

function deduceVersion(t: any): string {
  if (!t) return "unknown";
  const a = t.adaptiveScaling?.enabled ?? false;
  const c = t.causalConfig?.enabled ?? false;
  const tm = t.temporalConfig?.enabled ?? false;
  const mu = t.routingUtility?.mu_cliquePenalty ?? 0;
  const decay = t.repeatedPair?.decayConstant ?? 99999;
  const minVol = t.economicVolumeWeighting?.minVolumeForFullWeight ?? 0;
  const minEnt = t.counterpartyDiversity?.minEntropyForFullTrust ?? 0;
  const isFullV21 = mu === 0.15 && decay === 3 && minVol === 20 && minEnt === 1.5;
  if (!a && !c && !tm) return isFullV21 ? "v2.1" : "v2.1-other";
  if (a && c && !tm)   return "v2.2";
  if (a && c && tm)    return "v2.3";
  return "unknown";
}

const runs: Run[] = [];
for (const name of fs.readdirSync(ROOT)) {
  if (!name.startsWith("exp_")) continue;
  const d = path.join(ROOT, name);
  if (!fs.statSync(d).isDirectory()) continue;
  let cfg: any, met: any;
  try {
    cfg = JSON.parse(fs.readFileSync(path.join(d, "config.json"), "utf-8"));
    met = JSON.parse(fs.readFileSync(path.join(d, "metrics.json"), "utf-8"));
  } catch {
    continue;
  }
  if (cfg.config?.policy !== "TRACE") continue;
  runs.push({
    effVersion: deduceVersion(cfg.traceConfig),
    attack: cfg.config.attack,
    agents: cfg.config.agents,
    seed: cfg.config.seed,
    fraud: met.totalFraudExposureSats,
    malRouting: met.maliciousRoutingRate,
    successRate: met.overallSuccessRate,
  });
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}
function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}
function cliffsDelta(a: number[], b: number[]): number {
  let gt = 0, lt = 0;
  for (const x of a) for (const y of b) {
    if (x > y) gt++; else if (x < y) lt++;
  }
  return (gt - lt) / (a.length * b.length);
}
function normalCdf(x: number): number {
  const a1=0.254829592, a2=-0.284496736, a3=1.421413741;
  const a4=-1.453152027, a5=1.061405429, p_=0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p_ * ax);
  const y = 1 - (((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t * Math.exp(-ax*ax);
  return 0.5 * (1 + sign * y);
}
function mwU(a: number[], b: number[]): { U: number; p: number } {
  const all = a.map((v) => ({ v, g: 0 })).concat(b.map((v) => ({ v, g: 1 })));
  all.sort((x, y) => x.v - y.v);
  const ranks = new Array(all.length);
  let i = 0;
  while (i < all.length) {
    let j = i;
    while (j < all.length - 1 && all[j+1].v === all[i].v) j++;
    const r = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) ranks[k] = r;
    i = j + 1;
  }
  let R1 = 0;
  for (let k = 0; k < all.length; k++) if (all[k].g === 0) R1 += ranks[k];
  const n1 = a.length, n2 = b.length;
  const U1 = R1 - n1 * (n1 + 1) / 2;
  const U2 = n1 * n2 - U1;
  const U = Math.min(U1, U2);
  const muU = (n1 * n2) / 2;
  const sU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const z = (U - muU) / sU;
  return { U, p: 2 * (1 - normalCdf(Math.abs(z))) };
}

const versions = ["v2.1", "v2.2", "v2.3"];
const attacks = ["collusion-ring", "strategic-default"];

// Filter to N=50, dedupe seeds (keep most recent)
function bucket(version: string, attack: string): Run[] {
  const filtered = runs.filter(
    (r) => r.effVersion === version && r.attack === attack && r.agents === 50
  );
  // Dedupe by seed (multiple runs with same seed -> use the one with lowest fraud
  // index in inventory; better: keep the latest by index since later runs are
  // typically the canonical ones).
  const bySeed = new Map<number, Run>();
  for (const r of filtered) {
    bySeed.set(r.seed, r); // last write wins
  }
  return Array.from(bySeed.values()).sort((a, b) => a.seed - b.seed);
}

console.log("\n=== Version comparison at N=50, 20-seed (effective version) ===\n");
console.log("attack             version   seeds   fraud_mu  fraud_sd   malRoute   honestRoute");
console.log("-----------------------------------------------------------------------------");

const aggLines = [
  "attack,version,n_seeds,fraud_mean,fraud_std,malroute_mean_pct,honest_route_mean_pct,success_mean_pct",
];
const distLines = ["attack,version,seed,fraud,mal_routing,success_rate"];

const distributions: Record<string, Record<string, number[]>> = {};

for (const att of attacks) {
  distributions[att] = {};
  for (const v of versions) {
    const rs = bucket(v, att);
    const fraud = rs.map((r) => r.fraud);
    const mal = rs.map((r) => r.malRouting * 100);
    const succ = rs.map((r) => r.successRate * 100);
    const honest = mal.map((m) => 100 - m);
    distributions[att][v] = fraud;
    const fmu = mean(fraud), fsd = stddev(fraud);
    const mmu = mean(mal), hmu = mean(honest), smu = mean(succ);
    console.log(
      `${att.padEnd(18)} ${v.padEnd(8)} ${String(rs.length).padStart(5)}  ` +
      `${fmu.toFixed(2).padStart(8)}  ${fsd.toFixed(2).padStart(8)}   ` +
      `${mmu.toFixed(2).padStart(8)}%  ${hmu.toFixed(2).padStart(8)}%`
    );
    aggLines.push(
      `${att},${v},${rs.length},${fmu.toFixed(2)},${fsd.toFixed(2)},` +
      `${mmu.toFixed(2)},${hmu.toFixed(2)},${smu.toFixed(2)}`
    );
    for (const r of rs) {
      distLines.push(
        `${att},${v},${r.seed},${r.fraud},${r.malRouting.toFixed(4)},${r.successRate.toFixed(4)}`
      );
    }
  }
  console.log();
}

// Pairwise tests
const pairLines = [
  "attack,comparison,U,p_value,cliffs_delta,mean_diff,n1,n2",
];
console.log("\n=== Pairwise Mann-Whitney comparisons ===");
for (const att of attacks) {
  console.log(`\n--- ${att} ---`);
  const pairs: [string, string][] = [
    ["v2.1", "v2.2"],
    ["v2.1", "v2.3"],
    ["v2.2", "v2.3"],
  ];
  for (const [a, b] of pairs) {
    const A = distributions[att][a];
    const B = distributions[att][b];
    if (!A.length || !B.length) continue;
    const { U, p } = mwU(A, B);
    const d = cliffsDelta(A, B);
    const md = mean(A) - mean(B);
    console.log(
      `  ${a} vs ${b}:  U=${U.toFixed(1).padStart(6)}  p=${p.toFixed(4)}  ` +
      `|delta|=${Math.abs(d).toFixed(3)}  mean_diff=${md.toFixed(2)}  (n1=${A.length}, n2=${B.length})`
    );
    pairLines.push(`${att},${a}-vs-${b},${U},${p.toFixed(4)},${d.toFixed(3)},${md.toFixed(2)},${A.length},${B.length}`);
  }
}

const tsId = Date.now();
const outDir = path.join(ROOT, `version_comparison_${tsId}`);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "aggregate.csv"), aggLines.join("\n"));
fs.writeFileSync(path.join(outDir, "pairwise.csv"), pairLines.join("\n"));
fs.writeFileSync(path.join(outDir, "fraud_distributions.csv"), distLines.join("\n"));
console.log(`\nOutput: ${outDir}`);

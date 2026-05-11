/**
 * Scan results/ for all TRACE experiment runs and tally them by
 * the *effective* version (deduced from feature flags), not the
 * "version" string in config.  This is necessary because the
 * version label in config.json defaults to whatever is hard-coded
 * in src/lib/trace/config.ts and does NOT track the actual flags.
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..", "results");

interface Row {
  effVersion: string;        // v2.1, v2.2, v2.3, or 'mixed'
  labelVersion: string;
  attack: string;
  agents: number;
  policy: string;
  seed: number;
  fraud: number;
  malRouting: number;
  successRate: number;
  flags: { adaptive: boolean; causal: boolean; temporal: boolean };
  feats: { mu: number; decay: number; minVol: number; minEnt: number };
  dir: string;
}

function* walkExperimentDirs(): Generator<string> {
  for (const name of fs.readdirSync(ROOT)) {
    if (!name.startsWith("exp_")) continue;
    const full = path.join(ROOT, name);
    if (!fs.statSync(full).isDirectory()) continue;
    yield full;
  }
}

function readJsonSafe(p: string): any | null {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

// Effective version from flags + feature values
function deduceVersion(t: any): string {
  if (!t) return "unknown";
  const a = t.adaptiveScaling?.enabled ?? false;
  const c = t.causalConfig?.enabled ?? false;
  const tm = t.temporalConfig?.enabled ?? false;
  const mu = t.routingUtility?.mu_cliquePenalty ?? 0;
  const decay = t.repeatedPair?.decayConstant ?? 99999;
  const minVol = t.economicVolumeWeighting?.minVolumeForFullWeight ?? 0;
  const minEnt = t.counterpartyDiversity?.minEntropyForFullTrust ?? 0;

  // v2.1 baseline assumes mu=0.15, decay=3, minVol=20, minEnt=1.5
  const isFullV21Features = mu === 0.15 && decay === 3 && minVol === 20 && minEnt === 1.5;
  const someV21Off = mu === 0 || decay > 100 || minVol <= 0.01 || minEnt <= 0.01;

  if (!a && !c && !tm) {
    if (isFullV21Features) return "v2.1";
    if (someV21Off)        return "v2.1-ablated";
    return "v2.1-other";
  }
  if (a && c && !tm)  return "v2.2";
  if (a && c && tm)   return "v2.3";
  if (a || c || tm)   return "v2.x-partial";
  return "unknown";
}

const rows: Row[] = [];

for (const dir of walkExperimentDirs()) {
  const cfg = readJsonSafe(path.join(dir, "config.json"));
  const met = readJsonSafe(path.join(dir, "metrics.json"));
  if (!cfg || !met) continue;
  const t = cfg.traceConfig;
  rows.push({
    effVersion:   deduceVersion(t),
    labelVersion: t?.version ?? "?",
    attack:       cfg.config?.attack ?? "?",
    agents:       cfg.config?.agents ?? 0,
    policy:       cfg.config?.policy ?? "?",
    seed:         cfg.config?.seed ?? 0,
    fraud:        met.totalFraudExposureSats ?? NaN,
    malRouting:   met.maliciousRoutingRate ?? NaN,
    successRate:  met.overallSuccessRate ?? NaN,
    flags: {
      adaptive: t?.adaptiveScaling?.enabled ?? false,
      causal:   t?.causalConfig?.enabled ?? false,
      temporal: t?.temporalConfig?.enabled ?? false,
    },
    feats: {
      mu:     t?.routingUtility?.mu_cliquePenalty ?? 0,
      decay:  t?.repeatedPair?.decayConstant ?? 0,
      minVol: t?.economicVolumeWeighting?.minVolumeForFullWeight ?? 0,
      minEnt: t?.counterpartyDiversity?.minEntropyForFullTrust ?? 0,
    },
    dir,
  });
}

// Tally by (effVersion, attack, agents)
const buckets = new Map<string, Set<number>>();
for (const r of rows) {
  if (r.policy !== "TRACE") continue;
  const k = `${r.effVersion}|${r.attack}|${r.agents}`;
  if (!buckets.has(k)) buckets.set(k, new Set());
  buckets.get(k)!.add(r.seed);
}

console.log(`\nTotal TRACE experiments scanned: ${rows.filter(r => r.policy === "TRACE").length}\n`);

const keys = Array.from(buckets.keys()).sort();
console.log("eff_version       attack             N      seeds   first8");
console.log("---------------------------------------------------------------------");
for (const k of keys) {
  const [v, a, n] = k.split("|");
  const seeds = Array.from(buckets.get(k)!).sort((x, y) => x - y);
  const first = seeds.slice(0, 8).join(",");
  console.log(`${v.padEnd(18)} ${a.padEnd(18)} ${n.padStart(4)}  ${String(seeds.length).padStart(5)}   ${first}${seeds.length > 8 ? "..." : ""}`);
}

// What we have at >=20 seeds
console.log("\n\n=== >=20 seed coverage ===");
for (const k of keys) {
  const [v, a, n] = k.split("|");
  const seeds = buckets.get(k)!;
  if (seeds.size >= 20) {
    console.log(`  ${v.padEnd(18)} ${a.padEnd(18)} N=${n}   ${seeds.size} seeds`);
  }
}

// Save inventory
const csvLines = [
  "eff_version,label_version,attack,agents,policy,seed,fraud,mal_routing,success_rate,adaptive,causal,temporal,mu,decay,minVol,minEnt,dir",
];
for (const r of rows) {
  csvLines.push(
    `${r.effVersion},${r.labelVersion},${r.attack},${r.agents},${r.policy},${r.seed},` +
      `${r.fraud},${r.malRouting.toFixed(4)},${r.successRate.toFixed(4)},` +
      `${r.flags.adaptive},${r.flags.causal},${r.flags.temporal},` +
      `${r.feats.mu},${r.feats.decay},${r.feats.minVol},${r.feats.minEnt},${r.dir}`
  );
}
fs.writeFileSync(path.join(ROOT, "_inventory.csv"), csvLines.join("\n"));
console.log(`\nInventory: ${path.join(ROOT, "_inventory.csv")}\n`);

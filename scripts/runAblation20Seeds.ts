/**
 * TRACE v2.1 -- Multi-seed ablation aggregator.
 *
 * Runs the per-seed ablation logic from runAblation.ts across 20 seeds,
 * then aggregates fraud exposure mean / std / Cliff's delta vs. the
 * full-v2.1 baseline for each removed mechanism.
 *
 * Output:
 *   results/ablation_20seeds_<ts>/per_seed_results.csv
 *   results/ablation_20seeds_<ts>/ablation_aggregate.csv
 *   results/ablation_20seeds_<ts>/ablation_aggregate.json
 *
 * Usage:
 *   npx tsx scripts/runAblation20Seeds.ts
 *   npx tsx scripts/runAblation20Seeds.ts --seeds 1,2,3,4,5
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
import * as traceConfig from "../src/lib/trace/config";

dotenv.config();

const ORIGINAL_MU       = (traceConfig.ROUTING_UTILITY as any).mu_cliquePenalty;
const ORIGINAL_DECAY    = (traceConfig.REPEATED_PAIR as any).decayConstant;
const ORIGINAL_MIN_VOL  = (traceConfig.ECONOMIC_VOLUME_WEIGHTING as any).minVolumeForFullWeight;
const ORIGINAL_MIN_ENT  = (traceConfig.COUNTERPARTY_DIVERSITY as any).minEntropyForFullTrust;

interface AblationVariant {
  name: string;
  description: string;
  configPatch: () => void;
  configRestore: () => void;
}

const ablations: AblationVariant[] = [
  {
    name: "full-v2.1",
    description: "Full TRACE v2.1 (all features enabled)",
    configPatch: () => {},
    configRestore: () => {},
  },
  {
    name: "no-clique-penalty",
    description: "Remove mu*cliquePenalty from utility",
    configPatch: () => {
      (traceConfig.ROUTING_UTILITY as any).mu_cliquePenalty = 0;
    },
    configRestore: () => {
      (traceConfig.ROUTING_UTILITY as any).mu_cliquePenalty = ORIGINAL_MU;
    },
  },
  {
    name: "no-repeated-decay",
    description: "Remove repeated-pair exponential decay",
    configPatch: () => {
      (traceConfig.REPEATED_PAIR as any).decayConstant = 99999;
    },
    configRestore: () => {
      (traceConfig.REPEATED_PAIR as any).decayConstant = ORIGINAL_DECAY;
    },
  },
  {
    name: "no-volume-weight",
    description: "Remove economic volume weighting",
    configPatch: () => {
      (traceConfig.ECONOMIC_VOLUME_WEIGHTING as any).minVolumeForFullWeight = 0.01;
    },
    configRestore: () => {
      (traceConfig.ECONOMIC_VOLUME_WEIGHTING as any).minVolumeForFullWeight = ORIGINAL_MIN_VOL;
    },
  },
  {
    name: "no-entropy-scoring",
    description: "Remove all entropy-based scoring",
    configPatch: () => {
      (traceConfig.ROUTING_UTILITY as any).mu_cliquePenalty = 0;
      (traceConfig.COUNTERPARTY_DIVERSITY as any).minEntropyForFullTrust = 0.001;
    },
    configRestore: () => {
      (traceConfig.ROUTING_UTILITY as any).mu_cliquePenalty = ORIGINAL_MU;
      (traceConfig.COUNTERPARTY_DIVERSITY as any).minEntropyForFullTrust = ORIGINAL_MIN_ENT;
    },
  },
  {
    name: "v2-equivalent",
    description: "Remove ALL v2.1 features",
    configPatch: () => {
      (traceConfig.ROUTING_UTILITY as any).mu_cliquePenalty = 0;
      (traceConfig.COUNTERPARTY_DIVERSITY as any).minEntropyForFullTrust = 0.001;
      (traceConfig.REPEATED_PAIR as any).decayConstant = 99999;
      (traceConfig.ECONOMIC_VOLUME_WEIGHTING as any).minVolumeForFullWeight = 0.01;
    },
    configRestore: () => {
      (traceConfig.ROUTING_UTILITY as any).mu_cliquePenalty = ORIGINAL_MU;
      (traceConfig.COUNTERPARTY_DIVERSITY as any).minEntropyForFullTrust = ORIGINAL_MIN_ENT;
      (traceConfig.REPEATED_PAIR as any).decayConstant = ORIGINAL_DECAY;
      (traceConfig.ECONOMIC_VOLUME_WEIGHTING as any).minVolumeForFullWeight = ORIGINAL_MIN_VOL;
    },
  },
];

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

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string, def: string): string => {
    const idx = args.indexOf(`--${flag}`);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : def;
  };
  const seedsArg = get("seeds", "");
  const seeds = seedsArg
    ? seedsArg.split(",").map((s) => parseInt(s.trim()))
    : Array.from({ length: 20 }, (_, i) => i + 1);
  return {
    seeds,
    agents: parseInt(get("agents", "50")),
    rounds: parseInt(get("rounds", "60")),
    jobs: parseInt(get("jobs", "5")),
    malicious: parseFloat(get("malicious", "0.3")),
  };
}

function mean(xs: number[]): number {
  if (!xs.length) return NaN;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

function cliffsDelta(a: number[], b: number[]): number {
  let gt = 0, lt = 0;
  for (const x of a) for (const y of b) {
    if (x > y) gt += 1;
    else if (x < y) lt += 1;
  }
  return (gt - lt) / (a.length * b.length);
}

function mannWhitneyU(a: number[], b: number[]): { U: number; p: number } {
  const all = a.map((v) => ({ v, g: 0 })).concat(b.map((v) => ({ v, g: 1 })));
  all.sort((x, y) => x.v - y.v);
  const ranks: number[] = new Array(all.length);
  let i = 0;
  while (i < all.length) {
    let j = i;
    while (j < all.length - 1 && all[j + 1].v === all[i].v) j += 1;
    const avg = (i + j + 2) / 2;
    for (let k = i; k <= j; k += 1) ranks[k] = avg;
    i = j + 1;
  }
  let R1 = 0;
  for (let k = 0; k < all.length; k += 1) {
    if (all[k].g === 0) R1 += ranks[k];
  }
  const n1 = a.length, n2 = b.length;
  const U1 = R1 - (n1 * (n1 + 1)) / 2;
  const U2 = n1 * n2 - U1;
  const U = Math.min(U1, U2);
  const muU = (n1 * n2) / 2;
  const sigmaU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const z = (U - muU) / sigmaU;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  return { U, p };
}

function normalCdf(x: number): number {
  const a1 =  0.254829592, a2 = -0.284496736, a3 =  1.421413741;
  const a4 = -1.453152027, a5 =  1.061405429, p_  = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p_ * ax);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1.0 + sign * y);
}

interface PerSeedRow {
  seed: number;
  variant: string;
  successRate: number;
  fraudExposure: number;
  maliciousRouting: number;
}

async function main() {
  const opts = parseArgs();
  const mix = buildMix(opts.agents);
  const tsId = Date.now();
  const reportDir = path.join(process.cwd(), "results", `ablation_20seeds_${tsId}`);
  fs.mkdirSync(reportDir, { recursive: true });

  console.log(`\nRunning multi-seed ablation`);
  console.log(`  seeds = [${opts.seeds.join(", ")}]`);
  console.log(`  agents = ${opts.agents}, malicious = ${opts.malicious * 100}%`);
  console.log(`  variants = ${ablations.length}`);
  console.log(`  output dir: ${reportDir}\n`);

  const rows: PerSeedRow[] = [];
  let runIdx = 0;
  const totalRuns = opts.seeds.length * ablations.length;

  for (const seed of opts.seeds) {
    for (const ablation of ablations) {
      runIdx += 1;
      console.log(`[${runIdx}/${totalRuns}] seed=${seed} variant=${ablation.name}`);
      ablation.configPatch();
      try {
        const config: ExperimentConfig = {
          ...DEFAULT_CONFIG,
          policy: "TRACE",
          attack: "collusion-ring",
          agents: opts.agents,
          agentMix: mix,
          maliciousRatio: opts.malicious,
          rounds: opts.rounds,
          jobsPerRound: opts.jobs,
          seed,
        };
        const dir = await runExperiment(config);
        const metrics = JSON.parse(
          fs.readFileSync(path.join(dir, "metrics.json"), "utf-8")
        );
        rows.push({
          seed,
          variant: ablation.name,
          successRate: metrics.overallSuccessRate,
          fraudExposure: metrics.totalFraudExposureSats,
          maliciousRouting: metrics.maliciousRoutingRate,
        });
      } finally {
        ablation.configRestore();
      }
    }
  }

  // Per-seed CSV
  const perSeedCsv = [
    "seed,variant,success_rate,fraud_exposure_sats,malicious_routing",
    ...rows.map((r) =>
      `${r.seed},${r.variant},${r.successRate.toFixed(4)},${r.fraudExposure},${r.maliciousRouting.toFixed(4)}`
    ),
  ].join("\n");
  fs.writeFileSync(path.join(reportDir, "per_seed_results.csv"), perSeedCsv);

  // Aggregate
  const variantNames = ablations.map((a) => a.name);
  const baselineFrauds = rows.filter((r) => r.variant === "full-v2.1").map((r) => r.fraudExposure);
  const aggregate = variantNames.map((v) => {
    const variantRows = rows.filter((r) => r.variant === v);
    const fraud = variantRows.map((r) => r.fraudExposure);
    const mal = variantRows.map((r) => r.maliciousRouting);
    const succ = variantRows.map((r) => r.successRate);
    const fraudMean = mean(fraud);
    const fraudStd = stddev(fraud);
    let cd = 0, p = 1.0, pctChange = 0;
    if (v !== "full-v2.1" && baselineFrauds.length) {
      cd = cliffsDelta(fraud, baselineFrauds);
      p = mannWhitneyU(fraud, baselineFrauds).p;
      const baseMean = mean(baselineFrauds);
      pctChange = baseMean > 0 ? ((fraudMean - baseMean) / baseMean) * 100 : 0;
    }
    return {
      variant: v,
      n_seeds: fraud.length,
      fraud_mean: fraudMean,
      fraud_std: fraudStd,
      mal_routing_mean: mean(mal) * 100,
      success_mean: mean(succ) * 100,
      pct_change_vs_baseline: pctChange,
      cliffs_delta_vs_baseline: cd,
      mann_whitney_p: p,
    };
  });

  const aggCsv = [
    "variant,n_seeds,fraud_mean_sats,fraud_std_sats,mal_routing_pct,success_pct,pct_change_vs_baseline,cliffs_delta_vs_baseline,mann_whitney_p",
    ...aggregate.map((a) =>
      `${a.variant},${a.n_seeds},${a.fraud_mean.toFixed(2)},${a.fraud_std.toFixed(2)},${a.mal_routing_mean.toFixed(2)},${a.success_mean.toFixed(2)},${a.pct_change_vs_baseline.toFixed(2)},${a.cliffs_delta_vs_baseline.toFixed(3)},${a.mann_whitney_p.toFixed(4)}`
    ),
  ].join("\n");
  fs.writeFileSync(path.join(reportDir, "ablation_aggregate.csv"), aggCsv);
  fs.writeFileSync(path.join(reportDir, "ablation_aggregate.json"), JSON.stringify(aggregate, null, 2));

  console.log(`\n=== AGGREGATE (${opts.seeds.length} seeds, N=${opts.agents}, collusion ring) ===`);
  console.log("variant                    fraud mu+/-sigma     %change   |delta|   p");
  console.log("---------------------------------------------------------------------------");
  for (const a of aggregate) {
    const tag = a.variant === "full-v2.1" ? "baseline" : "";
    console.log(
      `${a.variant.padEnd(25)} ${a.fraud_mean.toFixed(2).padStart(7)}+/-${a.fraud_std.toFixed(2).padStart(6)}` +
      `   ${a.pct_change_vs_baseline >= 0 ? "+" : ""}${a.pct_change_vs_baseline.toFixed(1).padStart(6)}%   ` +
      `${Math.abs(a.cliffs_delta_vs_baseline).toFixed(3)}    ${a.mann_whitney_p.toFixed(4)} ${tag}`
    );
  }
  console.log(`\nResults saved to: ${reportDir}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));

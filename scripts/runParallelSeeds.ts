/**
 * Run multiple experiment seeds in parallel (Final_implementation.md Change 1).
 * Each seed uses a copy of an empty-schema SQLite DB via TRACE_DB_PATH (see src/lib/db.ts).
 *
 * Large-N example (~50 seeds × N=500):
 *   npx tsx scripts/runParallelSeeds.ts --agents 500 --rounds 60 --jobs 5 --malicious 0.3 \\
 *     --seeds 1-50 --attack collusion-ring --policy TRACE
 *
 * Combined + adaptive adversary:
 *   npx tsx scripts/runParallelSeeds.ts --attack combined-collusion-whitewash --adaptive ...
 *
 * Prepares results/.parallel_scratch/_schema_base.db once via `prisma db push` if missing.
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import { spawn } from "child_process";
import { DEFAULT_CONFIG, type ExperimentConfig, computeDetailedStats } from "../src/lib/trace/experiments";

const SCRATCH_DIR = path.join(process.cwd(), "results", ".parallel_scratch");
const BASE_DB = path.join(SCRATCH_DIR, "_schema_base.db");

/** Prisma SQLite URL — relative `file:./...` avoids Windows absolute URL issues. */
function prismaSqliteUrl(absDbPath: string): string {
  const rel = path.relative(process.cwd(), absDbPath).split(path.sep).join("/");
  return `file:./${rel}`;
}

function ensureBaseDb(): void {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  if (fs.existsSync(BASE_DB)) return;
  const url = prismaSqliteUrl(BASE_DB);
  execSync("npx prisma db push", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
}

/** Supports: "1,2,3", "1-8", "1,5-8,12", or empty → 1..50 */
function parseSeedsArg(raw: string | undefined): number[] {
  if (!raw || raw.trim() === "") {
    return Array.from({ length: 50 }, (_, i) => i + 1);
  }
  const out = new Set<number>();
  for (const part of raw.split(/[, ]+/)) {
    const p = part.trim();
    if (!p) continue;
    if (p.includes("-")) {
      const [a, b] = p.split("-").map((s) => parseInt(s.trim(), 10));
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        for (let s = lo; s <= hi; s++) out.add(s);
      }
    } else {
      const n = parseInt(p, 10);
      if (!Number.isNaN(n)) out.add(n);
    }
  }
  return [...out].sort((x, y) => x - y);
}

interface CliOpts {
  seeds: number[];
  concurrency: number;
  policy: string;
  attack: string;
  agents: number;
  rounds: number;
  jobsPerRound: number;
  maliciousRatio: number;
  interactionHistoryWindowRounds: number | undefined;
  adaptive: boolean;
  report: boolean;
}

function parseArgs(): CliOpts {
  const argv = process.argv.slice(2);
  let seedsStr: string | undefined;
  let concurrency = Math.max(1, os.cpus().length - 1);
  let policy = "TRACE";
  let attack = "strategic-default";
  let agents = DEFAULT_CONFIG.agents;
  let rounds = DEFAULT_CONFIG.rounds;
  let jobsPerRound = DEFAULT_CONFIG.jobsPerRound;
  let maliciousRatio = DEFAULT_CONFIG.maliciousRatio;
  let windowRounds: number | undefined;
  let adaptive = false;
  let report = true;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--seeds" && argv[i + 1]) {
      seedsStr = argv[++i];
    } else if (a === "--concurrency" && argv[i + 1]) {
      concurrency = Math.max(1, parseInt(argv[++i], 10));
    } else if (a === "--policy" && argv[i + 1]) {
      policy = argv[++i];
    } else if (a === "--attack" && argv[i + 1]) {
      attack = argv[++i];
    } else if (a === "--agents" && argv[i + 1]) {
      agents = Math.max(2, parseInt(argv[++i], 10));
    } else if (a === "--rounds" && argv[i + 1]) {
      rounds = Math.max(1, parseInt(argv[++i], 10));
    } else if (a === "--jobs" && argv[i + 1]) {
      jobsPerRound = Math.max(1, parseInt(argv[++i], 10));
    } else if (a === "--malicious" && argv[i + 1]) {
      maliciousRatio = Math.min(0.95, Math.max(0, parseFloat(argv[++i])));
    } else if (a === "--window-rounds" && argv[i + 1]) {
      windowRounds = Math.max(10, parseInt(argv[++i], 10));
    } else if (a === "--adaptive") {
      adaptive = true;
    } else if (a === "--no-report") {
      report = false;
    }
  }

  return {
    seeds: parseSeedsArg(seedsStr),
    concurrency,
    policy,
    attack,
    agents,
    rounds,
    jobsPerRound,
    maliciousRatio,
    interactionHistoryWindowRounds: windowRounds,
    adaptive,
    report,
  };
}

function runOneWorker(absDb: string, seed: number, config: ExperimentConfig, runId: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "npx",
      ["tsx", "scripts/runParallelSeeds.worker.ts"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          TRACE_DB_PATH: absDb,
          TRACE_WORKER_SEED: String(seed),
          TRACE_WORKER_CONFIG: JSON.stringify(config),
          TRACE_PARALLEL_RUN_ID: runId,
        },
        stdio: "inherit",
        shell: true,
      }
    );
    proc.on("error", reject);
    proc.on("close", (code) => resolve(code ?? 1));
  });
}

interface MetricsJson {
  totalFraudExposureSats: number;
  maliciousRoutingRate: number;
  overallSuccessRate: number;
}

function writeParallelAggregateReport(runId: string): void {
  const markerDir = path.join(process.cwd(), "results", ".parallel");
  if (!fs.existsSync(markerDir)) return;

  const files = fs
    .readdirSync(markerDir)
    .filter((f) => f.startsWith(`${runId}_seed_`) && f.endsWith(".json") && !f.includes("_aggregate"));
  const fraud: number[] = [];
  const maliciousRates: number[] = [];
  const successRates: number[] = [];

  for (const f of files) {
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(markerDir, f), "utf-8")) as {
        seed: number;
        resultsDir: string;
        ok?: boolean;
      };
      const mPath = path.join(meta.resultsDir, "metrics.json");
      if (!fs.existsSync(mPath)) continue;
      const m = JSON.parse(fs.readFileSync(mPath, "utf-8")) as MetricsJson;
      fraud.push(m.totalFraudExposureSats);
      maliciousRates.push(m.maliciousRoutingRate);
      successRates.push(m.overallSuccessRate);
    } catch {
      // skip bad marker
    }
  }

  if (fraud.length === 0) {
    console.warn("No metrics found for aggregate report (markers missing or incomplete).");
    return;
  }

  const out = {
    runId,
    nSeeds: fraud.length,
    fraudExposureSats: computeDetailedStats(fraud),
    maliciousRoutingRate: computeDetailedStats(maliciousRates),
    overallSuccessRate: computeDetailedStats(successRates),
  };

  const outPath = path.join(markerDir, `${runId}_aggregate.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\nWrote multi-seed tail-risk / descriptive stats → ${outPath}`);
}

async function main() {
  const opts = parseArgs();
  ensureBaseDb();

  const runId = `parallel_${Date.now()}`;
  const attackParams: Record<string, number | string | boolean> = {
    jobsPerRound: opts.jobsPerRound,
  };
  if (opts.adaptive && (opts.attack === "combined-collusion-whitewash" || opts.attack === "collusion-ring")) {
    attackParams.adaptive = true;
  }

  const baseTemplate: ExperimentConfig = {
    ...DEFAULT_CONFIG,
    policy: opts.policy.toUpperCase() as ExperimentConfig["policy"],
    attack: opts.attack as ExperimentConfig["attack"],
    rounds: opts.rounds,
    agents: opts.agents,
    maliciousRatio: opts.maliciousRatio,
    jobsPerRound: opts.jobsPerRound,
    attackParams: { ...DEFAULT_CONFIG.attackParams, ...attackParams },
  };
  if (opts.interactionHistoryWindowRounds !== undefined) {
    baseTemplate.interactionHistoryWindowRounds = opts.interactionHistoryWindowRounds;
  }

  console.log(`Parallel seeds: ${opts.seeds.length} seeds, concurrency=${opts.concurrency}, runId=${runId}`);
  console.log(
    `  N=${opts.agents}, rounds=${opts.rounds}, jobs/round=${opts.jobsPerRound}, malicious=${opts.maliciousRatio}, attack=${opts.attack}, policy=${opts.policy}`
  );
  if (opts.interactionHistoryWindowRounds) {
    console.log(`  interactionHistoryWindowRounds=${opts.interactionHistoryWindowRounds}`);
  }
  if (opts.adaptive) console.log(`  adaptive endorsement: on (for combined attack)`);

  let idx = 0;
  async function worker(): Promise<void> {
    while (idx < opts.seeds.length) {
      const my = idx++;
      const seed = opts.seeds[my];
      const dbFile = path.join(SCRATCH_DIR, `${runId}_seed_${seed}.db`);
      fs.copyFileSync(BASE_DB, dbFile);
      const code = await runOneWorker(dbFile, seed, baseTemplate, runId);
      if (code !== 0) {
        throw new Error(`Seed ${seed} exited with code ${code}`);
      }
      console.log(`Done seed ${seed} (${my + 1}/${opts.seeds.length})`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(opts.concurrency, opts.seeds.length) }, () => worker()));
  console.log("All parallel seeds finished. Markers under results/.parallel/");

  if (opts.report) {
    writeParallelAggregateReport(runId);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Worker process: one seed, isolated TRACE_DB_PATH SQLite file.
 * Spawned by scripts/runParallelSeeds.ts (do not run directly unless env is set).
 */

import "dotenv/config";
import fs from "fs";
import path from "path";

const dbPathRaw = process.env.TRACE_DB_PATH;
const seedRaw = process.env.TRACE_WORKER_SEED;
const configJson = process.env.TRACE_WORKER_CONFIG;
const runId = process.env.TRACE_PARALLEL_RUN_ID ?? "parallel";

if (!dbPathRaw || seedRaw === undefined || !configJson) {
  console.error("Expected TRACE_DB_PATH, TRACE_WORKER_SEED, TRACE_WORKER_CONFIG");
  process.exit(1);
}

const seed = Number(seedRaw);
process.env.TRACE_DB_PATH = path.isAbsolute(dbPathRaw)
  ? dbPathRaw
  : path.join(process.cwd(), dbPathRaw);

async function main() {
  const cfgJson = configJson as string;
  const mod = await import("../src/lib/trace/experiments");
  type ExpCfg = Parameters<typeof mod.runExperiment>[0];
  const config = JSON.parse(cfgJson) as ExpCfg;
  const resultsDir = await mod.runExperiment({ ...config, seed });
  const markerDir = path.join(process.cwd(), "results", ".parallel");
  fs.mkdirSync(markerDir, { recursive: true });
  fs.writeFileSync(
    path.join(markerDir, `${runId}_seed_${seed}.json`),
    JSON.stringify({ seed, resultsDir, ok: true }, null, 2)
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

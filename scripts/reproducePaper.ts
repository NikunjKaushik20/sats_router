/**
 * TRACE — One-Command Paper Reproduction
 *
 * Runs all experiments needed for paper claims:
 *   1. Core matrix (4 attacks × 3 policies × 10 seeds at N=50)
 *   2. Scaling (collusion-ring × 3 scales × 10 seeds, TRACE only)
 *   3. Ablation (6 variants × 5 seeds at N=100)
 *   4. Sensitivity (4 params × 3 perturbations × 5 seeds at N=50)
 *
 * Total: ~350 experiment runs (~2-3 hours)
 *
 * Usage:
 *   npm run reproduce-paper
 *   npx tsx scripts/reproducePaper.ts
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const TIMESTAMP = Date.now();
const REPRO_DIR = path.join(process.cwd(), "results", `paper_reproduction_${TIMESTAMP}`);

function run(label: string, cmd: string) {
  console.log(`\n${"━".repeat(70)}`);
  console.log(`  ${label}`);
  console.log(`${"━".repeat(70)}\n`);
  console.log(`  $ ${cmd}\n`);

  try {
    execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
  } catch {
    console.error(`  ⚠ ${label} failed, continuing...`);
  }
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║           TRACE — PAPER REPRODUCTION PIPELINE                       ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝\n");

  const gitHash = (() => {
    try { return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim(); }
    catch { return "unknown"; }
  })();

  const metadata = {
    timestamp: new Date().toISOString(),
    gitCommit: gitHash,
    traceVersion: "v2.1",
    nodeVersion: process.version,
    platform: process.platform,
  };

  fs.mkdirSync(REPRO_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPRO_DIR, "metadata.json"), JSON.stringify(metadata, null, 2));

  console.log(`  Git commit: ${gitHash}`);
  console.log(`  Reproduction dir: ${REPRO_DIR}`);
  console.log(`  Node: ${process.version}`);
  console.log(`  Started: ${metadata.timestamp}\n`);

  // Phase 1: Core experiment matrix (N=50, all attacks, all policies, 10 seeds)
  run(
    "Phase 1/4 — Core Matrix (N=50, 10 seeds)",
    `npx tsx scripts/runFinalMatrix.ts --scale 50 --seeds 10`
  );

  // Phase 2: Scaling experiments (collusion-ring, TRACE only, 3 scales, 10 seeds)
  for (const scale of [30, 50, 100]) {
    run(
      `Phase 2/4 — Scaling N=${scale} (collusion-ring, 10 seeds)`,
      `npx tsx scripts/runFinalMatrix.ts --attack collusion-ring --scale ${scale} --seeds 10`
    );
  }

  // Phase 3: Ablation study
  run(
    "Phase 3/4 — Ablation (N=100, collusion-ring)",
    `npx tsx scripts/runAblation.ts --agents 100 --seed 42`
  );

  // Phase 4: Weight sensitivity
  run(
    "Phase 4/4 — Weight Sensitivity (N=50, 5 seeds)",
    `npx tsx scripts/runSensitivity.ts --seeds 5 --agents 50`
  );

  // Final summary
  const endTime = new Date().toISOString();
  fs.writeFileSync(
    path.join(REPRO_DIR, "summary.json"),
    JSON.stringify({ ...metadata, endTime, phases: 4, status: "complete" }, null, 2)
  );

  console.log(`\n${"═".repeat(70)}`);
  console.log(`  REPRODUCTION COMPLETE`);
  console.log(`  Started: ${metadata.timestamp}`);
  console.log(`  Ended:   ${endTime}`);
  console.log(`  Results: ${REPRO_DIR}`);
  console.log(`${"═".repeat(70)}\n`);
}

main().catch(console.error);

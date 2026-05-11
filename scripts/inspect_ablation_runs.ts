import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..", "results");
const dirs = fs
  .readdirSync(ROOT)
  .filter((n) => n.startsWith("exp_TRACE_collusion-ring_50a_1s_177834"))
  .sort();

console.log(`Found ${dirs.length} seed-1 N=50 collusion-ring runs from this batch.\n`);

console.log(
  "timestamp                   version  adapt  causal  temp   mu    decay  minE  minVol  fraud  malRoute"
);
for (const d of dirs) {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, d, "config.json"), "utf-8"));
  const met = JSON.parse(fs.readFileSync(path.join(ROOT, d, "metrics.json"), "utf-8"));
  const t = cfg.traceConfig;
  const tag =
    `${d.split("_").pop()}  ${(t.version ?? "?").padEnd(7)}` +
    `  ${String(t.adaptiveScaling.enabled).padEnd(5)}` +
    `  ${String(t.causalConfig.enabled).padEnd(6)}` +
    `  ${String(t.temporalConfig.enabled).padEnd(5)}` +
    `  ${String(t.routingUtility.mu_cliquePenalty).padEnd(4)}` +
    `  ${String(t.repeatedPair.decayConstant).padEnd(5)}` +
    `  ${String(t.counterpartyDiversity.minEntropyForFullTrust).padEnd(4)}` +
    `  ${String(t.economicVolumeWeighting.minVolumeForFullWeight).padEnd(5)}` +
    `  ${String(met.totalFraudExposureSats).padEnd(5)}` +
    `  ${(met.maliciousRoutingRate * 100).toFixed(1)}%`;
  console.log(tag);
}

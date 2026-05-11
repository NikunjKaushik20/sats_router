/**
 * Attack Registry — Factory for all attack types.
 */

export { Attack, type AttackConfig, type AttackAgent, type AttackDecision, type AttackDecisionContext, type AttackPostRoundResult } from "./base";
export { StrategicDefaultAttack } from "./strategicDefault";
export { WhitewashingAttack } from "./whitewashing";
export { SybilClusterAttack } from "./sybilCluster";
export { CollusionRingAttack } from "./collusionRing";
export { CombinedCollusionWhitewashAttack } from "./combinedCollusionWhitewash";
export { AdaptiveCollusionAdversary } from "./adaptiveAdversary";

import type { AttackConfig } from "./base";
import { StrategicDefaultAttack } from "./strategicDefault";
import { WhitewashingAttack } from "./whitewashing";
import { SybilClusterAttack } from "./sybilCluster";
import { CollusionRingAttack } from "./collusionRing";
import { CombinedCollusionWhitewashAttack } from "./combinedCollusionWhitewash";

export type AttackType =
  | "strategic-default"
  | "whitewashing"
  | "sybil-cluster"
  | "collusion-ring"
  | "combined-collusion-whitewash"
  | "none";

export function createAttack(type: AttackType, config: AttackConfig) {
  switch (type) {
    case "strategic-default":
      return new StrategicDefaultAttack(config);
    case "whitewashing":
      return new WhitewashingAttack(config);
    case "sybil-cluster":
      return new SybilClusterAttack(config);
    case "collusion-ring":
      return new CollusionRingAttack(config);
    case "combined-collusion-whitewash":
      return new CombinedCollusionWhitewashAttack(config);
    case "none":
      return null;
    default:
      throw new Error(`Unknown attack type: ${type}`);
  }
}

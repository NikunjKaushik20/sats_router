/**
 * A2 — Sybil Cluster Attack
 *
 * Creates fake providers that generate fake co-jobs between each other
 * to inflate trust graph edges and network trust scores.
 *
 * Lifecycle:
 *   1. Sybil agents participate in legitimate jobs (mostly honest)
 *   2. Between rounds, they create fake trust edges between each other
 *   3. Inflated network trust → higher TRACE scores → more routing
 *
 * Tests:
 *   - Sybil detection heuristics
 *   - Graph robustness against fake edge injection
 *   - Routing suppression of suspicious clusters
 *
 * Configurable params:
 *   - fakeEdgesPerRound: edges injected per round between sybils [default: 2]
 *   - fakeVolumePerEdge: sats volume on each fake edge [default: 50]
 *   - defaultRate: probability a malicious sybil defaults on a real job [default: 0.3]
 */

import { prisma } from "../../db";
import { Attack, type AttackAgent, type AttackDecision, type AttackPostRoundResult, type AttackConfig, type AttackDecisionContext } from "./base";

export class SybilClusterAttack extends Attack {
  readonly name = "sybil-cluster";
  readonly description = "Fake providers create artificial trust edges to inflate network trust and manipulate routing.";

  private fakeEdgesPerRound: number;
  private fakeVolumePerEdge: number;
  private defaultRate: number;

  constructor(config: AttackConfig) {
    super(config);
    this.fakeEdgesPerRound = (config.params.fakeEdgesPerRound as number) ?? 2;
    this.fakeVolumePerEdge = (config.params.fakeVolumePerEdge as number) ?? 50;
    this.defaultRate = (config.params.defaultRate as number) ?? 0.3;
  }

  decide(agent: AttackAgent, _round: number, _totalRounds: number, _context?: AttackDecisionContext): AttackDecision {
    // Sybil agents are mostly honest on real jobs; occasional defaults create fraud exposure.
    if (!agent.isMalicious) {
      return { shouldDefault: false, reason: "honest_agent" };
    }
    const routeCount = ((agent.state.routeCount as number | undefined) ?? 0) + 1;
    agent.state.routeCount = routeCount;
    const shouldDefault = deterministicUnit(agent.providerId, routeCount) < this.defaultRate;
    return {
      shouldDefault,
      reason: shouldDefault ? "sybil_opportunistic_default" : "sybil_honest_on_real_jobs",
    };
  }

  async postRound(_round: number, _totalRounds: number): Promise<AttackPostRoundResult> {
    const actions: string[] = [];
    const malicious = this.agents.filter((a) => a.isMalicious);

    if (malicious.length < 2) return { actions };

    // Inject fake trust edges between sybil agents
    let edgesCreated = 0;
    for (let i = 0; i < malicious.length && edgesCreated < this.fakeEdgesPerRound; i++) {
      for (let j = i + 1; j < malicious.length && edgesCreated < this.fakeEdgesPerRound; j++) {
        const sourceId = malicious[i].providerId;
        const targetId = malicious[j].providerId;

        // Upsert fake trust edge
        const existing = await prisma.trustEdge.findUnique({
          where: { sourceProviderId_targetProviderId: { sourceProviderId: sourceId, targetProviderId: targetId } },
        });

        if (existing) {
          await prisma.trustEdge.update({
            where: { id: existing.id },
            data: {
              successfulCoJobs: { increment: 1 },
              economicVolume: { increment: this.fakeVolumePerEdge },
              weight: existing.weight + 0.5, // Artificial weight boost
              lastInteraction: new Date(),
            },
          });
        } else {
          await prisma.trustEdge.create({
            data: {
              sourceProviderId: sourceId,
              targetProviderId: targetId,
              successfulCoJobs: 1,
              economicVolume: this.fakeVolumePerEdge,
              escrowReliability: 1.0,
              weight: 1.5, // Slightly inflated
            },
          });
        }

        // Also create reverse edge (bidirectional trust)
        const existingReverse = await prisma.trustEdge.findUnique({
          where: { sourceProviderId_targetProviderId: { sourceProviderId: targetId, targetProviderId: sourceId } },
        });

        if (existingReverse) {
          await prisma.trustEdge.update({
            where: { id: existingReverse.id },
            data: {
              successfulCoJobs: { increment: 1 },
              economicVolume: { increment: this.fakeVolumePerEdge },
              weight: existingReverse.weight + 0.5,
              lastInteraction: new Date(),
            },
          });
        } else {
          await prisma.trustEdge.create({
            data: {
              sourceProviderId: targetId,
              targetProviderId: sourceId,
              successfulCoJobs: 1,
              economicVolume: this.fakeVolumePerEdge,
              escrowReliability: 1.0,
              weight: 1.5,
            },
          });
        }

        edgesCreated++;
        actions.push(`sybil_fake_edge: ${sourceId.substring(0, 8)} ↔ ${targetId.substring(0, 8)} (+${this.fakeVolumePerEdge} sats)`);
      }
    }

    return { actions };
  }
}

function deterministicUnit(providerId: string, round: number): number {
  let hash = 2166136261;
  const input = `${providerId}:${round}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

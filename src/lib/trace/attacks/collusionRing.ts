/**
 * A4 — Collusion Ring Attack
 *
 * Multiple malicious agents coordinate to:
 *   - Generate fake co-jobs between each other
 *   - Exchange fake positive interactions
 *   - Inflate each other's repayment history
 *   - Manipulate graph trust via circular patterns
 *
 * Unlike Sybil: colluders also do real jobs (sometimes defaulting)
 * while secretly boosting each other's metrics.
 *
 * Tests:
 *   - Graph robustness against coordinated manipulation
 *   - Circular pattern detection
 *   - Whether inflated trust translates to routing dominance
 *
 * Configurable params:
 *   - boostPerRound: artificial score boost per colluder per round [default: 15]
 *   - defaultRate: rate at which colluders default on real jobs [default: 0.15]
 *   - exploitDefaultRate: post-build-up default rate once routed [default: 0.75]
 *   - fakeCoJobs: fake co-job edges created per round [default: 1]
 */

import { prisma } from "../../db";
import { Attack, type AttackAgent, type AttackDecision, type AttackPostRoundResult, type AttackConfig, type AttackDecisionContext } from "./base";

export class CollusionRingAttack extends Attack {
  readonly name = "collusion-ring";
  readonly description = "Coordinated malicious agents inflate each other's trust via fake interactions and mutual boosting.";

  private boostPerRound: number;
  private defaultRate: number;
  private exploitDefaultRate: number;
  private fakeCoJobs: number;
  private adaptiveTargetRoutingShare: number;
  private adaptiveInterval: number;
  private adaptiveFakeCoJobs: number;
  private routedRounds: number[] = [];

  constructor(config: AttackConfig) {
    super(config);
    this.boostPerRound = (config.params.boostPerRound as number) ?? 15;
    this.defaultRate = (config.params.defaultRate as number) ?? 0.15;
    this.exploitDefaultRate = (config.params.exploitDefaultRate as number) ?? 0.75;
    this.fakeCoJobs = (config.params.fakeCoJobs as number) ?? 1;
    this.adaptiveTargetRoutingShare = (config.params.adaptiveTargetRoutingShare as number) ?? 0.08;
    this.adaptiveInterval = (config.params.adaptiveInterval as number) ?? 10;
    this.adaptiveFakeCoJobs = this.fakeCoJobs;
  }

  observeRouting(selectedProviderId: string, _round: number, maliciousIds: Set<string>): void {
    if (!maliciousIds.has(selectedProviderId)) return;

    const agent = this.agents.find((a) => a.providerId === selectedProviderId);
    if (!agent) return;

    const exposure = (agent.state.routingExposure as number | undefined) ?? 0;
    agent.state.routingExposure = exposure + 1;
    this.routedRounds.push(_round);
  }

  decide(agent: AttackAgent, round: number, totalRounds: number, _context?: AttackDecisionContext): AttackDecision {
    if (!agent.isMalicious) {
      return { shouldDefault: false, reason: "honest_agent" };
    }

    const attackStartRound = Math.floor(totalRounds * 0.6);
    const hasRealExposure = ((agent.state.routingExposure as number | undefined) ?? 0) > 0;
    const activeDefaultRate = round >= attackStartRound && hasRealExposure
      ? this.exploitDefaultRate
      : this.defaultRate;

    const shouldDefault = deterministicUnit(agent.providerId, round) < activeDefaultRate;
    return {
      shouldDefault,
      reason: shouldDefault
        ? (round >= attackStartRound ? "collusion_exploit_after_trust_building" : "collusion_probe_default")
        : "collusion_honest_round",
    };
  }

  async postRound(round: number, _totalRounds: number): Promise<AttackPostRoundResult> {
    const actions: string[] = [];
    const malicious = this.agents.filter((a) => a.isMalicious);

    if (malicious.length < 2) return { actions };

    const effectiveFakeCoJobs = this.updateAdaptiveEndorsementBudget(round, malicious.length);

    // 1. Create fake co-job edges in a RING pattern (A→B→C→A)
    for (let i = 0; i < Math.min(effectiveFakeCoJobs, malicious.length); i++) {
      const src = malicious[i];
      const tgt = malicious[(i + 1) % malicious.length]; // Ring topology

      const existing = await prisma.trustEdge.findUnique({
        where: {
          sourceProviderId_targetProviderId: {
            sourceProviderId: src.providerId,
            targetProviderId: tgt.providerId,
          },
        },
      });

      if (existing) {
        await prisma.trustEdge.update({
          where: { id: existing.id },
          data: {
            successfulCoJobs: { increment: 1 },
            economicVolume: { increment: 30 },
            weight: existing.weight + 0.3,
            lastInteraction: new Date(),
          },
        });
      } else {
        await prisma.trustEdge.create({
          data: {
            sourceProviderId: src.providerId,
            targetProviderId: tgt.providerId,
            successfulCoJobs: 1,
            economicVolume: 30,
            escrowReliability: 1.0,
            weight: 1.2,
          },
        });
      }

      actions.push(`collusion_ring_edge: ${src.providerId.substring(0, 8)} → ${tgt.providerId.substring(0, 8)}`);
    }

    // 2. Artificially boost each colluder's completion rate via fake economic events
    for (const agent of malicious) {
      await prisma.economicEvent.create({
        data: {
          providerId: agent.providerId,
          eventType: "JOB_SUCCESS",
          amountSats: 10,
          metadata: JSON.stringify({ fake: true, source: "collusion_ring" }),
        },
      });
      actions.push(`collusion_fake_success: ${agent.providerId.substring(0, 8)}`);
    }

    return { actions };
  }

  private updateAdaptiveEndorsementBudget(round: number, maliciousCount: number): number {
    if (round > 0 && round % this.adaptiveInterval === 0) {
      const windowStart = round - this.adaptiveInterval;
      const recentRoutes = this.routedRounds.filter((r) => r >= windowStart && r < round).length;
      const jobsPerRound = (this.config.params.jobsPerRound as number) ?? 5;
      const observedShare = recentRoutes / Math.max(1, this.adaptiveInterval * jobsPerRound);

      if (observedShare < this.adaptiveTargetRoutingShare) {
        this.adaptiveFakeCoJobs = Math.min(maliciousCount, this.adaptiveFakeCoJobs + 1);
      } else {
        this.adaptiveFakeCoJobs = Math.max(1, this.adaptiveFakeCoJobs - 1);
      }
    }

    return this.adaptiveFakeCoJobs;
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

/**
 * A3 — Strategic Default Attack
 *
 * THE MOST IMPORTANT ATTACK. Start here.
 *
 * Lifecycle:
 *   1. Honest behavior → trust accumulation → higher TRACE score
 *   2. Increased routing preference (TRACE trusts them)
 *   3. Sudden default/failure at a calculated moment
 *
 * This directly tests whether TRACE can:
 *   - Detect trust-then-betray patterns
 *   - Recover routing quality after a default
 *   - Limit fraud exposure from trusted-but-malicious agents
 *
 * Configurable params:
 *   - honestPhaseRatio: fraction of total rounds where agent behaves honestly [default: 0.6]
 *   - defaultBurst: number of consecutive defaults after switching [default: 3]
 *   - repeatCycles: whether the agent cycles honest→default→honest [default: false]
 */

import { Attack, type AttackAgent, type AttackDecision, type AttackPostRoundResult, type AttackConfig, type AttackDecisionContext } from "./base";

export class StrategicDefaultAttack extends Attack {
  readonly name = "strategic-default";
  readonly description = "Agents behave honestly to build trust, then suddenly default to exploit accumulated trust.";

  private honestPhaseRatio: number;
  private defaultBurst: number;
  private repeatCycles: boolean;

  constructor(config: AttackConfig) {
    super(config);
    this.honestPhaseRatio = (config.params.honestPhaseRatio as number) ?? 0.6;
    this.defaultBurst = (config.params.defaultBurst as number) ?? 3;
    this.repeatCycles = (config.params.repeatCycles as boolean) ?? false;
  }

  decide(agent: AttackAgent, round: number, totalRounds: number, _context?: AttackDecisionContext): AttackDecision {
    if (!agent.isMalicious) {
      return { shouldDefault: false, reason: "honest_agent" };
    }

    // Track state
    if (!agent.state.defaultsRemaining) {
      agent.state.defaultsRemaining = 0;
      agent.state.phase = "honest";
      agent.state.cycleCount = 0;
    }

    const switchRound = Math.floor(totalRounds * this.honestPhaseRatio);

    // Cycling mode: honest → default → honest → default...
    if (this.repeatCycles) {
      const cycleLength = Math.floor(totalRounds / 4); // 4 phases per experiment
      const cyclePos = round % cycleLength;
      const inDefaultPhase = cyclePos >= Math.floor(cycleLength * this.honestPhaseRatio);

      if (inDefaultPhase && cyclePos < Math.floor(cycleLength * this.honestPhaseRatio) + this.defaultBurst) {
        agent.state.phase = "defaulting";
        return {
          shouldDefault: true,
          reason: `cycle_${Math.floor(round / cycleLength)}_default_burst`,
        };
      }
      agent.state.phase = "honest";
      return { shouldDefault: false, reason: `cycle_${Math.floor(round / cycleLength)}_honest` };
    }

    // Single-shot mode: honest until switchRound, then burst of defaults
    if (round < switchRound) {
      agent.state.phase = "honest";
      return { shouldDefault: false, reason: "trust_accumulation_phase" };
    }

    if (round >= switchRound && round < switchRound + this.defaultBurst) {
      agent.state.phase = "defaulting";
      return {
        shouldDefault: true,
        reason: `strategic_default_burst_${round - switchRound + 1}/${this.defaultBurst}`,
      };
    }

    // After the burst, go quiet (to measure recovery)
    agent.state.phase = "post_default";
    return { shouldDefault: false, reason: "post_default_quiet" };
  }

  async postRound(_round: number, _totalRounds: number): Promise<AttackPostRoundResult> {
    // Strategic default has no side effects beyond the defaults themselves
    return { actions: [] };
  }
}

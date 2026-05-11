/**
 * Attack Interface — Common contract for all adversarial evaluation attacks.
 *
 * Each attack class controls:
 *   - How malicious agents are configured
 *   - When they behave honestly vs maliciously
 *   - What side-effects they create (fake edges, identity resets, etc.)
 */

export interface AttackConfig {
  /** Total number of providers in the experiment */
  totalAgents: number;
  /** Fraction of agents that are malicious [0–1] */
  maliciousRatio: number;
  /** Attack-specific parameters */
  params: Record<string, number | string | boolean>;
}

/** Optional per-job context (e.g. price vs median for selective default). */
export interface AttackDecisionContext {
  jobPriceSats?: number;
  medianJobPriceSats?: number;
}

export interface AttackAgent {
  providerId: string;
  isMalicious: boolean;
  /** Attack-specific state */
  state: Record<string, unknown>;
}

export interface AttackDecision {
  /** Should this agent default/fail on this round? */
  shouldDefault: boolean;
  /** Why (for logging) */
  reason: string;
}

export interface AttackPostRoundResult {
  /** Side effects applied this round (for logging) */
  actions: string[];
}

export abstract class Attack {
  abstract readonly name: string;
  abstract readonly description: string;

  protected config: AttackConfig;
  protected agents: AttackAgent[] = [];

  constructor(config: AttackConfig) {
    this.config = config;
  }

  /** Assign malicious labels to agents after creation */
  assignAgents(providerIds: string[], maliciousIds?: Set<string>): AttackAgent[] {
    if (maliciousIds) {
      this.agents = providerIds.map((id) => ({
        providerId: id,
        isMalicious: maliciousIds.has(id),
        state: {},
      }));
    } else {
      const maliciousCount = Math.floor(providerIds.length * this.config.maliciousRatio);
      // Malicious agents are the last N providers
      this.agents = providerIds.map((id, i) => ({
        providerId: id,
        isMalicious: i >= providerIds.length - maliciousCount,
        state: {},
      }));
    }
    return this.agents;
  }

  /** Decide whether an agent should default on this round */
  abstract decide(
    agent: AttackAgent,
    round: number,
    totalRounds: number,
    context?: AttackDecisionContext
  ): AttackDecision;

  /**
   * Optional hook: adversary observes when its agents are selected for jobs (adaptive collusion).
   */
  observeRouting(_selectedProviderId: string, _round: number, _maliciousIds: Set<string>): void {
    // default no-op
  }

  /** Post-round side effects (e.g., create fake edges, reset identity) */
  abstract postRound(round: number, totalRounds: number): Promise<AttackPostRoundResult>;

  /** Get malicious agent IDs */
  getMaliciousIds(): string[] {
    return this.agents.filter((a) => a.isMalicious).map((a) => a.providerId);
  }

  /** Get honest agent IDs */
  getHonestIds(): string[] {
    return this.agents.filter((a) => !a.isMalicious).map((a) => a.providerId);
  }

  /** Serialise for experiment config snapshot */
  toJSON() {
    return {
      name: this.name,
      description: this.description,
      config: this.config,
      maliciousAgents: this.getMaliciousIds(),
      honestAgents: this.getHonestIds(),
    };
  }
}

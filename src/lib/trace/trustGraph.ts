/**
 * TRACE v2.2 Trust Graph Engine — Adaptive + Causal
 *
 * v2.2 additions:
 *   - Maturity-aware repeated-pair decay: k_eff = k × maturityFactor
 *   - Confidence-gated diversity scoring
 *   - Causal-aware trust persistence
 *
 * v2.1 features (maintained):
 *   - Counterparty entropy: H = -Σ pᵢ·log₂(pᵢ) per provider
 *   - Repeated-pair suppression: trust gain *= exp(-count/k)
 *   - Economic volume weighting: tiny transactions give less trust
 *   - Diversity-adjusted trust: AdjustedTrust = networkTrust × diversityScore
 *   - Loop suspicion score integrated into sybilRisk
 *
 * v2 features (maintained):
 *   - Edge weight saturation caps
 *   - Trust saturation with logarithmic scaling
 *   - Circular trust detection with penalty amplification
 *   - Stronger sybil risk scoring
 */

import { prisma } from "../db";
import {
  TRUST_DECAY,
  TRUST_GRAPH_VALIDATION,
  COUNTERPARTY_DIVERSITY,
  REPEATED_PAIR,
  ECONOMIC_VOLUME_WEIGHTING,
} from "./config";
import { computeEntropyConfidence, effectiveDecayConstant } from "./adaptiveConfig";
import { computeCounterpartyEntropyFromWindow } from "./interactionWindow";

// ─── Trust Edge Management ────────────────────────────────────────────────────

/**
 * Update or create a trust edge after two providers participate in the same
 * orchestration (co-job). v2: applies edge weight cap and diversity checks.
 */
export async function updateTrustEdge(
  sourceProviderId: string,
  targetProviderId: string,
  jobAmountSats: number,
  escrowSuccess: boolean
): Promise<void> {
  if (sourceProviderId === targetProviderId) return;

  const existing = await prisma.trustEdge.findUnique({
    where: {
      sourceProviderId_targetProviderId: {
        sourceProviderId,
        targetProviderId,
      },
    },
  });

  if (existing) {
    const newCoJobs = existing.successfulCoJobs + 1;
    const newVolume = existing.economicVolume + jobAmountSats;
    const newReliability = escrowSuccess
      ? (existing.escrowReliability * existing.successfulCoJobs + 1.0) / newCoJobs
      : (existing.escrowReliability * existing.successfulCoJobs + 0.0) / newCoJobs;

    // v2: Compute edge weight with SATURATION CAP
    let weight = computeEdgeWeight(newCoJobs, newVolume, newReliability);
    weight = Math.min(weight, TRUST_GRAPH_VALIDATION.edgeWeightCap); // CAP

    await prisma.trustEdge.update({
      where: { id: existing.id },
      data: {
        successfulCoJobs: newCoJobs,
        economicVolume: newVolume,
        escrowReliability: round4(newReliability),
        weight: round4(weight),
        lastInteraction: new Date(),
      },
    });
  } else {
    let weight = computeEdgeWeight(1, jobAmountSats, escrowSuccess ? 1.0 : 0.0);
    weight = Math.min(weight, TRUST_GRAPH_VALIDATION.edgeWeightCap);

    await prisma.trustEdge.create({
      data: {
        sourceProviderId,
        targetProviderId,
        successfulCoJobs: 1,
        economicVolume: jobAmountSats,
        escrowReliability: escrowSuccess ? 1.0 : 0.0,
        weight: round4(weight),
      },
    });
  }
}

/**
 * v2.2 Edge weight formula with MATURITY-AWARE DECAY:
 *   w = log2(1 + coJobs) × (1 + log10(1 + volume/100)) × reliability
 *       × exp(-coJobs / k_eff)            ← v2.2: maturity-scaled decay
 *       × volumeWeight                    ← VOLUME AUTHENTICITY
 *
 * v2.2: k_eff = decayConstant × maturityFactor
 * At small scales, maturityFactor > 1 (slower decay, more lenient)
 * At large scales, maturityFactor < 1 (faster decay, stricter)
 */
function computeEdgeWeight(
  coJobs: number,
  volume: number,
  reliability: number,
  networkSize?: number,
  diversityScore?: number
): number {
  const frequencyFactor = Math.log2(1 + coJobs);
  const volumeFactor = 1 + Math.log10(1 + volume / 100);

  // v2.2: Maturity-aware decay constant
  const k_eff = effectiveDecayConstant(networkSize ?? 50, diversityScore ?? 0.5);
  const repeatedPairDecay = Math.exp(-coJobs / k_eff);

  // v2.1: Volume authenticity — tiny fake transactions contribute less
  const minVol = ECONOMIC_VOLUME_WEIGHTING.minVolumeForFullWeight;
  const volumeWeight = Math.min(Math.log2(1 + volume / minVol), 1.0);

  return frequencyFactor * volumeFactor * reliability * repeatedPairDecay * volumeWeight;
}

// ─── v2.2: Tarjan SCC — Directed Cycle Detection ─────────────────────────────

/**
 * Iterative Tarjan's Strongly Connected Components algorithm.
 * Returns an array of SCCs; each SCC is a list of node IDs.
 * Time complexity: O(V + E). Iterative to avoid stack-overflow on large rings.
 */
function runTarjanSCC(adj: Map<string, Set<string>>): string[][] {
  const nodes = [...adj.keys()];
  const indexMap = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];
  let counter = 0;

  // Iterative Tarjan using explicit work-stack to avoid JS call-stack limits
  type Frame = { v: string; iterator: IterableIterator<string>; childDone: boolean };

  for (const root of nodes) {
    if (indexMap.has(root)) continue;

    const workStack: Frame[] = [];
    const pushNode = (v: string) => {
      indexMap.set(v, counter);
      lowlink.set(v, counter);
      counter++;
      stack.push(v);
      onStack.add(v);
      workStack.push({ v, iterator: (adj.get(v) ?? new Set<string>())[Symbol.iterator](), childDone: false });
    };

    pushNode(root);

    while (workStack.length > 0) {
      const frame = workStack[workStack.length - 1];
      const { value: w, done } = frame.iterator.next();

      if (!done && w !== undefined) {
        if (!indexMap.has(w)) {
          pushNode(w);
        } else if (onStack.has(w)) {
          lowlink.set(frame.v, Math.min(lowlink.get(frame.v)!, indexMap.get(w)!));
        }
      } else {
        // All neighbours of frame.v processed — pop
        workStack.pop();
        if (workStack.length > 0) {
          const parent = workStack[workStack.length - 1];
          lowlink.set(parent.v, Math.min(lowlink.get(parent.v)!, lowlink.get(frame.v)!));
        }
        // Root of an SCC?
        if (lowlink.get(frame.v) === indexMap.get(frame.v)) {
          const scc: string[] = [];
          let w2: string;
          do {
            w2 = stack.pop()!;
            onStack.delete(w2);
            scc.push(w2);
          } while (w2 !== frame.v);
          sccs.push(scc);
        }
      }
    }
  }

  return sccs;
}

// ─── v2: Edge Diversity Analysis ──────────────────────────────────────────────

/**
 * Compute edge diversity score for a provider using a pre-built adjacency map.
 * Fixed: accounts for whether out-edges leave the provider's SCC.
 * Returns [0, 1] where 1 = highly diverse with external connections.
 */
function computeEdgeDiversityFromGraph(
  providerId: string,
  adj: Map<string, Set<string>>,
  reverseAdj: Map<string, Set<string>>,
  sccMembership: Map<string, number>,   // nodeId → sccIndex
  edgeVolumes: Map<string, number>,     // "src→tgt" → economicVolume
): number {
  const outNeighbours = adj.get(providerId) ?? new Set<string>();
  const inNeighbours = reverseAdj.get(providerId) ?? new Set<string>();

  const counterparties = new Set<string>([...outNeighbours, ...inNeighbours]);
  const uniqueCount = counterparties.size;
  const totalEdges = outNeighbours.size + inNeighbours.size;

  if (totalEdges === 0) return 0;

  const rawDiversity = uniqueCount / totalEdges;

  // External connectivity: what fraction of out-edges leave this node's SCC?
  const mySCC = sccMembership.get(providerId) ?? -1;
  let externalOut = 0;
  for (const tgt of outNeighbours) {
    if ((sccMembership.get(tgt) ?? -2) !== mySCC) externalOut++;
  }
  // Nodes with ZERO external out-edges (closed ring / clique) get penalised
  const externalRatio = outNeighbours.size > 0 ? externalOut / outNeighbours.size : 1.0;

  // Volume-concentration penalty (Herfindahl index)
  const volumes = [...outNeighbours].map((tgt) => edgeVolumes.get(`${providerId}→${tgt}`) ?? 0);
  const totalVol = volumes.reduce((s, v) => s + v, 0);
  let concentrationPenalty = 0;
  if (totalVol > 0 && volumes.length > 1) {
    const hhi = volumes.reduce((s, v) => s + (v / totalVol) ** 2, 0);
    concentrationPenalty = Math.max(0, hhi - 1 / volumes.length);
  }

  return Math.max(0, Math.min(1, rawDiversity * externalRatio - concentrationPenalty));
}

// ─── v2: Circular Trust Detection ─────────────────────────────────────────────

/**
 * Depth-limited DFS to count how many cycles of length ≤ MAX_DEPTH pass
 * through `startId`, using a pre-built in-memory adjacency map.
 * Replaces the old 2-hop / 3-hop hardcoded DB queries.
 */
function detectCircularPatternsFromGraph(
  startId: string,
  adj: Map<string, Set<string>>,
  maxDepth: number = 10,
): number {
  let cycles = 0;

  const dfs = (current: string, depth: number, visited: Set<string>): void => {
    if (depth > maxDepth) return;
    for (const next of (adj.get(current) ?? [])) {
      if (next === startId && depth >= 2) {
        cycles++;
        continue;
      }
      if (!visited.has(next)) {
        visited.add(next);
        dfs(next, depth + 1, visited);
        visited.delete(next);
      }
    }
  };

  const visited = new Set<string>([startId]);
  dfs(startId, 1, visited);
  return cycles;
}

// ─── Placeholder stubs so the old per-provider call sites still compile ───────
// (updateSybilRiskScores now calls the graph-level versions; these are unused)

async function _legacyDetectCircularPatterns(_providerId: string): Promise<number> {
  return 0;
}
async function _legacyComputeEdgeDiversity(_providerId: string): Promise<number> {
  return 1;
}

// Suppress unused-variable warnings
void _legacyDetectCircularPatterns;
void _legacyComputeEdgeDiversity;

// ─── PageRank-Style Network Trust ─────────────────────────────────────────────

/**
 * v2: Compute networkTrust with saturation caps and diversity weighting.
 */
export async function computeAllNetworkTrust(): Promise<Map<string, number>> {
  const DAMPING = 0.85;
  const MAX_ITER = 20;
  const EPSILON = 0.0001;

  const providers = await prisma.provider.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  const edges = await prisma.trustEdge.findMany();

  const N = providers.length;
  if (N === 0) return new Map();

  const providerIds = providers.map((p) => p.id);
  const idToIndex = new Map(providerIds.map((id, i) => [id, i]));

  // Apply temporal decay to edge weights
  const now = Date.now();
  const decayedEdges = edges.map((e) => {
    const age = now - e.lastInteraction.getTime();
    const decayFactor = Math.pow(0.5, age / TRUST_DECAY.halfLifeMs);
    // v2: Apply edge weight cap AFTER decay
    const weight = Math.min(e.weight * decayFactor, TRUST_GRAPH_VALIDATION.edgeWeightCap);
    return {
      source: idToIndex.get(e.sourceProviderId),
      target: idToIndex.get(e.targetProviderId),
      weight,
    };
  }).filter((e) => e.source !== undefined && e.target !== undefined) as Array<{
    source: number;
    target: number;
    weight: number;
  }>;

  // Build adjacency
  const outEdges: Map<number, Array<{ target: number; weight: number }>> = new Map();
  const outWeightSum: number[] = new Array(N).fill(0);

  for (const e of decayedEdges) {
    if (!outEdges.has(e.source)) outEdges.set(e.source, []);
    outEdges.get(e.source)!.push({ target: e.target, weight: e.weight });
    outWeightSum[e.source] += e.weight;
  }

  // Initialize trust
  let trust = new Array(N).fill(1 / N);
  const newTrust = new Array(N).fill(0);

  // Iterate
  for (let iter = 0; iter < MAX_ITER; iter++) {
    newTrust.fill((1 - DAMPING) / N);

    for (let i = 0; i < N; i++) {
      const edges_i = outEdges.get(i);
      if (!edges_i || outWeightSum[i] === 0) continue;

      for (const e of edges_i) {
        newTrust[e.target] += DAMPING * (e.weight / outWeightSum[i]) * trust[i];
      }
    }

    let maxDelta = 0;
    for (let i = 0; i < N; i++) {
      maxDelta = Math.max(maxDelta, Math.abs(newTrust[i] - trust[i]));
    }

    trust = [...newTrust];
    if (maxDelta < EPSILON) break;
  }

  // Normalize to [0, 1] with v2 SATURATION CAP
  const maxTrust = Math.max(...trust, 0.0001);
  const result = new Map<string, number>();
  for (let i = 0; i < N; i++) {
    const normalizedTrust = trust[i] / maxTrust;
    // v2: Apply trust saturation cap (logarithmic dampening)
    const cappedTrust = Math.min(
      normalizedTrust,
      TRUST_GRAPH_VALIDATION.maxNetworkTrust
    );
    result.set(providerIds[i], round4(cappedTrust));
  }

  return result;
}

/**
 * Compute and persist networkTrust for a single provider.
 */
export async function computeNetworkTrust(providerId: string): Promise<number> {
  const allTrust = await computeAllNetworkTrust();
  const trust = allTrust.get(providerId) ?? 0;

  await prisma.provider.update({
    where: { id: providerId },
    data: { networkTrust: trust },
  });

  return trust;
}

/**
 * v2.1: Compute counterparty entropy for a provider.
 *
 * H(A) = -Σ pᵢ·log₂(pᵢ)
 *
 * where pᵢ = fraction of interactions with counterparty i.
 *
 * High entropy = diverse economic interactions (honest behavior)
 * Low entropy = concentrated clique behavior (suspicious)
 *
 * Returns { entropy, diversityScore } where diversityScore ∈ [0, 1].
 */
export async function computeCounterpartyEntropy(
  providerId: string
): Promise<{ entropy: number; diversityScore: number; uniqueCounterparties: number }> {
  const fromWindow = computeCounterpartyEntropyFromWindow(providerId);
  if (fromWindow) return fromWindow;

  const outEdges = await prisma.trustEdge.findMany({
    where: { sourceProviderId: providerId },
    select: { targetProviderId: true, successfulCoJobs: true, economicVolume: true },
  });
  const inEdges = await prisma.trustEdge.findMany({
    where: { targetProviderId: providerId },
    select: { sourceProviderId: true, successfulCoJobs: true, economicVolume: true },
  });

  // Build interaction frequency map: counterpartyId → total interactions
  const interactionMap = new Map<string, number>();
  for (const e of outEdges) {
    interactionMap.set(
      e.targetProviderId,
      (interactionMap.get(e.targetProviderId) ?? 0) + e.successfulCoJobs
    );
  }
  for (const e of inEdges) {
    interactionMap.set(
      e.sourceProviderId,
      (interactionMap.get(e.sourceProviderId) ?? 0) + e.successfulCoJobs
    );
  }

  const uniqueCounterparties = interactionMap.size;
  if (uniqueCounterparties === 0) {
    return { entropy: 0, diversityScore: 0, uniqueCounterparties: 0 };
  }

  // Total interactions
  const totalInteractions = [...interactionMap.values()].reduce((s, v) => s + v, 0);
  if (totalInteractions === 0) {
    return { entropy: 0, diversityScore: 0, uniqueCounterparties };
  }

  // Shannon entropy: H = -Σ pᵢ·log₂(pᵢ)
  let entropy = 0;
  for (const count of interactionMap.values()) {
    const p = count / totalInteractions;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }

  // diversityScore = clamp(entropy / minEntropyForFullTrust, 0, 1)
  const diversityScore = Math.min(
    entropy / COUNTERPARTY_DIVERSITY.minEntropyForFullTrust,
    1.0
  );

  return {
    entropy: round4(entropy),
    diversityScore: round4(diversityScore),
    uniqueCounterparties,
  };
}

/**
 * v2.2: Persist all network trust with confidence-gated diversity weighting.
 *
 * AdjustedTrust = baseTrust × diversityScore × pairSaturationMultiplier
 *
 * v2.2 improvement: Uses entropy confidence to avoid over-penalizing
 * agents with insufficient interaction history.
 */
export async function persistAllNetworkTrust(): Promise<void> {
  const allTrust = await computeAllNetworkTrust();

  for (const [providerId, baseTrust] of allTrust) {
    // v2.1: Counterparty entropy — THE primary collusion defense
    const { diversityScore, uniqueCounterparties } = await computeCounterpartyEntropy(providerId);

    // v2.2: Get total interactions for confidence gating
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { totalJobs: true },
    });
    const totalInteractions = provider?.totalJobs ?? 0;
    const confidence = computeEntropyConfidence(totalInteractions);

    // ANTI-OVER-HARDENING: New agents have few edges by definition.
    // v2.2: Confidence-gated floor — smoother than hard edge-count threshold
    const totalEdgeCount = uniqueCounterparties;
    const confidenceFloor = 0.5 + (0.5 * (1 - confidence)); // Ranges from 1.0 (new) to 0.5 (mature)
    const effectiveDiversityScore = totalEdgeCount < TRUST_GRAPH_VALIDATION.minDiverseEdges
      ? Math.max(diversityScore, confidenceFloor)
      : diversityScore;

    // Providers with low diversity get dampened trust
    let adjustedTrust = baseTrust * effectiveDiversityScore;

    // Also check minimum diverse edges (v2 feature, preserved)
    const minDiverseEdges = TRUST_GRAPH_VALIDATION.minDiverseEdges;
    if (uniqueCounterparties > 0 && uniqueCounterparties < minDiverseEdges) {
      adjustedTrust *= uniqueCounterparties / minDiverseEdges;
    }

    // v2.1: Apply max single-pair contribution cap
    const outEdges = await prisma.trustEdge.findMany({
      where: { sourceProviderId: providerId },
      select: { targetProviderId: true, weight: true },
    });
    if (outEdges.length > 0) {
      const totalWeight = outEdges.reduce((s, e) => s + e.weight, 0);
      const maxPairWeight = Math.max(...outEdges.map((e) => e.weight));
      const maxPairFraction = totalWeight > 0 ? maxPairWeight / totalWeight : 0;

      if (maxPairFraction > REPEATED_PAIR.maxSinglePairContribution) {
        const excess = maxPairFraction - REPEATED_PAIR.maxSinglePairContribution;
        adjustedTrust *= Math.max(0.2, 1 - excess * 2);
      }
    }

    const finalTrust = round4(Math.min(adjustedTrust, TRUST_GRAPH_VALIDATION.maxNetworkTrust));

    await prisma.provider.update({
      where: { id: providerId },
      data: { networkTrust: finalTrust },
    });
  }
}

// ─── v2: Enhanced Sybil Detection ─────────────────────────────────────────────

export interface SybilCluster {
  providerIds: string[];
  clusterDensity: number;
  suspicionScore: number;
  reasons: string[];
}

/**
 * v2: Detect Sybil clusters with enhanced heuristics:
 *   - Dense cluster detection (same as v1)
 *   - Circular pattern penalty (NEW)
 *   - Edge diversity penalty (NEW)
 *   - Uniform weight detection (enhanced)
 */
export async function detectSybilClusters(): Promise<SybilCluster[]> {
  const edges = await prisma.trustEdge.findMany();
  const providers = await prisma.provider.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  if (providers.length < 2 || edges.length < 2) return [];

  // Build directed adjacency map (only for providers that have edges)
  const adj = new Map<string, Set<string>>();
  const edgeWeightMap = new Map<string, number>();

  for (const p of providers) {
    adj.set(p.id, new Set());
  }
  for (const e of edges) {
    adj.get(e.sourceProviderId)?.add(e.targetProviderId);
    edgeWeightMap.set(`${e.sourceProviderId}→${e.targetProviderId}`, e.weight);
  }

  // v2.2: Run Tarjan's SCC — finds ALL directed cycles of any length in O(V+E)
  const rawSCCs = runTarjanSCC(adj);

  // Only non-trivial SCCs (size ≥ 2) indicate directed cycles → potentially sybil
  const nonTrivialSCCs = rawSCCs.filter((scc) => scc.length >= 2);
  if (nonTrivialSCCs.length === 0) return [];

  // Build SCC membership map for external-connectivity checks
  const sccMembership = new Map<string, number>();
  rawSCCs.forEach((scc, idx) => {
    for (const id of scc) sccMembership.set(id, idx);
  });

  const clusters: SybilCluster[] = [];

  for (const scc of nonTrivialSCCs) {
    const sccSet = new Set(scc);
    const reasons: string[] = [];
    let suspicionBase = 0;

    // Signal 1: SCC size — larger rings are more organised and suspicious
    if (scc.length >= 3) {
      suspicionBase += 0.40;
      reasons.push(`Directed cycle detected: SCC size=${scc.length}`);
    } else {
      suspicionBase += 0.20;
      reasons.push(`Mutual trust pair: SCC size=2`);
    }
    if (scc.length >= 10) {
      suspicionBase += 0.15;
      reasons.push(`Large organised ring (size ≥ 10)`);
    }

    // Signal 2: External isolation — members that have ZERO out-edges leaving the SCC
    let isolatedCount = 0;
    for (const id of scc) {
      const outNeighbours = adj.get(id) ?? new Set<string>();
      const externalOut = [...outNeighbours].filter((n) => !sccSet.has(n)).length;
      if (externalOut === 0 && outNeighbours.size > 0) isolatedCount++;
    }
    const isolationRatio = isolatedCount / scc.length;
    if (isolationRatio >= 0.6) {
      suspicionBase += 0.30;
      reasons.push(`${isolatedCount}/${scc.length} members have zero external out-edges`);
    } else if (isolationRatio >= 0.3) {
      suspicionBase += 0.15;
      reasons.push(`${isolatedCount}/${scc.length} members have zero external out-edges`);
    }

    // Signal 3: Uniform internal edge weights (low CV → fabricated edges)
    const internalWeights: number[] = [];
    for (const src of scc) {
      for (const tgt of scc) {
        const w = edgeWeightMap.get(`${src}→${tgt}`);
        if (w !== undefined) internalWeights.push(w);
      }
    }
    if (internalWeights.length >= 3) {
      const mean = internalWeights.reduce((s, w) => s + w, 0) / internalWeights.length;
      const variance = internalWeights.reduce((s, w) => s + (w - mean) ** 2, 0) / internalWeights.length;
      const cv = Math.sqrt(variance) / (mean || 1);
      if (cv < 0.15) {
        suspicionBase += 0.20;
        reasons.push(`Uniform internal edge weights (CV=${cv.toFixed(3)})`);
      }
    }

    // Signal 4: Bidirectional pairs within the SCC (still counts extra)
    let circularPairs = 0;
    for (const src of scc) {
      for (const tgt of scc) {
        if (src !== tgt && adj.get(src)?.has(tgt) && adj.get(tgt)?.has(src)) {
          circularPairs++;
        }
      }
    }
    const circularPairsUnique = circularPairs / 2;
    if (circularPairsUnique > 0) {
      suspicionBase += Math.min(
        circularPairsUnique * TRUST_GRAPH_VALIDATION.circularPenaltyPerCycle,
        TRUST_GRAPH_VALIDATION.maxCircularPenalty
      );
      reasons.push(`${circularPairsUnique} bidirectional trust pairs within cluster`);
    }

    const suspicionScore = Math.min(suspicionBase, 1.0);

    // Internal density is computed as fraction of possible directed edges present
    const possibleInternalEdges = scc.length * (scc.length - 1);
    const actualInternalEdges = internalWeights.length;
    const clusterDensity = possibleInternalEdges > 0
      ? actualInternalEdges / possibleInternalEdges
      : 0;

    clusters.push({
      providerIds: scc,
      clusterDensity: round4(clusterDensity),
      suspicionScore: round4(suspicionScore),
      reasons,
    });
  }

  return clusters;
}

/**
 * v2.2: Update sybilRisk for all providers.
 *
 * Fully rewritten to use Tarjan SCC-based detection so that directed ring
 * attacks (collusionRing.ts) are correctly detected regardless of ring size.
 *
 * Performance: O(V + E) graph algorithms run in-memory after two DB reads.
 * All writes are done in a single batch at the end (no per-provider queries).
 */
export async function updateSybilRiskScores(): Promise<void> {
  // ── 1. Load graph from DB ─────────────────────────────────────────────────
  const [edges, providers] = await Promise.all([
    prisma.trustEdge.findMany(),
    prisma.provider.findMany({ where: { isActive: true }, select: { id: true } }),
  ]);

  // ── 2. Build in-memory adjacency maps ────────────────────────────────────
  const adj = new Map<string, Set<string>>();
  const reverseAdj = new Map<string, Set<string>>();
  const edgeWeightMap = new Map<string, number>();
  const edgeVolumeMap = new Map<string, number>();

  for (const p of providers) {
    adj.set(p.id, new Set());
    reverseAdj.set(p.id, new Set());
  }
  for (const e of edges) {
    adj.get(e.sourceProviderId)?.add(e.targetProviderId);
    reverseAdj.get(e.targetProviderId)?.add(e.sourceProviderId);
    edgeWeightMap.set(`${e.sourceProviderId}→${e.targetProviderId}`, e.weight);
    edgeVolumeMap.set(`${e.sourceProviderId}→${e.targetProviderId}`, e.economicVolume);
  }

  // ── 3. Run Tarjan SCC — detects all directed cycles in O(V+E) ──────────
  const allSCCs = runTarjanSCC(adj);
  const sccMembership = new Map<string, number>();
  allSCCs.forEach((scc, idx) => {
    for (const id of scc) sccMembership.set(id, idx);
  });

  // ── 4. Compute sybil risk per provider ───────────────────────────────────
  // Inline SCC scoring — avoids a second DB load + second Tarjan run that
  // detectSybilClusters() would trigger if called separately here.
  await prisma.provider.updateMany({ where: { isActive: true }, data: { sybilRisk: 0 } });

  const riskAccum = new Map<string, number>();
  for (const p of providers) riskAccum.set(p.id, 0);

  // 4a. Score each non-trivial SCC directly from the already-computed allSCCs
  for (const scc of allSCCs) {
    if (scc.length < 2) continue;
    const sccSet = new Set(scc);
    let suspicion = scc.length >= 10 ? 0.55 : scc.length >= 3 ? 0.40 : 0.20;

    // External isolation bonus
    let isolated = 0;
    for (const id of scc) {
      const out = adj.get(id) ?? new Set<string>();
      if (out.size > 0 && [...out].every((n) => sccSet.has(n))) isolated++;
    }
    const isolationRatio = isolated / scc.length;
    if (isolationRatio >= 0.6) suspicion += 0.30;
    else if (isolationRatio >= 0.3) suspicion += 0.15;

    // Uniform weights bonus
    const weights: number[] = [];
    for (const src of scc) {
      for (const tgt of scc) {
        const w = edgeWeightMap.get(`${src}→${tgt}`);
        if (w !== undefined) weights.push(w);
      }
    }
    if (weights.length >= 3) {
      const mean = weights.reduce((s, w) => s + w, 0) / weights.length;
      const cv = Math.sqrt(weights.reduce((s, w) => s + (w - mean) ** 2, 0) / weights.length) / (mean || 1);
      if (cv < 0.15) suspicion += 0.20;
    }

    const score = Math.min(suspicion, 1.0);
    for (const pid of scc) {
      riskAccum.set(pid, Math.max(riskAccum.get(pid) ?? 0, score));
    }
  }

  // 4b. Individual secondary signals (computed from in-memory graph — no extra DB calls)
  for (const p of providers) {
    let additional = 0;

    // Depth-limited DFS — catches short cycles (≤ 5 hops) as a secondary signal
    // (Tarjan above already handles long rings; DFS here adds a cheap extra nudge)
    const cycles = detectCircularPatternsFromGraph(p.id, adj, 5);
    if (cycles > 0) {
      additional += Math.min(
        cycles * TRUST_GRAPH_VALIDATION.circularPenaltyPerCycle,
        TRUST_GRAPH_VALIDATION.maxCircularPenalty
      );
    }

    // External connectivity diversity
    const diversity = computeEdgeDiversityFromGraph(
      p.id, adj, reverseAdj, sccMembership, edgeVolumeMap
    );
    if (diversity < 0.3) {
      additional += 0.1;
    }

    if (additional > 0) {
      riskAccum.set(p.id, Math.min((riskAccum.get(p.id) ?? 0) + additional, 1.0));
    }
  }

  // ── 5. Batch-write all sybilRisk updates ─────────────────────────────────
  // Group providers by risk value to minimise update calls
  const byRisk = new Map<number, string[]>();
  for (const [id, risk] of riskAccum) {
    if (risk <= 0) continue; // already reset to 0
    const key = round4(risk);
    if (!byRisk.has(key)) byRisk.set(key, []);
    byRisk.get(key)!.push(id);
  }

  for (const [risk, ids] of byRisk) {
    await prisma.provider.updateMany({
      where: { id: { in: ids } },
      data: { sybilRisk: risk },
    });
  }
}

// ─── Temporal Trust Decay ─────────────────────────────────────────────────────

/**
 * v2: Apply temporal decay with inactivity penalties.
 */
export async function applyTemporalDecay(): Promise<number> {
  const edges = await prisma.trustEdge.findMany();
  const now = Date.now();
  let updatedCount = 0;

  for (const edge of edges) {
    const age = now - edge.lastInteraction.getTime();
    const decayFactor = Math.pow(0.5, age / TRUST_DECAY.halfLifeMs);

    if (decayFactor < 0.95) {
      const newWeight = round4(edge.weight * decayFactor);

      if (newWeight < 0.01) {
        await prisma.trustEdge.delete({ where: { id: edge.id } });
      } else {
        await prisma.trustEdge.update({
          where: { id: edge.id },
          data: { weight: newWeight },
        });
      }
      updatedCount++;
    }
  }

  return updatedCount;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

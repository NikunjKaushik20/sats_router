/**
 * TRACE Analytics API — GET /api/trace
 *
 * Returns TRACE-specific data for the dashboard:
 *   - Provider TRACE scores and risk tiers
 *   - Score history for evolution graphs
 *   - Trust graph edges
 *   - Sybil cluster alerts
 *   - Routing decision log
 *   - Config snapshot for reproducibility
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  snapshotConfig,
  detectSybilClusters,
} from "@/lib/trace";

export async function GET() {
  try {
    // Provider TRACE data
    const providers = await prisma.provider.findMany({
      where: { isActive: true },
      orderBy: { traceScore: "desc" },
      select: {
        id: true,
        name: true,
        capability: true,
        priceSats: true,
        reputationScore: true,
        traceScore: true,
        riskTier: true,
        defaultProbability: true,
        completionRate: true,
        repaymentRate: true,
        successfulEscrowRate: true,
        disputeRate: true,
        networkTrust: true,
        sybilRisk: true,
        stakeRatio: true,
        scoreVolatility: true,
        totalEconomicVolume: true,
        successfulJobs: true,
        failedJobs: true,
        defaultedJobs: true,
        disputedJobs: true,
        totalJobs: true,
        stakeSats: true,
        stakeStatus: true,
        bidMultiplier: true,
      },
    });

    // Score history (last 100 entries across all providers)
    const scoreHistory = await prisma.scoreHistory.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        provider: { select: { name: true } },
      },
    });

    // Trust graph edges
    const trustEdges = await prisma.trustEdge.findMany({
      include: {
        source: { select: { name: true, id: true } },
        target: { select: { name: true, id: true } },
      },
    });

    // Recent routing decisions (last 50)
    const routingDecisions = await prisma.routingDecision.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        selectedProvider: { select: { name: true } },
      },
    });

    // Economic events (last 100)
    const economicEvents = await prisma.economicEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        provider: { select: { name: true } },
      },
    });

    // Sybil clusters
    let sybilClusters: Awaited<ReturnType<typeof detectSybilClusters>> = [];
    try {
      sybilClusters = await detectSybilClusters();
    } catch {
      // Non-fatal
    }

    // Aggregate stats
    const totalRoutingDecisions = await prisma.routingDecision.count();
    const totalEconomicEvents = await prisma.economicEvent.count();
    const avgTraceScore = providers.length > 0
      ? providers.reduce((s, p) => s + p.traceScore, 0) / providers.length
      : 0;

    // Tier distribution
    const tierDistribution = {
      A: providers.filter((p) => p.riskTier === "A").length,
      B: providers.filter((p) => p.riskTier === "B").length,
      C: providers.filter((p) => p.riskTier === "C").length,
      D: providers.filter((p) => p.riskTier === "D").length,
    };

    return NextResponse.json({
      providers,
      scoreHistory: scoreHistory.map((s) => ({
        ...s,
        providerName: s.provider.name,
      })),
      trustGraph: {
        nodes: providers.map((p) => ({
          id: p.id,
          name: p.name,
          traceScore: p.traceScore,
          riskTier: p.riskTier,
          networkTrust: p.networkTrust,
        })),
        edges: trustEdges.map((e) => ({
          source: e.sourceProviderId,
          target: e.targetProviderId,
          sourceName: e.source.name,
          targetName: e.target.name,
          weight: e.weight,
          coJobs: e.successfulCoJobs,
          volume: e.economicVolume,
        })),
      },
      routingDecisions: routingDecisions.map((r) => ({
        ...r,
        selectedProviderName: r.selectedProvider.name,
        candidateScores: JSON.parse(r.candidateScores),
      })),
      economicEvents: economicEvents.map((e) => ({
        ...e,
        providerName: e.provider.name,
        metadata: JSON.parse(e.metadata),
      })),
      sybilClusters,
      stats: {
        totalRoutingDecisions,
        totalEconomicEvents,
        avgTraceScore: Math.round(avgTraceScore * 100) / 100,
        tierDistribution,
        activeProviders: providers.length,
      },
      config: snapshotConfig(),
    });
  } catch (error) {
    console.error("TRACE API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch TRACE data" },
      { status: 500 }
    );
  }
}

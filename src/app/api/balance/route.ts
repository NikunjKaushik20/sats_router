import { NextResponse } from "next/server";
import { getBalance, getNodeId } from "@/lib/lightning";

// Cache balance for 30s to avoid hammering the node with concurrent requests
let _cachedBalance: number | null = null;
let _cacheExpiry = 0;

/**
 * GET /api/balance
 * Returns Riya's Lightning wallet balance in sats.
 * Cached for 30 seconds to prevent concurrent node access under dashboard polling.
 */
export async function GET() {
  // Return cached value if fresh
  if (_cachedBalance !== null && Date.now() < _cacheExpiry) {
    let nodeId: string | null = null;
    try {
      nodeId = getNodeId();
    } catch {
      // non-fatal
    }
    return NextResponse.json({
      balanceSats: _cachedBalance,
      nodeId,
      status: "connected",
      cached: true,
    });
  }

  try {
    const sats = await getBalance();
    _cachedBalance = sats;
    _cacheExpiry = Date.now() + 30_000; // 30s cache

    let nodeId: string | null = null;
    try {
      nodeId = getNodeId();
    } catch {
      // Node ID derivation failure is non-fatal
    }

    return NextResponse.json({
      balanceSats: sats,
      nodeId,
      status: "connected",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Node not connected";
    return NextResponse.json(
      { balanceSats: _cachedBalance, nodeId: null, status: "error", error: message },
      { status: 503 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { orchestrate } from "@/agents/orchestrator";
import { logEvent } from "@/lib/events";

/**
 * POST /api/orchestrate
 * Trigger a full autonomous orchestration run.
 * This is the "one-click demo" endpoint.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    buyerId = "riya-demo",
    logs,
    context,
  } = body as {
    buyerId?: string;
    logs?: string[];
    context?: string;
  };

  const incidentLogs = logs || [
    "2024-01-15 12:01:00 INFO  Request received: GET /api/users",
    "2024-01-15 12:02:55 ERROR DB: too many connections (max: 100)",
    "2024-01-15 12:03:00 ERROR DB: too many connections (max: 100)",
    "2024-01-15 12:03:01 ERROR 500 Internal Server Error — connection timeout",
    "2024-01-15 12:03:02 ERROR 500 Internal Server Error — connection timeout",
    "2024-01-15 12:03:10 WARN  Connection pool exhausted",
    "2024-01-15 12:03:11 ERROR Health check failed: /health returned 503",
    "2024-01-15 12:03:15 WARN  Upstream response time > 30s",
    "2024-01-15 12:03:20 ERROR Circuit breaker OPEN for service: user-db",
  ];

  await logEvent("orchestrator", "🚀 Autonomous orchestration triggered", {
    buyerId,
    logCount: incidentLogs.length,
  });

  try {
    const result = await orchestrate(buyerId, incidentLogs, context);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await logEvent("error", `Orchestration failed: ${msg}`, { buyerId });
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

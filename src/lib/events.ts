import { prisma } from "./db";

export type EventType =
  | "route"
  | "payment"
  | "payout"
  | "execution"
  | "completion"
  | "human_task"
  | "bounty"
  | "error"
  | "orchestrator";

/**
 * Log an event to the database for real-time dashboard display.
 */
export async function logEvent(
  type: EventType,
  message: string,
  data: Record<string, unknown> = {}
) {
  await prisma.eventLog.create({
    data: {
      type,
      message,
      data: JSON.stringify(data),
    },
  });
}

/**
 * Get recent events for dashboard display.
 */
export async function getRecentEvents(limit: number = 50) {
  const events = await prisma.eventLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return events.map((e) => ({
    ...e,
    data: JSON.parse(e.data),
  }));
}

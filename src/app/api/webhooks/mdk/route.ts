import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/events";

const secret = process.env.MDK_WEBHOOK_SECRET || "";

/**
 * POST /api/webhooks/mdk
 * Receives payment confirmation from MDK.
 * Updates job status and triggers agent execution.
 */
export async function POST(req: NextRequest) {
  if (!secret) {
    // In dev mode without webhook secret, accept all
    const body = await req.json();
    await logEvent("payment", `Webhook received (dev mode)`, body);
    return NextResponse.json({ received: true });
  }

  const body = await req.text();
  const headers = {
    "webhook-id": req.headers.get("webhook-id") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? "",
  };

  // Verify signature
  const wh = new Webhook(secret);
  let payload: Record<string, unknown>;
  try {
    payload = wh.verify(body, headers) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { type, data } = payload as { type: string; data: Record<string, unknown> };

  switch (type) {
    case "checkout.completed": {
      const metadata = data.metadata as Record<string, string> | undefined;
      const jobId = metadata?.jobId;
      if (jobId) {
        await prisma.job.update({
          where: { id: jobId },
          data: { status: "paid", paidAt: new Date() },
        });
        await logEvent("payment", `Payment confirmed for job ${jobId}`, { jobId, amountSats: data.amountSats });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

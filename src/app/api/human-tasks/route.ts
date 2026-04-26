import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/events";
import { payInvoice } from "@/lib/lightning";

/**
 * GET /api/human-tasks — List pending human tasks
 */
export async function GET() {
  const tasks = await prisma.humanTask.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      job: {
        include: { provider: true },
      },
    },
  });

  return NextResponse.json(
    tasks.map((t) => ({
      id: t.id,
      jobId: t.jobId,
      question: t.question,
      context: JSON.parse(t.context),
      status: t.status,
      response: t.response,
      rewardSats: t.rewardSats,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      providerName: t.job.provider.name,
    }))
  );
}

/**
 * PATCH /api/human-tasks — Approve or reject a task
 * On approval, attempts a real Lightning payment to the human verifier.
 * Accepts an optional `rewardInvoice` (bolt11) to pay the human directly.
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { taskId, action, feedback, rewardInvoice } = body as {
    taskId: string;
    action: "approve" | "reject";
    feedback?: string;
    rewardInvoice?: string; // bolt11 invoice from human's Lightning wallet
  };

  if (!taskId || !action) {
    return NextResponse.json(
      { error: "Missing taskId or action" },
      { status: 400 }
    );
  }

  const task = await prisma.humanTask.update({
    where: { id: taskId },
    data: {
      status: action === "approve" ? "approved" : "rejected",
      response: feedback || (action === "approve" ? "Approved by human" : "Rejected by human"),
      completedAt: new Date(),
    },
  });

  if (action === "approve") {
    let paymentProof: { paymentHash: string; preimage: string } | null = null;
    let paymentError: string | null = null;

    // Attempt real Lightning payment if human provided a bolt11 invoice
    if (rewardInvoice) {
      try {
        paymentProof = await payInvoice(rewardInvoice);
        await logEvent(
          "payment",
          `⚡ Human verifier paid ${task.rewardSats} sats — hash: ${paymentProof.paymentHash.substring(0, 16)}...`,
          {
            taskId: task.id,
            rewardSats: task.rewardSats,
            paymentHash: paymentProof.paymentHash,
            paymentPreimage: paymentProof.preimage,
          }
        );
      } catch (err) {
        paymentError = err instanceof Error ? err.message : "Payment failed";
        await logEvent(
          "error",
          `⚠️ Could not pay human reward: ${paymentError} — ${task.rewardSats} sats owed`,
          { taskId: task.id, rewardSats: task.rewardSats }
        );
      }
    } else {
      // No invoice provided — log the pending reward
      await logEvent(
        "payment",
        `💰 Human earned ${task.rewardSats} sats for task ${task.id} — provide a bolt11 invoice to receive payment`,
        {
          taskId: task.id,
          rewardSats: task.rewardSats,
        }
      );
    }

    return NextResponse.json({
      id: task.id,
      status: task.status,
      rewardSats: task.rewardSats,
      message: `Task approved. Human earned ${task.rewardSats} sats.`,
      paymentProof,
      paymentError,
    });
  }

  return NextResponse.json({
    id: task.id,
    status: task.status,
    rewardSats: task.rewardSats,
    message: `Task ${action}d.`,
  });
}

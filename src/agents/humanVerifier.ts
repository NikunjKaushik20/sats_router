import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/events";

/**
 * Agent E — Human Verifier
 * Routes tasks to humans for verification. Humans get paid in sats.
 * Cost: 15 sats per request.
 *
 * This agent creates a HumanTask in the database, then polls until
 * a human responds via the dashboard.
 */
export async function createHumanVerificationTask(
  jobId: string,
  question: string,
  context: Record<string, unknown>
): Promise<string> {
  const task = await prisma.humanTask.create({
    data: {
      jobId,
      question,
      context: JSON.stringify(context),
      status: "pending",
      rewardSats: 15,
    },
  });

  await logEvent("human_task", `Human verification requested: "${question}"`, {
    taskId: task.id,
    jobId,
    rewardSats: 15,
  });

  return task.id;
}

/**
 * Poll for human task completion.
 * Returns result when human responds, or null if still pending.
 */
export async function pollHumanTask(
  taskId: string,
  timeoutMs: number = 120_000
): Promise<{ approved: boolean; feedback: string } | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const task = await prisma.humanTask.findUnique({
      where: { id: taskId },
    });

    if (!task) return null;

    if (task.status === "approved") {
      return { approved: true, feedback: task.response || "Approved" };
    }
    if (task.status === "rejected") {
      return { approved: false, feedback: task.response || "Rejected" };
    }

    // Wait 2 seconds before polling again
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Timeout — auto-approve with note
  await prisma.humanTask.update({
    where: { id: taskId },
    data: {
      status: "approved",
      response: "Auto-approved (timeout)",
      completedAt: new Date(),
    },
  });

  return { approved: true, feedback: "Auto-approved (timeout - no human responded within 2 minutes)" };
}

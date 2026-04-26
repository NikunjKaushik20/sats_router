import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/route/[jobId]
 * Poll for job result after payment.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { provider: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    capability: job.capability,
    providerName: job.provider.name,
    priceSats: job.priceSats,
    result: job.result ? JSON.parse(job.result) : null,
    createdAt: job.createdAt,
    paidAt: job.paidAt,
    completedAt: job.completedAt,
    // Cryptographic proof of Lightning payment
    paymentHash: job.paymentHash ?? null,
    paymentPreimage: job.paymentPreimage ?? null,
  });
}

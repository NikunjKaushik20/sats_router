import { prisma } from "./db";
import { calcFee, calcProviderPayout } from "./router";
import { payToLightningAddress } from "./lightning";
import { logEvent } from "./events";

/**
 * Settle a job's provider payout via real Lightning.
 *
 * Flow:
 *   1. Look up the provider's `payoutLightningAddress` (LUD-16).
 *   2. Resolve LNURL-pay → bolt11 invoice for `priceSats - feeSats`.
 *   3. Pay the invoice via the MDK agent-wallet daemon.
 *   4. Persist the payout hash + preimage on the Job, increment provider's
 *      lifetime earnings, emit a payment event.
 *
 * If the provider has no payout address, this records the owed amount on the
 * Job (status: pendingPayout) and emits an event so the dashboard can show
 * "owed but no address." The 10% fee that SatsRouter takes is implicit in
 * the difference between `priceSats` (paid by Riya via L402) and `payoutSats`
 * (sent to the provider here).
 */
export async function settleProviderPayout(jobId: string): Promise<{
  paid: boolean;
  payoutSats: number;
  feeSats: number;
  payoutHash?: string;
  payoutPreimage?: string;
  reason?: string;
}> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { provider: true },
  });
  if (!job) {
    return { paid: false, payoutSats: 0, feeSats: 0, reason: "Job not found" };
  }

  const feeSats = calcFee(job.priceSats);
  const payoutSats = calcProviderPayout(job.priceSats);
  const address = job.provider.payoutLightningAddress?.trim() || "";

  if (!address) {
    await prisma.job.update({
      where: { id: jobId },
      data: { payoutSats },
    });
    await logEvent(
      "payout",
      `💰 ${payoutSats} sats owed to ${job.provider.name} — no payout address registered`,
      {
        jobId,
        providerId: job.provider.id,
        providerName: job.provider.name,
        payoutSats,
        feeSats,
      }
    );
    return { paid: false, payoutSats, feeSats, reason: "No payout address" };
  }

  try {
    const proof = await payToLightningAddress(address, payoutSats);

    await prisma.$transaction([
      prisma.job.update({
        where: { id: jobId },
        data: {
          payoutSats,
          payoutHash: proof.paymentHash || null,
          payoutPreimage: proof.preimage || null,
        },
      }),
      prisma.provider.update({
        where: { id: job.provider.id },
        data: { totalEarnedSats: { increment: payoutSats } },
      }),
    ]);

    await logEvent(
      "payout",
      `⚡ Provider payout: ${payoutSats} sats sent to ${job.provider.name} (${address}) — hash: ${
        proof.paymentHash ? proof.paymentHash.substring(0, 16) + "..." : "confirmed"
      }`,
      {
        jobId,
        providerId: job.provider.id,
        providerName: job.provider.name,
        payoutSats,
        feeSats,
        payoutAddress: address,
        payoutHash: proof.paymentHash,
        payoutPreimage: proof.preimage ? proof.preimage.substring(0, 16) + "..." : "",
      }
    );

    return {
      paid: true,
      payoutSats,
      feeSats,
      payoutHash: proof.paymentHash,
      payoutPreimage: proof.preimage,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown payout error";
    await prisma.job.update({
      where: { id: jobId },
      data: { payoutSats },
    });
    await logEvent(
      "error",
      `⚠️ Payout to ${job.provider.name} failed: ${msg}`,
      {
        jobId,
        providerId: job.provider.id,
        providerName: job.provider.name,
        payoutSats,
        payoutAddress: address,
        error: msg,
      }
    );
    return { paid: false, payoutSats, feeSats, reason: msg };
  }
}

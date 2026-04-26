import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { selectProvider, calcFee } from "@/lib/router";
import { checkBudget, deductBudget } from "@/lib/budget";
import { hashInput, isDuplicateLoop, recordCall } from "@/lib/safety";
import { logEvent } from "@/lib/events";
import { callL402Endpoint } from "@/lib/lightning";
import { settleProviderPayout } from "@/lib/payouts";
import { updateReputation } from "@/lib/reputation";
import type { RouteRequest } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const ENDPOINT_MAP: Record<string, string> = {
  quick_scan:       `${BASE_URL}/api/agents/quick-scan`,
  deep_diagnose:    `${BASE_URL}/api/agents/deep-diagnose`,
  incident_summary: `${BASE_URL}/api/agents/storyteller`,
};

/**
 * POST /api/route
 * Main buyer endpoint. Routes request to best provider agent and executes via real L402 payment.
 * Riya's MDK Lightning node pays the invoice autonomously — no manual invoice payment needed.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as RouteRequest;
  const { buyerId, capability, input } = body;

  if (!buyerId || !capability || !input) {
    return NextResponse.json(
      { error: "Missing fields: buyerId, capability, input" },
      { status: 400 }
    );
  }

  // 1. Safety: duplicate/loop detection
  const inputHash = hashInput(input);
  const isLoop = await isDuplicateLoop(buyerId, capability, inputHash);
  if (isLoop) {
    return NextResponse.json(
      { error: "Blocked: protecting your budget from a possible loop. Same request sent >3 times in 60s." },
      { status: 429 }
    );
  }

  // 2. Find best provider
  const provider = await selectProvider(capability);
  if (!provider) {
    return NextResponse.json(
      { error: `No provider found for capability: ${capability}` },
      { status: 404 }
    );
  }

  // 3. Budget check
  const budgetCheck = await checkBudget(buyerId, provider.priceSats);
  if (!budgetCheck.allowed) {
    return NextResponse.json(
      { error: `Budget blocked: ${budgetCheck.reason}` },
      { status: 402 }
    );
  }

  // 4. Validate capability has an L402 endpoint
  const url = ENDPOINT_MAP[capability];
  if (!url) {
    return NextResponse.json({ error: `Unknown capability: ${capability}` }, { status: 400 });
  }

  // 5. Create job record — starts as pending_payment (honest state)
  const job = await prisma.job.create({
    data: {
      buyerId,
      providerId: provider.id,
      capability,
      inputHash,
      input: JSON.stringify(input),
      status: "pending_payment",
      priceSats: provider.priceSats,
      feeSats: calcFee(provider.priceSats),
    },
  });

  // 6. Record call for loop detection
  await recordCall(buyerId, capability, inputHash);

  await logEvent("route", `Routing ${capability} to ${provider.name} via L402`, {
    jobId: job.id,
    buyerId,
    providerName: provider.name,
    priceSats: provider.priceSats,
  });

  // 7. Execute agent via real L402 payment (callL402Endpoint pays the Lightning invoice)
  let result: unknown;
  let success = false;
  let paymentHash = "";
  let paymentPreimage = "";

  try {
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "running" },
    });

    await logEvent("execution", `Running ${provider.name} (L402 payment in progress)...`, { jobId: job.id });

    // callL402Endpoint: POST → 402 + invoice → MDK node pays → retry with L402 credential
    const { response: agentResponse, paymentHash: pHash, preimage: pPreimage } =
      await callL402Endpoint(url, input);

    if (!agentResponse.ok) {
      const errText = await agentResponse.text();
      throw new Error(`Agent returned ${agentResponse.status}: ${errText}`);
    }

    result = await agentResponse.json();
    paymentHash = pHash;
    paymentPreimage = pPreimage;
    success = true;

    // Mark as paid with cryptographic proof of Lightning payment
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "paid",
        paidAt: new Date(),
        paymentHash: paymentHash || null,
        paymentPreimage: paymentPreimage || null,
      },
    });

    await deductBudget(buyerId, provider.priceSats);

    await logEvent("payment", `⚡ ${provider.priceSats} sats paid to ${provider.name} — hash: ${paymentHash ? paymentHash.substring(0, 16) + "..." : "L402 confirmed"}`, {
      jobId: job.id,
      feeSats: calcFee(provider.priceSats),
      paymentHash,
    });

    // Real fee distribution: pay the provider their share via Lightning.
    try {
      await settleProviderPayout(job.id);
    } catch (payoutErr) {
      console.error(`Payout settlement failed for job ${job.id}:`, payoutErr);
    }

    await logEvent("completion", `✅ ${provider.name} completed`, {
      jobId: job.id,
      success: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    result = { error: msg };
    await logEvent("error", `❌ ${provider.name} failed: ${msg}`, { jobId: job.id });
  }

  // 8. Update job to final state
  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: success ? "completed" : "failed",
      result: JSON.stringify(result),
      completedAt: new Date(),
      ...(success && paymentHash ? { paymentHash, paymentPreimage } : {}),
    },
  });

  // 9. Update reputation
  await updateReputation(provider.id, success);

  return NextResponse.json(
    {
      jobId: job.id,
      provider: {
        name: provider.name,
        priceSats: provider.priceSats,
        reputationScore: provider.reputationScore,
      },
      budgetRemaining: budgetCheck.remainingAfter! - (success ? provider.priceSats : 0),
      status: success ? "completed" : "failed",
      result,
      ...(success && paymentHash ? { paymentHash, paymentPreimage } : {}),
    },
    { status: 200 }
  );
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { lnurlFetchInvoice } from "@/lib/lightning";
import { logEvent } from "@/lib/events";

/**
 * GET /api/providers — List all providers with reputation scores
 * POST /api/providers — Register a new provider (dynamic registration)
 *
 * Registration accepts an optional `payoutLightningAddress` (LUD-16 Lightning
 * Address). When set, SatsRouter will pay the provider their share of every
 * job (priceSats - 10% fee) via real Lightning after the L402 payment settles.
 *
 * To prove the address is reachable, registration validates it by performing
 * an LNURL-pay lookup for the smallest possible amount before persisting.
 */
export async function GET() {
  const providers = await prisma.provider.findMany({
    orderBy: [{ reputationScore: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      capability: true,
      priceSats: true,
      reputationScore: true,
      totalJobs: true,
      flagCount: true,
      isActive: true,
      payoutLightningAddress: true,
      totalEarnedSats: true,
      stakeSats: true,
      stakeStatus: true,
      bidMultiplier: true,
    },
  });
  return NextResponse.json(providers);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name,
    description,
    capability,
    priceSats,
    endpointUrl,
    payoutLightningAddress,
    bidMultiplier,
  } = body as {
    name: string;
    description?: string;
    capability: string;
    priceSats: number;
    endpointUrl?: string;
    payoutLightningAddress?: string;
    bidMultiplier?: number;
  };

  if (!name || !capability || !priceSats) {
    return NextResponse.json(
      { error: "Missing fields: name, capability, priceSats" },
      { status: 400 }
    );
  }

  let validatedAddress = "";
  if (payoutLightningAddress && payoutLightningAddress.trim()) {
    const candidate = payoutLightningAddress.trim();
    try {
      // Validate the address resolves to a working LNURL-pay endpoint.
      // We don't pay anything — we just fetch a 1-sat invoice to confirm it works.
      await lnurlFetchInvoice(candidate, 1);
      validatedAddress = candidate;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Validation failed";
      return NextResponse.json(
        {
          error: `Lightning address validation failed: ${msg}`,
          field: "payoutLightningAddress",
        },
        { status: 400 }
      );
    }
  }

  const validBidMultiplier = bidMultiplier ? Math.max(0.5, Math.min(1.0, bidMultiplier)) : 1.0;

  const provider = await prisma.provider.create({
    data: {
      name,
      description: description || `${name} — ${capability} provider`,
      capability,
      priceSats,
      endpointUrl: endpointUrl || `/api/agents/${capability}`,
      payoutLightningAddress: validatedAddress,
      reputationScore: 3.0,
      isActive: true,
      bidMultiplier: validBidMultiplier,
    },
  });

  await logEvent(
    "route",
    `🆕 Provider registered: ${name} (${capability}, ${priceSats} sats)${
      validatedAddress ? ` — payouts → ${validatedAddress}` : " — no payout address"
    }`,
    {
      providerId: provider.id,
      providerName: name,
      capability,
      priceSats,
      payoutLightningAddress: validatedAddress,
    }
  );

  return NextResponse.json(provider, { status: 201 });
}

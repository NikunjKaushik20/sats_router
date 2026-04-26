import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import dotenv from "dotenv";

// Load .env so MDK_MNEMONIC is available
dotenv.config({ path: path.join(process.cwd(), ".env") });

const dbPath = path.join(process.cwd(), "dev.db");
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: `file:${dbPath}` }),
});

async function main() {
  console.log("⚡ Seeding SatsRouter database...\n");

  // Optional Lightning Addresses for demo providers, controlled via .env so
  // anyone running this can plug in their own LN addresses to receive real
  // payouts during demos. If unset, payouts will be recorded as "owed" with no
  // money moved (safe default for forks).
  const providerPayouts: Record<string, string> = {
    "agent-b-quick-scanner": process.env.PAYOUT_QUICK_SCANNER || "",
    "agent-c-deep-diagnoser": process.env.PAYOUT_DEEP_DIAGNOSER || "",
    "agent-d-storyteller": process.env.PAYOUT_STORYTELLER || "",
    "agent-e-human-verifier": process.env.PAYOUT_HUMAN_VERIFIER || "",
  };

  const providers = [
    {
      id: "agent-b-quick-scanner",
      name: "Agent B — Quick Scanner",
      description: "Fast log pattern detection. Reads raw logs, finds obvious error patterns, returns hints in seconds.",
      capability: "quick_scan",
      priceSats: 5,
      reputationScore: 4.2,
      endpointUrl: "/api/agents/quick-scan",
      bidMultiplier: 0.9,  // 10% discount — competing on price
    },
    {
      id: "agent-c-deep-diagnoser",
      name: "Agent C — Deep Diagnoser",
      description: "Senior SRE-level root-cause analysis. Produces structured JSON with evidence, fix recommendations, and confidence.",
      capability: "deep_diagnose",
      priceSats: 20,
      reputationScore: 4.8,
      endpointUrl: "/api/agents/deep-diagnose",
      stakeSats: 100,
      stakeStatus: "staked",
      stakePaymentHash: "stake_deep_diagnoser_genesis",
    },
    {
      id: "agent-d-storyteller",
      name: "Agent D — Storyteller",
      description: "Technical writer that converts structured diagnoses into clear, human-friendly incident summaries.",
      capability: "incident_summary",
      priceSats: 10,
      reputationScore: 4.6,
      endpointUrl: "/api/agents/storyteller",
    },
    {
      id: "agent-e-human-verifier",
      name: "Agent E — Human Verifier",
      description: "Routes critical decisions to human operators for verification. Humans earn sats for their judgment.",
      capability: "human_verify",
      priceSats: 15,
      reputationScore: 4.9,
      endpointUrl: "/api/human-tasks",
      stakeSats: 100,
      stakeStatus: "staked",
      stakePaymentHash: "stake_human_verifier_genesis",
    },
    {
      id: "agent-f-code-reviewer",
      name: "Agent F — Code Reviewer",
      description: "Security-focused code reviewer. Finds vulnerabilities, rates quality, suggests improvements. L402-gated at 8 sats.",
      capability: "code_review",
      priceSats: 8,
      reputationScore: 3.0,
      endpointUrl: "/api/agents/code-review",
      bidMultiplier: 0.8,  // 20% discount — aggressive pricing to win jobs
    },
  ];

  for (const p of providers) {
    const payoutLightningAddress = providerPayouts[p.id] || "";
    const data = {
      ...p,
      payoutLightningAddress,
      stakeSats: (p as Record<string, unknown>).stakeSats as number || 0,
      stakeStatus: (p as Record<string, unknown>).stakeStatus as string || "none",
      stakePaymentHash: (p as Record<string, unknown>).stakePaymentHash as string || "",
      bidMultiplier: (p as Record<string, unknown>).bidMultiplier as number || 1.0,
    };
    await prisma.provider.upsert({
      where: { id: p.id },
      update: data,
      create: { ...data, isActive: true },
    });
    const payoutNote = payoutLightningAddress
      ? `→ ${payoutLightningAddress}`
      : "(no payout address — set PAYOUT_* in .env to enable real payouts)";
    const extras: string[] = [];
    if (data.stakeSats > 0) extras.push(`🔒 staked ${data.stakeSats} sats`);
    if (data.bidMultiplier < 1.0) extras.push(`bid ${Math.round((1 - data.bidMultiplier) * 100)}% discount`);
    console.log(`  ✓ ${p.name} (${p.priceSats} sats, rep ${p.reputationScore}) ${payoutNote}${extras.length ? " | " + extras.join(", ") : ""}`);
  }

  // Derive Riya's Lightning node ID from her mnemonic
  let buyerNodeId = "";
  const mnemonic = process.env.MDK_MNEMONIC;

  if (mnemonic) {
    try {
      const { deriveNodeId } = await import("@moneydevkit/core");
      buyerNodeId = deriveNodeId(mnemonic, "bitcoin");
      console.log(`\n  ✓ Riya's node ID: ${buyerNodeId.substring(0, 20)}...`);
    } catch (e) {
      console.warn("  ⚠ Could not derive node ID:", e instanceof Error ? e.message : e);
    }
  } else {
    console.warn("  ⚠ MDK_MNEMONIC not set — walletId will be empty");
  }

  // Seed demo buyer (Riya) with her Lightning node ID
  await prisma.buyer.upsert({
    where: { id: "riya-demo" },
    update: { walletId: buyerNodeId },
    create: {
      id: "riya-demo",
      name: "Riya",
      walletId: buyerNodeId,
      dailyBudgetSats: 500,
      perIncidentCapSats: 200,
    },
  });
  console.log(`  ✓ Buyer: Riya (riya-demo) — 500 sats/day budget, node: ${buyerNodeId ? buyerNodeId.substring(0, 16) + "..." : "not derived"}`);

  // Clear old events for fresh demo
  await prisma.eventLog.deleteMany({});
  console.log(`  ✓ Event log cleared`);

  console.log("\n✅ Seeding complete!");
  console.log("\n📋 Next steps:");
  console.log("   1. Ensure Riya's MDK wallet is funded with 500+ sats");
  console.log("   2. Run: npm run dev");
  console.log("   3. Click 'Trigger Incident' — watch real Lightning payments flow!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

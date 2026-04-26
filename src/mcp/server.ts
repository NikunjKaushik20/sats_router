#!/usr/bin/env node

/**
 * SatsRouter MCP Server
 *
 * Exposes SatsRouter's Lightning agent marketplace as MCP tools.
 * Any Claude Desktop, Cursor, or MCP-compatible client can connect and:
 *   - List available AI agents and their prices
 *   - Hire agents to analyze logs (paying via Lightning)
 *   - Check budget and escrow status
 *   - Browse and claim human bounties
 *   - Trigger full autonomous orchestration
 *
 * Usage:
 *   npx tsx src/mcp/server.ts
 *
 * Claude Desktop config (claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "satsrouter": {
 *         "command": "npx",
 *         "args": ["tsx", "src/mcp/server.ts"],
 *         "cwd": "/path/to/satsrouter"
 *       }
 *     }
 *   }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = process.env.SATSROUTER_URL || "http://localhost:3000";

// ── Helper: Make HTTP requests to SatsRouter API ──────────────────────────

async function apiGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  return res.json();
}

async function apiPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 402 && res.status !== 202) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  return res.json();
}

async function apiPatch(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  return res.json();
}

// ── MCP Server ────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "satsrouter",
  version: "1.0.0",
});

// ── Tool: list_providers ──────────────────────────────────────────────────

server.tool(
  "list_providers",
  "List all AI agents available in the SatsRouter marketplace. Shows each agent's name, capability, price in sats, reputation score, staking status, and bid discount.",
  {},
  async () => {
    const providers = await apiGet("/api/providers") as Record<string, unknown>[];

    const formatted = providers.map((p) => {
      const effective = Math.round((p.priceSats as number) * ((p.bidMultiplier as number) || 1.0));
      const lines = [
        `${p.name} (${p.capability})`,
        `  Price: ${p.priceSats} sats${(p.bidMultiplier as number) < 1.0 ? ` (${Math.round((1 - (p.bidMultiplier as number)) * 100)}% discount → ${effective} sats effective)` : ""}`,
        `  Reputation: ${(p.reputationScore as number).toFixed(1)}/5.0 (${p.totalJobs} jobs)`,
        `  Status: ${p.isActive ? "✅ Active" : "🚫 Suspended"}${(p.stakeStatus as string) === "staked" ? " | 🔒 Staked" : ""}${(p.flagCount as number) > 0 ? ` | 🚩 ${p.flagCount} flags` : ""}`,
      ];
      return lines.join("\n");
    });

    return {
      content: [{
        type: "text" as const,
        text: `## SatsRouter Agent Marketplace\n\n${formatted.join("\n\n")}\n\n---\n${providers.length} agents registered. Use \`hire_agent\` to route a request.`,
      }],
    };
  }
);

// ── Tool: hire_agent ──────────────────────────────────────────────────────

server.tool(
  "hire_agent",
  "Trigger a full autonomous incident analysis. Riya (the buyer agent) will plan which agents to hire based on the logs, pay via Lightning, and chain their outputs. Returns structured results from all agents.",
  {
    logs: z.array(z.string()).describe("Array of log lines to analyze. Example: ['2024-01-15 12:01:00 ERROR DB timeout', '12:01:05 WARN Connection pool exhausted']"),
    context: z.string().optional().describe("Optional additional context about the incident"),
  },
  async ({ logs, context }) => {
    const result = await apiPost("/api/orchestrate", {
      buyerId: "riya-demo",
      logs,
      context,
    }) as Record<string, unknown>;

    if (result.success) {
      const steps = result.steps as Array<Record<string, unknown>>;
      const stepText = steps.map((s, i) =>
        `### Step ${i + 1}: ${s.capability}\nProvider: ${s.providerName} (${s.priceSats} sats)\nDuration: ${s.duration}ms\nResult:\n\`\`\`json\n${JSON.stringify(s.result, null, 2)}\n\`\`\``
      ).join("\n\n");

      return {
        content: [{
          type: "text" as const,
          text: `## ⚡ Orchestration Complete\n\nTotal spent: ${result.totalSatsSpent} sats\nSteps: ${steps.length}\n\n${stepText}\n\n### Summary\n${result.summary}`,
        }],
      };
    } else {
      return {
        content: [{
          type: "text" as const,
          text: `❌ Orchestration failed: ${result.error}`,
        }],
        isError: true,
      };
    }
  }
);

// ── Tool: check_budget ────────────────────────────────────────────────────

server.tool(
  "check_budget",
  "Check Riya's current budget: how much has been spent today, remaining budget, burn rate forecast, and estimated jobs left.",
  {},
  async () => {
    const budget = await apiGet("/api/budget/riya-demo") as Record<string, unknown>;

    return {
      content: [{
        type: "text" as const,
        text: [
          `## 💰 Budget Status`,
          ``,
          `- **Spent today**: ${budget.spentTodaySats}/${budget.dailyBudgetSats} sats (${budget.percentUsed}%)`,
          `- **Remaining**: ${budget.remainingSats} sats`,
          `- **Jobs today**: ${budget.jobsToday}`,
          `- **Avg spend/job**: ${budget.avgSpendPerJob} sats`,
          `- **Estimated jobs left**: ${budget.estimatedJobsLeft}`,
          `- **Forecast**: ${budget.burnForecast}`,
        ].join("\n"),
      }],
    };
  }
);

// ── Tool: check_wallet ────────────────────────────────────────────────────

server.tool(
  "check_wallet",
  "Check Riya's real Lightning wallet balance from the MDK agent-wallet daemon.",
  {},
  async () => {
    const balance = await apiGet("/api/balance") as Record<string, unknown>;

    return {
      content: [{
        type: "text" as const,
        text: `## ⚡ Wallet Balance\n\n**${balance.balance_sats} sats** ($${((balance.balance_sats as number) * 0.0006).toFixed(2)} USD)\n\nSource: MDK agent-wallet daemon (real Lightning mainnet)`,
      }],
    };
  }
);

// ── Tool: list_bounties ───────────────────────────────────────────────────

server.tool(
  "list_bounties",
  "List open bounties on the Human Bounty Board. Humans can claim these tasks and earn real sats via Lightning.",
  {
    status: z.enum(["open", "claimed", "submitted", "completed"]).optional().describe("Filter by bounty status. Default: all statuses."),
  },
  async ({ status }) => {
    const data = await apiGet("/api/bounties") as Record<string, unknown>;
    let bounties = (data as Record<string, unknown>).bounties as Array<Record<string, unknown>> ||
                   (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>;

    if (status) {
      bounties = bounties.filter((b) => b.status === status);
    }

    if (bounties.length === 0) {
      return {
        content: [{
          type: "text" as const,
          text: `No bounties found${status ? ` with status "${status}"` : ""}. Trigger an incident to generate bounties.`,
        }],
      };
    }

    const formatted = bounties.map((b) =>
      `- **${b.title}** (${b.rewardSats} sats) — Status: ${b.status}${b.claimedBy ? ` | Claimed by: ${b.claimedBy}` : ""}\n  ID: \`${b.id}\`\n  ${b.description}`
    ).join("\n\n");

    return {
      content: [{
        type: "text" as const,
        text: `## 🏷️ Bounties\n\n${formatted}\n\n---\n${bounties.length} bounties shown. Use \`claim_bounty\` to claim one.`,
      }],
    };
  }
);

// ── Tool: claim_bounty ────────────────────────────────────────────────────

server.tool(
  "claim_bounty",
  "Claim a bounty from the Human Bounty Board. After claiming, submit your work to earn sats.",
  {
    bountyId: z.string().describe("The bounty ID to claim"),
    claimedBy: z.string().describe("Your name or Lightning address"),
  },
  async ({ bountyId, claimedBy }) => {
    const result = await apiPatch("/api/bounties", {
      bountyId,
      action: "claim",
      claimedBy,
    }) as Record<string, unknown>;

    return {
      content: [{
        type: "text" as const,
        text: `✅ Bounty claimed! ${result.message || "Now submit your work to earn sats."}`,
      }],
    };
  }
);

// ── Tool: submit_bounty ───────────────────────────────────────────────────

server.tool(
  "submit_bounty",
  "Submit work for a claimed bounty. Include your Lightning address to receive payment instantly.",
  {
    bountyId: z.string().describe("The bounty ID to submit work for"),
    submission: z.string().describe("Your answer/review/verification"),
    lightningAddress: z.string().optional().describe("Your Lightning address (e.g. user@walletofsatoshi.com) to receive payment"),
    flagProvider: z.boolean().optional().describe("Set to true to flag the provider for bad work quality"),
  },
  async ({ bountyId, submission, lightningAddress, flagProvider }) => {
    const result = await apiPatch("/api/bounties", {
      bountyId,
      action: "submit",
      submission,
      lightningAddress,
      flagProvider,
    }) as Record<string, unknown>;

    return {
      content: [{
        type: "text" as const,
        text: result.paymentProof
          ? `⚡ ${result.message}\n\nPayment proof:\n- Hash: ${(result.paymentProof as Record<string, string>).paymentHash}\n- Preimage: ${(result.paymentProof as Record<string, string>).preimage}`
          : `${result.message || "Submission received."}`,
      }],
    };
  }
);

// ── Tool: check_escrow ────────────────────────────────────────────────────

server.tool(
  "check_escrow",
  "Check escrow status for a specific job, or list all active escrows. Escrow holds funds until quality is verified.",
  {
    jobId: z.string().optional().describe("Optional job ID to check specific escrow. Leave empty to list all active escrows."),
  },
  async ({ jobId }) => {
    const path = jobId ? `/api/escrow?jobId=${jobId}` : "/api/escrow";
    const data = await apiGet(path) as Record<string, unknown>;

    if (jobId && data.escrow) {
      const escrow = data.escrow as Record<string, unknown>;
      return {
        content: [{
          type: "text" as const,
          text: [
            `## 🔐 Escrow: Job ${jobId}`,
            ``,
            `- **Status**: ${escrow.status}`,
            `- **Amount**: ${escrow.amountSats} sats`,
            `- **Provider payout**: ${escrow.providerPayout} sats (after ${escrow.feeSats} sats fee)`,
            `- **Provider**: ${data.provider}`,
            `- **Buyer**: ${data.buyer}`,
            escrow.paymentProof ? `- **Payment proof**: ${escrow.paymentProof}` : "",
            escrow.payoutProof ? `- **Payout proof**: ${escrow.payoutProof}` : "",
          ].filter(Boolean).join("\n"),
        }],
      };
    }

    const escrows = (data.escrows || []) as Array<Record<string, unknown>>;
    const stats = data.stats as Record<string, unknown>;

    return {
      content: [{
        type: "text" as const,
        text: [
          `## 🔐 Active Escrows`,
          ``,
          `- **Total in escrow**: ${stats.totalInEscrow} sats`,
          `- **Funded**: ${stats.fundedCount} | **Held**: ${stats.heldCount} | **Disputed**: ${stats.disputedCount}`,
          ``,
          ...escrows.map((e) =>
            `- ${(e.provider as Record<string, string>).name}: ${e.priceSats} sats (${e.escrowStatus}) — ${e.capability}`
          ),
        ].join("\n"),
      }],
    };
  }
);

// ── Tool: manage_escrow ───────────────────────────────────────────────────

server.tool(
  "manage_escrow",
  "Release, refund, or dispute an escrow. Use after verifying agent output quality.",
  {
    jobId: z.string().describe("The job ID whose escrow to manage"),
    action: z.enum(["release", "refund", "dispute"]).describe("'release' to pay provider, 'refund' to return to buyer, 'dispute' to freeze for arbitration"),
  },
  async ({ jobId, action }) => {
    const result = await apiPost("/api/escrow", { jobId, action }) as Record<string, unknown>;

    return {
      content: [{
        type: "text" as const,
        text: `${result.message || `Escrow ${action} executed for job ${jobId}`}`,
      }],
    };
  }
);

// ── Tool: stake_provider ──────────────────────────────────────────────────

server.tool(
  "stake_provider",
  "Stake sats as collateral for a provider agent. Staked providers get a routing bonus. Stake is slashed if provider gets flagged repeatedly.",
  {
    providerId: z.string().describe("The provider ID to stake for"),
  },
  async ({ providerId }) => {
    const result = await apiPost("/api/providers/stake", {
      providerId,
      simulatePayment: true, // For MCP demo — real staking available via API directly
    }) as Record<string, unknown>;

    return {
      content: [{
        type: "text" as const,
        text: `${result.message || `Staking result: ${JSON.stringify(result)}`}`,
      }],
    };
  }
);

// ── Start Server ──────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🔌 SatsRouter MCP Server running on stdio");
  console.error(`   Connected to: ${BASE_URL}`);
  console.error("   Tools: list_providers, hire_agent, check_budget, check_wallet, list_bounties, claim_bounty, submit_bounty, check_escrow, manage_escrow, stake_provider");
}

main().catch((err) => {
  console.error("MCP Server error:", err);
  process.exit(1);
});

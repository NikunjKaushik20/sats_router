import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { selectProvider, calcFee } from "@/lib/router";
import { checkBudget, deductBudget } from "@/lib/budget";
import { hashInput, isDuplicateLoop, recordCall } from "@/lib/safety";
import { updateReputation } from "@/lib/reputation";
import { logEvent } from "@/lib/events";
import { callL402Endpoint } from "@/lib/lightning";
import { settleProviderPayout } from "@/lib/payouts";
import { createHumanVerificationTask, pollHumanTask } from "./humanVerifier";
import type { OrchestrationPlan } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const client = new OpenAI();

/**
 * The Orchestrator — Riya's brain.
 *
 * Uses an LLM to plan which agents to hire based on:
 * - The incident description
 * - Available providers and their prices
 * - Remaining budget
 *
 * Then executes the plan step-by-step, chaining outputs.
 */
export async function orchestrate(
  buyerId: string,
  incidentLogs: string[],
  incidentContext?: string
): Promise<{
  steps: Array<{
    capability: string;
    providerName: string;
    priceSats: number;
    result: unknown;
    duration: number;
  }>;
  totalSatsSpent: number;
  summary: string;
}> {
  const results: Array<{
    capability: string;
    providerName: string;
    priceSats: number;
    result: unknown;
    duration: number;
  }> = [];
  let totalSatsSpent = 0;

  await logEvent("orchestrator", "🧠 Riya is analyzing the incident...", {
    buyerId,
    logCount: incidentLogs.length,
  });

  // Get available providers and budget
  const providers = await prisma.provider.findMany({
    where: { isActive: true },
    orderBy: { reputationScore: "desc" },
  });

  const budgetCheck = await checkBudget(buyerId, 0);
  const remainingBudget = budgetCheck.remainingAfter || 0;

  // Plan using LLM
  const plan = await createPlan(incidentLogs, providers, remainingBudget, incidentContext);

  await logEvent("orchestrator", `📋 Plan created: ${plan.steps.length} steps. "${plan.reasoning}"`, {
    plan: plan.steps,
    reasoning: plan.reasoning,
  });

  // Execute plan step by step
  let previousResult: unknown = null;

  for (const step of plan.steps) {
    const startTime = Date.now();

    await logEvent("orchestrator", `🎯 Step: ${step.capability} — ${step.reason}`, {
      capability: step.capability,
    });

    // Find provider
    const provider = await selectProvider(step.capability);
    if (!provider) {
      await logEvent("error", `No provider found for ${step.capability}`, {});
      continue;
    }

    // Budget check
    const budget = await checkBudget(buyerId, provider.priceSats);
    if (!budget.allowed) {
      await logEvent("error", `Budget blocked: ${budget.reason}`, {});
      break;
    }

    // Loop detection
    const input = buildInput(step.capability, incidentLogs, previousResult, incidentContext);
    const inputHash = hashInput(input);
    const isLoop = await isDuplicateLoop(buyerId, step.capability, inputHash);
    if (isLoop) {
      await logEvent("error", "Loop detected — skipping to protect budget", {});
      continue;
    }

    // Create job — starts as pending_payment; marked paid after L402 success
    const job = await prisma.job.create({
      data: {
        buyerId,
        providerId: provider.id,
        capability: step.capability,
        inputHash,
        input: JSON.stringify(input),
        status: "pending_payment",
        priceSats: provider.priceSats,
        feeSats: calcFee(provider.priceSats),
      },
    });

    await recordCall(buyerId, step.capability, inputHash);

    await logEvent("payment", `⚡ Initiating L402 payment of ${provider.priceSats} sats to ${provider.name}...`, {
      jobId: job.id,
      providerName: provider.name,
      priceSats: provider.priceSats,
      feeSats: calcFee(provider.priceSats),
    });

    // Execute agent — callL402Endpoint inside pays via real Lightning
    let result: unknown;
    let success = false;
    let paymentHash = "";
    let paymentPreimage = "";

    try {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "running" },
      });

      await logEvent("execution", `🔄 Running ${provider.name} (paying via L402)...`, {
        jobId: job.id,
      });

      const agentResult = await executeAgent(step.capability, input, job.id);
      result = agentResult.result;
      paymentHash = agentResult.paymentHash;
      paymentPreimage = agentResult.preimage;
      success = true;

      // Real payment completed — mark job as paid with cryptographic proof
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "paid",
          paidAt: new Date(),
          paymentHash: paymentHash || null,
          paymentPreimage: paymentPreimage || null,
          // Escrow: funds received from buyer → mark as funded
          escrowStatus: "funded",
        },
      });

      // Deduct budget now that payment confirmed
      await deductBudget(buyerId, provider.priceSats);

      await logEvent("payment", `⚡ ${provider.priceSats} sats paid to ${provider.name} — hash: ${paymentHash ? paymentHash.substring(0, 16) + "..." : "L402 confirmed"} | 🔐 Escrow: funded`, {
        jobId: job.id,
        providerName: provider.name,
        priceSats: provider.priceSats,
        paymentHash,
        paymentPreimage: paymentPreimage ? paymentPreimage.substring(0, 16) + "..." : "",
        escrowStatus: "funded",
      });

      // Settle the provider's share of the payment (priceSats - feeSats) via Lightning.
      // SatsRouter keeps the 10% fee; the provider gets the rest paid to their LN address.
      // For agents like human_verify with no payout address, this records the amount owed.
      try {
        await settleProviderPayout(job.id);
      } catch (payoutErr) {
        // Payout failures should not fail the job — they're logged inside settleProviderPayout.
        console.error(`Payout settlement failed for job ${job.id}:`, payoutErr);
      }

      // Escrow: agent executed and completed → mark as held (awaiting verification)
      await prisma.job.update({
        where: { id: job.id },
        data: { escrowStatus: "held" },
      });

      await logEvent("completion", `✅ ${provider.name} completed | ⏸️ Escrow: held (awaiting verification)`, {
        jobId: job.id,
        resultPreview: typeof result === "string" ? result.substring(0, 100) : JSON.stringify(result).substring(0, 100),
        escrowStatus: "held",
      });

      // Post a quality-check bounty so humans can earn by reviewing AI outputs
      const bountyTypes: Record<string, { type: string; title: string; desc: string; reward: number }> = {
        quick_scan: {
          type: "rate",
          title: "Rate Quick Scan Quality",
          desc: "Rate the accuracy of this AI log analysis on a scale of 1-5. Was the likely cause identified correctly?",
          reward: 5,
        },
        deep_diagnose: {
          type: "verify",
          title: "Verify Root Cause Analysis",
          desc: "Review this deep diagnosis. Is the root cause correct? Is the recommended fix appropriate?",
          reward: 10,
        },
        incident_summary: {
          type: "rate",
          title: "Rate Incident Summary",
          desc: "Is this incident summary clear and accurate? Rate 1-5 and suggest improvements.",
          reward: 5,
        },
      };

      const bountyConfig = bountyTypes[step.capability];
      if (bountyConfig) {
        try {
          await prisma.bounty.create({
            data: {
              jobId: job.id,
              type: bountyConfig.type,
              title: bountyConfig.title,
              description: bountyConfig.desc,
              context: JSON.stringify({
                capability: step.capability,
                providerName: provider.name,
                resultPreview: typeof result === "string"
                  ? result.substring(0, 500)
                  : JSON.stringify(result).substring(0, 500),
              }),
              rewardSats: bountyConfig.reward,
              status: "open",
              expiresAt: new Date(Date.now() + 15 * 60_000),
            },
          });
          await logEvent("bounty", `🏷️ Bounty: "${bountyConfig.title}" — ${bountyConfig.reward} sats`, {
            jobId: job.id,
            type: bountyConfig.type,
            rewardSats: bountyConfig.reward,
          });
        } catch {
          // Non-fatal — bounty creation failure shouldn't block orchestration
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await logEvent("error", `❌ ${provider.name} failed: ${errorMsg}`, {
        jobId: job.id,
      });
      result = { error: errorMsg };
    }

    // Update job to final state with payment proof
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: success ? "completed" : "failed",
        result: JSON.stringify(result),
        completedAt: new Date(),
        ...(success && paymentHash ? { paymentHash, paymentPreimage } : {}),
      },
    });

    // Update reputation
    await updateReputation(provider.id, success);

    const duration = Date.now() - startTime;
    totalSatsSpent += provider.priceSats;
    previousResult = result;

    results.push({
      capability: step.capability,
      providerName: provider.name,
      priceSats: provider.priceSats,
      result,
      duration,
    });
  }

  // Generate final summary
  const summary = typeof previousResult === "string"
    ? previousResult
    : `Orchestration complete. ${results.length} agents hired. ${totalSatsSpent} sats spent.`;

  await logEvent("orchestrator", `🏁 Orchestration complete — ${totalSatsSpent} sats spent on ${results.length} agents`, {
    totalSatsSpent,
    stepsCompleted: results.length,
  });

  return { steps: results, totalSatsSpent, summary };
}

/**
 * Use LLM to create an execution plan.
 */
async function createPlan(
  logs: string[],
  providers: Array<{ name: string; capability: string; priceSats: number; reputationScore: number }>,
  budget: number,
  context?: string
): Promise<OrchestrationPlan> {
  const providerList = providers.map(
    (p) => `- ${p.name}: capability="${p.capability}", price=${p.priceSats} sats, reputation=${p.reputationScore}`
  ).join("\n");

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 500,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `You are Riya, an autonomous AI agent managing incident response. You have a budget of ${budget} sats.

Available specialist agents:
${providerList}

Create a plan for analyzing the incident. Return ONLY valid JSON:
{
  "steps": [{"capability": "...", "reason": "..."}],
  "reasoning": "one sentence explaining your overall strategy"
}

Rules:
- Start with the cheapest option first (quick_scan at 5 sats)
- Only escalate to expensive agents if needed
- Always end with incident_summary to produce a human-readable report
- Optionally add human_verify if the diagnosis confidence might be low
- Stay within budget
- No markdown, just raw JSON`,
        },
        {
          role: "user",
          content: `Incident logs:\n${logs.slice(0, 30).join("\n")}\n\nAdditional context: ${context || "None"}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "";
    return JSON.parse(text) as OrchestrationPlan;
  } catch {
    // Fallback: default 3-step plan
    return {
      steps: [
        { capability: "quick_scan", reason: "Quick initial analysis (5 sats)" },
        { capability: "deep_diagnose", reason: "Deep root-cause analysis (20 sats)" },
        { capability: "incident_summary", reason: "Human-readable summary (10 sats)" },
      ],
      reasoning: "Default escalation plan: scan → diagnose → summarize",
    };
  }
}

/**
 * Build the input object for a given agent capability.
 */
function buildInput(
  capability: string,
  logs: string[],
  previousResult: unknown,
  context?: string
): Record<string, unknown> {
  switch (capability) {
    case "quick_scan":
      return { logs };
    case "deep_diagnose":
      return {
        logs,
        context: previousResult
          ? typeof previousResult === "object"
            ? (previousResult as Record<string, unknown>).likelyCause || JSON.stringify(previousResult)
            : String(previousResult)
          : context || "",
      };
    case "incident_summary":
      return {
        diagnosis: previousResult || { root_cause: "Unknown", evidence: [], recommended_fix: "N/A", confidence: 0 },
      };
    case "human_verify":
      return {
        diagnosis: previousResult || {},
        question: "Does this root cause analysis look correct?",
      };
    default:
      return { logs, context };
  }
}

/**
 * Execute an agent via its L402-gated HTTP endpoint.
 * Riya's MDK node pays the invoice automatically before the agent runs.
 * Returns the agent result AND the Lightning payment proof.
 */
async function executeAgent(
  capability: string,
  input: Record<string, unknown>,
  jobId: string
): Promise<{ result: unknown; paymentHash: string; preimage: string }> {
  if (capability === "human_verify") {
    // Human verify uses a DB-polling flow, not L402
    const taskId = await createHumanVerificationTask(
      jobId,
      (input.question as string) || "Does this look correct?",
      (input.diagnosis as Record<string, unknown>) || {}
    );

    // Also post as a public bounty so any human can earn sats
    await prisma.bounty.create({
      data: {
        jobId,
        type: "verify",
        title: "Verify AI Diagnosis Accuracy",
        description: (input.question as string) || "Review the AI-generated diagnosis and confirm whether the root cause analysis is correct.",
        context: JSON.stringify(input.diagnosis || {}),
        rewardSats: 15,
        status: "open",
        expiresAt: new Date(Date.now() + 10 * 60_000), // 10 min expiry
      },
    });

    await logEvent("bounty", `🏷️ Bounty posted: "Verify AI Diagnosis" — 15 sats reward`, {
      jobId,
      type: "verify",
      rewardSats: 15,
    });

    const result = await pollHumanTask(taskId, 60_000);
    return {
      result: result || { approved: true, feedback: "Auto-approved" },
      paymentHash: "",
      preimage: "",
    };
  }

  // Look up the provider's endpoint URL from the database
  // This enables external agents registered via POST /api/providers to be routed
  const provider = await prisma.provider.findFirst({
    where: { capability, isActive: true },
    orderBy: [{ reputationScore: "desc" }, { priceSats: "asc" }],
  });

  // Built-in endpoints always take priority for the 3 core capabilities.
  // This prevents stale ngrok / external URLs in the DB from breaking demos.
  const builtInEndpoints: Record<string, string> = {
    quick_scan:       `${BASE_URL}/api/agents/quick-scan`,
    deep_diagnose:    `${BASE_URL}/api/agents/deep-diagnose`,
    incident_summary: `${BASE_URL}/api/agents/storyteller`,
  };

  // If this is a known built-in capability, always use the local endpoint.
  // Only use provider.endpointUrl for *external* / unrecognised capabilities.
  let url = builtInEndpoints[capability];

  if (!url && provider?.endpointUrl) {
    // External agent with a custom endpoint (not a core built-in capability)
    const ep = provider.endpointUrl;
    if (ep.startsWith("http://") || ep.startsWith("https://")) {
      url = ep; // Absolute URL — external agent
    } else {
      url = `${BASE_URL}${ep.startsWith("/") ? "" : "/"}${ep}`; // Relative — internal
    }
  }

  if (!url) throw new Error(`Unknown capability: ${capability} — no provider or built-in endpoint found`);

  // callL402Endpoint: sends POST → gets 402+invoice → pays via MDK node → retries with L402 credential
  const { response, paymentHash, preimage } = await callL402Endpoint(url, input);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Agent ${capability} returned ${response.status}: ${text}`);
  }

  const result = await response.json();
  return { result, paymentHash, preimage };
}

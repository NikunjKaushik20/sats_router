import { runStoryteller } from "@/agents/storyteller";

/**
 * Storyteller endpoint — 10 sats per request.
 * L402 paywall handled at the orchestrator level via budget deduction.
 * withPayment removed: MDK webhook requires a live public URL (ngrok) which
 * is not always available. The orchestrator tracks payments internally.
 */
export async function POST(req: Request) {
  const { diagnosis } = await req.json();
  const result = await runStoryteller(diagnosis);
  return Response.json({ summary: result });
}

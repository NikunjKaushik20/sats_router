import { runQuickScanner } from "@/agents/quickScanner";

/**
 * Quick Scanner endpoint — 5 sats per request.
 * L402 paywall handled at the orchestrator level via budget deduction.
 * withPayment removed: MDK webhook requires a live public URL (ngrok) which
 * is not always available. The orchestrator tracks payments internally.
 */
export async function POST(req: Request) {
  const { logs } = await req.json();
  const result = await runQuickScanner(logs || []);
  return Response.json(result);
}

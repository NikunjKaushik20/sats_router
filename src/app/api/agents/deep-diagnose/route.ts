import { runDeepDiagnoser } from "@/agents/deepDiagnoser";

/**
 * Deep Diagnoser endpoint — 20 sats per request.
 * L402 paywall handled at the orchestrator level via budget deduction.
 * withPayment removed: MDK webhook requires a live public URL (ngrok) which
 * is not always available. The orchestrator tracks payments internally.
 */
export async function POST(req: Request) {
  const { logs, context } = await req.json();
  const result = await runDeepDiagnoser(logs || [], context);
  return Response.json(result);
}

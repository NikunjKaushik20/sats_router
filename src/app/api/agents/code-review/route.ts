import { withPayment } from "@moneydevkit/nextjs/server";
import OpenAI from "openai";

const openai = new OpenAI();

/**
 * L402-protected Code Reviewer endpoint — 8 sats per request.
 *
 * This is a 4th provider agent to demonstrate the open marketplace.
 * External developers can register agents just like this one.
 *
 * Accepts: { code: string, language?: string }
 * Returns: { issues: string[], score: number, suggestions: string[] }
 */
const handler = async (req: Request) => {
  const { code, language } = await req.json();

  if (!code) {
    return Response.json({ error: "Missing 'code' field" }, { status: 400 });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 500,
    messages: [
      {
        role: "system",
        content:
          "You are a code security and quality reviewer. Analyze the provided code and return ONLY valid JSON with keys: issues (string[] — list of problems), score (number 1-10 — code quality), suggestions (string[] — improvements). No markdown.",
      },
      {
        role: "user",
        content: `Review this ${language || "code"}:\n\n${code.substring(0, 2000)}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content || "{}";
  try {
    return Response.json(JSON.parse(text));
  } catch {
    return Response.json({
      issues: ["Could not parse structured output"],
      score: 5,
      suggestions: [text],
    });
  }
};

export const POST = withPayment({ amount: 8, currency: "SAT" }, handler);

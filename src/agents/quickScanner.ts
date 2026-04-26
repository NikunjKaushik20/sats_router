import OpenAI from "openai";
import type { QuickScanResult } from "@/types";

/**
 * Agent B — Quick Scanner
 * Fast, cheap log analysis. Uses gpt-4o-mini for speed.
 * Cost: 5 sats per request.
 */
export async function runQuickScanner(logs: string[]): Promise<QuickScanResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 300,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You are a log analysis agent. Analyze the provided logs and return ONLY valid JSON with keys: likelyCause (string), patterns (string[]), confidence ('low'|'medium'|'high'). No markdown, no code blocks, just raw JSON.",
      },
      {
        role: "user",
        content: `Analyze these logs:\n\n${logs.slice(0, 50).join("\n")}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(text) as QuickScanResult;
  } catch {
    return {
      likelyCause: text,
      patterns: [],
      confidence: "low",
    };
  }
}

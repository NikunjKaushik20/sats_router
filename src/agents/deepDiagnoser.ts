import OpenAI from "openai";
import type { DeepDiagnosis } from "@/types";

/**
 * Agent C — Deep Diagnoser
 * Thorough root-cause analysis. Uses gpt-4o-mini for depth.
 * Cost: 20 sats per request.
 */
export async function runDeepDiagnoser(
  logs: string[],
  context?: string
): Promise<DeepDiagnosis> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 600,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are a senior SRE agent. Analyze logs and context to produce a structured root-cause analysis. Return ONLY valid JSON with keys: root_cause (string), evidence (string[]), recommended_fix (string), confidence (number 0.0-1.0). No markdown, no code blocks, just raw JSON.",
      },
      {
        role: "user",
        content: `Logs:\n${logs.join("\n")}\n\nContext: ${context || "None provided"}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(text) as DeepDiagnosis;
  } catch {
    return {
      root_cause: text,
      evidence: [],
      recommended_fix: "Unable to parse structured output",
      confidence: 0.3,
    };
  }
}

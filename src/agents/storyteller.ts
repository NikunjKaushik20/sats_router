import OpenAI from "openai";
import type { DeepDiagnosis } from "@/types";

const client = new OpenAI();

/**
 * Agent D — Storyteller
 * Converts structured diagnosis into human-friendly incident summary.
 * Uses gpt-4o-mini for speed and cost efficiency.
 * Cost: 10 sats per request.
 */
export async function runStoryteller(diagnosis: DeepDiagnosis): Promise<string> {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 400,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          "You are a technical writer who turns structured engineering diagnoses into clear, concise incident summaries for non-technical stakeholders. Write 3-5 sentences max. Plain text only, no markdown.",
      },
      {
        role: "user",
        content: `Turn this diagnosis into a human-friendly incident summary:\n${JSON.stringify(diagnosis, null, 2)}`,
      },
    ],
  });

  return response.choices[0]?.message?.content || "Unable to generate summary.";
}

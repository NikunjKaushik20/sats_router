/**
 * Canonical OpenAI chat completions model for SatsRouter (product agents + TRACE OpenAI backends).
 * Import this instead of hardcoding model IDs so the codebase stays on one GPT variant.
 */
export const OPENAI_CHAT_MODEL = "gpt-4o-mini" as const;

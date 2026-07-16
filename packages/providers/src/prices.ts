/**
 * Approximate list prices in USD per 1,000,000 tokens (input / output).
 * Used to estimate trace + eval cost. Refine as providers change pricing.
 * Money elsewhere is stored in cents, so this converts at the boundary.
 */
const TABLE: Record<string, { in: number; out: number }> = {
  "anthropic:claude-3-5-haiku-latest": { in: 0.8, out: 4.0 },
  "anthropic:claude-3-5-haiku-20241022": { in: 0.8, out: 4.0 },
  "anthropic:claude-3-5-sonnet-latest": { in: 3.0, out: 15.0 },
  "gemini:gemini-1.5-flash": { in: 0.075, out: 0.3 },
  "gemini:gemini-1.5-flash-8b": { in: 0.0375, out: 0.15 },
  "gemini:gemini-1.5-pro": { in: 1.25, out: 5.0 },
  "groq:llama-3.1-8b-instant": { in: 0.05, out: 0.08 },
  "groq:llama-3.3-70b-versatile": { in: 0.59, out: 0.79 },
  "openai:gpt-4o-mini": { in: 0.15, out: 0.6 },
  "openai:gpt-4o": { in: 2.5, out: 10.0 },
};

/** Estimate cost in USD **cents** for a call, or null if the model is unpriced. */
export function estimateCostCents(
  modelRef: string,
  promptTokens: number,
  completionTokens: number,
): number | null {
  const p = TABLE[modelRef];
  if (!p) return null;
  const usd = (promptTokens / 1e6) * p.in + (completionTokens / 1e6) * p.out;
  return usd * 100;
}

/** Cost per 1k tokens in cents (assumes a 50/50 in/out split), or null. */
export function costPer1kCents(modelRef: string): number | null {
  return estimateCostCents(modelRef, 500, 500);
}

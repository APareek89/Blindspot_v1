import { z } from "zod";

/** Providers we can route to (BYO keys, PRD §5). */
export const PROVIDERS = [
  "anthropic",
  "openai",
  "gemini",
  "groq",
  "hf",
  "openrouter",
  "together",
  "ollama",
] as const;
export type Provider = (typeof PROVIDERS)[number];

/**
 * Policy — the rule for the *ideal* model (PRD §2). v1 = cheapest candidate whose
 * judge score is at/above the bar. Produces a Recommendation, never an auto-switch.
 */
export const PolicySchema = z.object({
  type: z.literal("cheapest_passing"),
  minScore: z.number().min(0).max(1),
});
export type Policy = z.infer<typeof PolicySchema>;
export const DEFAULT_POLICY: Policy = { type: "cheapest_passing", minScore: 0.85 };

/** Evidence carried by a Recommendation (PRD §3): deltas + per-criterion + samples. */
export const EvidenceSchema = z.object({
  fromModel: z.string().nullable(),
  toModel: z.string(),
  fromScore: z.number().nullable(),
  toScore: z.number(),
  /** cost change as a percent; negative = cheaper. */
  costDeltaPct: z.number(),
  latencyDeltaMs: z.number().nullable(),
  perCriterion: z.array(
    z.object({
      criterion: z.string(),
      from: z.number().nullable(),
      to: z.number(),
    }),
  ),
  samples: z.array(
    z.object({
      input: z.string(),
      fromOutput: z.string().nullable(),
      toOutput: z.string(),
    }),
  ),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

/** Minimal OpenAI-compatible chat-completions request (permissive; PRD §8 gateway). */
export const ChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatCompletionRequestSchema = z
  .object({
    model: z.string(),
    messages: z.array(ChatMessageSchema).min(1),
    temperature: z.number().optional(),
    max_tokens: z.number().int().positive().optional(),
    stream: z.boolean().optional(),
  })
  .passthrough();
export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;

/** How a route resolves `route:<name>` → concrete `provider:model`. */
export const ROUTE_PREFIX = "route:";

/** One golden example (PRD §7) — the unit that defines "good" for a route. */
export const GoldenExampleInputSchema = z.object({
  input: z.string().min(1),
  referenceOutput: z.string().nullish(),
  rubric: z.string().nullish(),
  label: z.enum(["pass", "fail", "unlabeled"]).default("unlabeled"),
});
export type GoldenExampleInput = z.infer<typeof GoldenExampleInputSchema>;

/** What the Golden Set Agent must return per generated example. */
export const GeneratedGoldenSchema = z.object({
  input: z.string().min(1),
  referenceOutput: z.string().min(1),
  rubric: z.string().min(1),
});
export type GeneratedGolden = z.infer<typeof GeneratedGoldenSchema>;

/** A judge's verdict for one candidate output vs a golden example (PRD §2 Judge). */
export const JudgeVerdictSchema = z.object({
  score: z.number().min(0).max(1),
  perCriterion: z
    .array(z.object({ criterion: z.string(), score: z.number().min(0).max(1) }))
    .default([]),
  reasoning: z.string().default(""),
});
export type JudgeVerdict = z.infer<typeof JudgeVerdictSchema>;

/** Partial edit to a golden example (curate step, PRD §7). */
export const GoldenExamplePatchSchema = z.object({
  input: z.string().min(1).optional(),
  referenceOutput: z.string().nullable().optional(),
  rubric: z.string().nullable().optional(),
  label: z.enum(["pass", "fail", "unlabeled"]).optional(),
  active: z.boolean().optional(),
});
export type GoldenExamplePatch = z.infer<typeof GoldenExamplePatchSchema>;

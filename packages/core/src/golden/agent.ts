import { generateObject } from "ai";
import { z } from "zod";
import { getLanguageModel, providerTimeoutSignal } from "@blindspot/providers";
import { GeneratedGoldenSchema, type GeneratedGolden } from "@blindspot/shared";

const ResultSchema = z.object({
  examples: z.array(GeneratedGoldenSchema).min(1),
});

/**
 * Golden Set Agent (PRD §7): when there's no upload, synthesize a diverse starter
 * set from the route's task description. Uses a strong model via generateObject so
 * output is schema-validated (no brittle JSON parsing). Optionally seeds from real
 * sample inputs pulled from traffic.
 */
export async function generateGoldenExamples(opts: {
  modelRef: string;
  apiKey: string;
  taskDescription: string;
  count: number;
  sampleInputs?: string[];
}): Promise<GeneratedGolden[]> {
  const model = getLanguageModel(opts.modelRef, opts.apiKey);

  const seed = opts.sampleInputs?.length
    ? `Here are real inputs this route has seen — mirror their style and spread:\n${opts.sampleInputs
        .slice(0, 20)
        .map((s, i) => `${i + 1}. ${s}`)
        .join("\n")}\n\n`
    : "";

  const { object } = await generateObject({
    model,
    schema: ResultSchema,
    abortSignal: providerTimeoutSignal(),
    prompt:
      `You are building an evaluation golden set for an AI route.\n` +
      `Route task: ${opts.taskDescription}\n\n` +
      seed +
      `Produce ${opts.count} DIVERSE, representative examples covering easy, typical, and edge cases.\n` +
      `CRITICAL: each "input" must be a COMPLETE, SELF-CONTAINED prompt — it must include the ` +
      `instruction itself, so a model given ONLY this input (no system prompt) can produce the ` +
      `answer. For example, for a summarization task an input should look like ` +
      `"Summarize the following in one sentence:\\n<passage>", NOT just the bare passage.\n` +
      `"referenceOutput" = the ideal answer to that input. "rubric" = 2-4 concise criteria a ` +
      `judge scores against. Avoid near-duplicates.`,
  });

  return object.examples.slice(0, opts.count);
}

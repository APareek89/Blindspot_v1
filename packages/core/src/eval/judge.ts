import { generateObject } from "ai";
import { getLanguageModel, providerTimeoutSignal } from "@blindspot/providers";
import { JudgeVerdictSchema, type JudgeVerdict } from "@blindspot/shared";

/**
 * LLM-as-judge (PRD §2, §6): score one candidate output against a golden example.
 * Uses generateObject so the verdict is schema-validated.
 */
export async function judgeOutput(opts: {
  modelRef: string;
  apiKey: string;
  input: string;
  referenceOutput: string | null;
  rubric: string | null;
  output: string;
}): Promise<JudgeVerdict> {
  const model = getLanguageModel(opts.modelRef, opts.apiKey);
  const { object } = await generateObject({
    model,
    schema: JudgeVerdictSchema,
    abortSignal: providerTimeoutSignal(),
    prompt:
      `You are grading an AI output against a golden example. Be strict and consistent.\n\n` +
      `INPUT:\n${opts.input}\n\n` +
      (opts.referenceOutput ? `REFERENCE (ideal) OUTPUT:\n${opts.referenceOutput}\n\n` : "") +
      (opts.rubric ? `RUBRIC:\n${opts.rubric}\n\n` : "") +
      `CANDIDATE OUTPUT:\n${opts.output}\n\n` +
      `Return an overall "score" from 0.0 to 1.0 for how well the candidate meets the ` +
      `reference/rubric, a "perCriterion" breakdown, and a one-line "reasoning".`,
  });
  return object;
}

import { desc, eq } from "drizzle-orm";
import { evalRuns, getDb, goldenSets } from "@blindspot/db";
import {
  costPer1kCents,
  normalizeModelRef,
  parseModelRef,
  runChat,
} from "@blindspot/providers";
import { DEFAULT_JUDGE_MODEL } from "@blindspot/shared";
import { listExamples } from "../golden/service";
import { getProviderKey } from "../keys";
import { judgeOutput } from "./judge";

export interface EvalJob {
  projectId: string;
  routeId: string;
  /** candidate model to score, e.g. "gemini:gemini-1.5-flash". */
  modelRef: string;
  /** golden set version to score against (defaults to the latest). */
  goldenSetVersion?: number;
  /** override judge model (defaults to JUDGE_MODEL env). */
  judgeModel?: string;
}

export interface EvalResult {
  evalRunId: string;
  modelRef: string;
  goldenSetVersion: number;
  avgScore: number;
  examples: number;
}

/**
 * Back-test a model on a route's golden set (PRD §3, §6): run the candidate over
 * every active example, judge each output, aggregate, and persist an eval_runs row.
 */
export async function runEval(job: EvalJob): Promise<EvalResult> {
  const db = getDb();

  const sets = await db
    .select()
    .from(goldenSets)
    .where(eq(goldenSets.routeId, job.routeId))
    .orderBy(desc(goldenSets.version));
  const gs = job.goldenSetVersion
    ? sets.find((s) => s.version === job.goldenSetVersion)
    : sets[0];
  if (!gs) throw new Error("route has no golden set");

  const examples = (await listExamples(gs.id)).filter((e) => e.active);
  if (examples.length === 0) throw new Error("golden set has no active examples");

  const { provider } = parseModelRef(job.modelRef);
  const candidateKey = await getProviderKey(job.projectId, provider);
  if (!candidateKey) throw new Error(`no ${provider} key configured`);

  const judgeModel = normalizeModelRef(
    job.judgeModel ?? process.env.JUDGE_MODEL ?? DEFAULT_JUDGE_MODEL,
  );
  const judgeKey = await getProviderKey(job.projectId, parseModelRef(judgeModel).provider);
  if (!judgeKey) throw new Error(`no key configured for judge ${judgeModel}`);

  // COST_CAP_USD_PER_EVAL_RUN caps spend per run (0/unset = no cap). We track the
  // candidate cost we can price; unpriced models simply never trip the cap.
  const capUsd = Number(process.env.COST_CAP_USD_PER_EVAL_RUN ?? 0);
  const capCents = capUsd > 0 ? capUsd * 100 : Number.POSITIVE_INFINITY;

  let scoreSum = 0;
  let latencySum = 0;
  let costCentsSum = 0;
  let scored = 0;
  let skipped = 0;
  let capped = false;

  for (const ex of examples) {
    if (costCentsSum >= capCents) {
      capped = true;
      break;
    }
    try {
      const out = await runChat({
        modelRef: job.modelRef,
        apiKey: candidateKey,
        messages: [{ role: "user", content: ex.input }],
      });
      const verdict = await judgeOutput({
        modelRef: judgeModel,
        apiKey: judgeKey,
        input: ex.input,
        referenceOutput: ex.referenceOutput,
        rubric: ex.rubric,
        output: out.text,
      });
      scoreSum += verdict.score;
      latencySum += out.latencyMs;
      if (out.costCents != null) costCentsSum += out.costCents;
      scored += 1;
    } catch (err) {
      // one flaky provider/judge call must not fail the whole back-test
      skipped += 1;
      console.error(`[eval] example skipped: ${(err as Error).message}`);
    }
  }

  if (scored === 0) throw new Error("all eval examples failed (no scores)");
  if (skipped > 0 || capped) {
    console.warn(
      `[eval] ${job.modelRef}: scored ${scored}/${examples.length}` +
        (skipped ? `, ${skipped} skipped` : "") +
        (capped ? `, stopped at cost cap $${capUsd}` : ""),
    );
  }

  const avgScore = scoreSum / scored;
  const row = (
    await db
      .insert(evalRuns)
      .values({
        routeId: job.routeId,
        modelRef: job.modelRef,
        goldenSetVersion: gs.version,
        avgScore,
        costPer1k: costPer1kCents(job.modelRef),
        latencyMs: Math.round(latencySum / scored),
      })
      .returning()
  )[0]!;

  return {
    evalRunId: row.id,
    modelRef: job.modelRef,
    goldenSetVersion: gs.version,
    avgScore,
    examples: scored,
  };
}

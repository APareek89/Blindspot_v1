import { Queue } from "bullmq";
import IORedis from "ioredis";
import { EVAL_QUEUE } from "@blindspot/shared";
import { runEval, type EvalJob, type EvalResult } from "./runner";

let queue: Queue<EvalJob> | null = null;

function getQueue(): Queue<EvalJob> | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!queue) {
    queue = new Queue<EvalJob>(EVAL_QUEUE, {
      connection: new IORedis(url, { maxRetriesPerRequest: null }),
    });
  }
  return queue;
}

export type EnqueueResult =
  | { mode: "queued"; jobId: string | undefined }
  | { mode: "inline"; result: EvalResult };

/**
 * Enqueue an eval run to the worker when REDIS_URL is set (PRD §8 decoupled workers),
 * otherwise run it inline — so the whole loop is demoable without Redis in dev.
 */
export async function enqueueEval(job: EvalJob): Promise<EnqueueResult> {
  const q = getQueue();
  if (q) {
    const added = await q.add("eval", job, { removeOnComplete: true, removeOnFail: 100 });
    return { mode: "queued", jobId: added.id };
  }
  const result = await runEval(job);
  return { mode: "inline", result };
}

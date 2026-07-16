import { Worker } from "bullmq";
import IORedis from "ioredis";
import { generateRecommendation, runEval, type EvalJob } from "@blindspot/core";
import { EVAL_QUEUE, hasEnv, loadRootEnv } from "@blindspot/shared";

loadRootEnv(import.meta.url);

if (!hasEnv("REDIS_URL")) {
  console.log(
    `[worker] REDIS_URL not set — idle (dev runs evals inline via the gateway). Set REDIS_URL to consume "${EVAL_QUEUE}".`,
  );
} else {
  const connection = new IORedis(process.env.REDIS_URL as string, {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<EvalJob>(
    EVAL_QUEUE,
    async (job) => {
      const result = await runEval(job.data);
      console.log(
        `[worker] eval ${result.evalRunId} · ${result.modelRef} · avg ${result.avgScore.toFixed(3)} over ${result.examples} examples`,
      );
      // Recommend step of the loop: a completed eval may now beat the live model.
      const rec = await generateRecommendation(job.data.routeId);
      if (rec) console.log(`[worker] recommendation ${rec.id} · ${rec.status} → ${rec.toModel}`);
      return result;
    },
    { connection },
  );

  worker.on("ready", () =>
    console.log(`[worker] ready — consuming "${EVAL_QUEUE}"`),
  );
  worker.on("failed", (job, err) =>
    console.error(`[worker] job ${job?.id} failed:`, err.message),
  );
  worker.on("error", (err) => console.error("[worker] error:", err.message));
}

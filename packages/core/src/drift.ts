import { and, desc, eq } from "drizzle-orm";
import { driftEvents, evalRuns, getDb, routes } from "@blindspot/db";
import { costPer1kCents } from "@blindspot/providers";
import { runEval } from "./eval/runner";
import { generateRecommendation } from "./recommend";

/**
 * Drift check (PRD §5, §6): re-eval the live model (or inject a simulated post-version-bump
 * score) and compare to its prior score. If quality dropped past the margin OR fell below the
 * bar, record a drift_event and produce an approval-gated recommendation to recover quality.
 * Never auto-reverts unless the route opted into auto-approve (handled in generateRecommendation).
 */
export async function checkDrift(opts: {
  routeId: string;
  simulateNewScore?: number;
  margin?: number;
}) {
  const db = getDb();
  const route = (await db.select().from(routes).where(eq(routes.id, opts.routeId)).limit(1))[0];
  if (!route) throw new Error("route not found");
  if (!route.liveModel) throw new Error("route has no live model");
  const margin = opts.margin ?? 0.05;

  const prior = (
    await db
      .select()
      .from(evalRuns)
      .where(and(eq(evalRuns.routeId, opts.routeId), eq(evalRuns.modelRef, route.liveModel)))
      .orderBy(desc(evalRuns.createdAt))
      .limit(1)
  )[0];
  const oldScore = prior?.avgScore ?? null;

  let newScore: number;
  if (opts.simulateNewScore != null) {
    // simulate a provider version bump degrading the live model
    newScore = opts.simulateNewScore;
    await db.insert(evalRuns).values({
      routeId: opts.routeId,
      modelRef: route.liveModel,
      goldenSetVersion: prior?.goldenSetVersion ?? 1,
      avgScore: newScore,
      costPer1k: costPer1kCents(route.liveModel),
      latencyMs: prior?.latencyMs ?? null,
    });
  } else {
    newScore = (
      await runEval({
        projectId: route.projectId,
        routeId: opts.routeId,
        modelRef: route.liveModel,
      })
    ).avgScore;
  }

  const drifted =
    (oldScore != null && newScore < oldScore - margin) ||
    newScore < route.policyJson.minScore;

  if (!drifted) {
    return { drifted: false, oldScore, newScore, driftEvent: null, recommendation: null };
  }

  const driftEvent = (
    await db
      .insert(driftEvents)
      .values({
        routeId: opts.routeId,
        modelRef: route.liveModel,
        oldScore,
        newScore,
        action: "recommended",
      })
      .returning()
  )[0]!;

  // recover quality: propose the best passing alternative (cost is secondary here)
  const recommendation = await generateRecommendation(opts.routeId, { mode: "drift" });
  return { drifted: true, oldScore, newScore, driftEvent, recommendation };
}

/**
 * CI gate (PRD §5, §12 Phase 5): evaluate a model against the route's golden set and pass
 * only if it clears the policy bar — so a regressing model/prompt change can't reach prod.
 */
export async function runGate(opts: {
  projectId: string;
  routeId: string;
  modelRef?: string;
}) {
  const db = getDb();
  const route = (await db.select().from(routes).where(eq(routes.id, opts.routeId)).limit(1))[0];
  if (!route) throw new Error("route not found");
  const modelRef = opts.modelRef ?? route.liveModel;
  if (!modelRef) throw new Error("no model to gate");

  const result = await runEval({ projectId: opts.projectId, routeId: opts.routeId, modelRef });
  const bar = route.policyJson.minScore;
  return { pass: result.avgScore >= bar, avgScore: result.avgScore, bar, modelRef };
}

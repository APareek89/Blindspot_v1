import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { enqueueEval, generateRecommendation, type EnqueueResult } from "@blindspot/core";
import { candidates, evalRuns, getDb } from "@blindspot/db";
import { getRouteByName } from "../route-resolver";
import type { Env } from "../types";

const VALID_SOURCES = ["api", "hf", "aggregator", "local"] as const;
type Source = (typeof VALID_SOURCES)[number];

/** Candidate pool + eval endpoints (PRD §5, §6). Mounted under /v1. */
export const evalRouter = new Hono<Env>();

// add a candidate model to a route and back-test it against the latest golden set
evalRouter.post("/routes/:name/candidates", async (c) => {
  const projectId = c.get("projectId");
  const route = await getRouteByName(projectId, c.req.param("name"));
  if (!route) return c.json({ error: { message: "route not found" } }, 404);

  const body = (await c.req.json().catch(() => null)) as
    | { modelRef?: string; source?: string }
    | null;
  if (!body?.modelRef) return c.json({ error: { message: "expected { modelRef }" } }, 400);

  const source: Source = VALID_SOURCES.includes(body.source as Source)
    ? (body.source as Source)
    : "api";

  const inserted = await getDb()
    .insert(candidates)
    .values({ routeId: route.id, modelRef: body.modelRef, source, enabled: true })
    .onConflictDoNothing()
    .returning();

  // back-test (queued if REDIS_URL, else inline). An inline run also produces a
  // recommendation immediately; a queued run does so in the worker.
  let backtest: EnqueueResult | { error: string };
  let recommendation: unknown = null;
  try {
    const bt = await enqueueEval({ projectId, routeId: route.id, modelRef: body.modelRef });
    backtest = bt;
    if (bt.mode === "inline") recommendation = await generateRecommendation(route.id);
  } catch (e) {
    backtest = { error: (e as Error).message };
  }

  return c.json({
    candidate: inserted[0] ?? { modelRef: body.modelRef, note: "already existed" },
    backtest,
    recommendation,
  });
});

// run an eval now for a given model (or the route's live model)
evalRouter.post("/routes/:name/eval", async (c) => {
  const projectId = c.get("projectId");
  const route = await getRouteByName(projectId, c.req.param("name"));
  if (!route) return c.json({ error: { message: "route not found" } }, 404);

  const body = (await c.req.json().catch(() => ({}))) as { modelRef?: string };
  const modelRef = body.modelRef ?? route.liveModel;
  if (!modelRef) {
    return c.json({ error: { message: "no modelRef and route has no live model" } }, 400);
  }

  try {
    const result = await enqueueEval({ projectId, routeId: route.id, modelRef });
    const recommendation =
      result.mode === "inline" ? await generateRecommendation(route.id) : null;
    return c.json({ ...result, recommendation });
  } catch (e) {
    return c.json({ error: { message: (e as Error).message } }, 502);
  }
});

evalRouter.get("/routes/:name/eval-runs", async (c) => {
  const route = await getRouteByName(c.get("projectId"), c.req.param("name"));
  if (!route) return c.json({ error: { message: "route not found" } }, 404);
  const rows = await getDb()
    .select()
    .from(evalRuns)
    .where(eq(evalRuns.routeId, route.id))
    .orderBy(desc(evalRuns.createdAt));
  return c.json({ eval_runs: rows });
});

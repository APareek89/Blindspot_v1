import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { addCompatibleCandidate, enqueueEval, generateRecommendation } from "@blindspot/core";
import { evalRuns, getDb } from "@blindspot/db";
import { clampPagination } from "@blindspot/shared";
import { getRouteByName } from "../route-resolver";
import type { Env } from "../types";

/** Candidate pool + eval endpoints (PRD §5, §6). Mounted under /v1. */
export const evalRouter = new Hono<Env>();

// Add only a technically compatible candidate. Phase 7C estimates/authorizes the paid back-test.
evalRouter.post("/routes/:name/candidates", async (c) => {
  const projectId = c.get("projectId");
  const body = (await c.req.json().catch(() => null)) as
    | { modelRef?: string }
    | null;
  if (!body?.modelRef) return c.json({ error: { message: "expected { modelRef }" } }, 400);
  const result = await addCompatibleCandidate(projectId, c.req.param("name"), body.modelRef);
  if (!result.ok) return c.json({ error: { message: result.error } }, result.status as 400 | 404 | 409);
  return c.json(result);
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
  const { limit, offset } = clampPagination(c.req.query("limit"), c.req.query("offset"));
  const rows = await getDb()
    .select()
    .from(evalRuns)
    .where(eq(evalRuns.routeId, route.id))
    .orderBy(desc(evalRuns.createdAt))
    .limit(limit)
    .offset(offset);
  return c.json({ eval_runs: rows });
});

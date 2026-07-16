import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { checkDrift, runGate } from "@blindspot/core";
import { driftEvents, getDb } from "@blindspot/db";
import { getRouteByName } from "../route-resolver";
import type { Env } from "../types";

/** Drift detection + CI gate (PRD §5). Mounted under /v1. */
export const driftRouter = new Hono<Env>();

// re-eval the live model (or inject a simulated post-version-bump score) and flag drift
driftRouter.post("/routes/:name/drift-check", async (c) => {
  const projectId = c.get("projectId");
  const route = await getRouteByName(projectId, c.req.param("name"));
  if (!route) return c.json({ error: { message: "route not found" } }, 404);

  const body = (await c.req.json().catch(() => ({}))) as {
    simulateNewScore?: number;
    margin?: number;
  };
  try {
    const result = await checkDrift({
      routeId: route.id,
      simulateNewScore: body.simulateNewScore,
      margin: body.margin,
    });
    return c.json(result);
  } catch (e) {
    return c.json({ error: { message: (e as Error).message } }, 502);
  }
});

driftRouter.get("/routes/:name/drift-events", async (c) => {
  const route = await getRouteByName(c.get("projectId"), c.req.param("name"));
  if (!route) return c.json({ error: { message: "route not found" } }, 404);
  const rows = await getDb()
    .select()
    .from(driftEvents)
    .where(eq(driftEvents.routeId, route.id))
    .orderBy(desc(driftEvents.createdAt));
  return c.json({ drift_events: rows });
});

// CI gate: 200 when the model clears the bar, 422 when it regresses (so CI fails).
driftRouter.post("/routes/:name/gate", async (c) => {
  const projectId = c.get("projectId");
  const route = await getRouteByName(projectId, c.req.param("name"));
  if (!route) return c.json({ error: { message: "route not found" } }, 404);

  const body = (await c.req.json().catch(() => ({}))) as { modelRef?: string };
  try {
    const result = await runGate({ projectId, routeId: route.id, modelRef: body.modelRef });
    return c.json(result, result.pass ? 200 : 422);
  } catch (e) {
    return c.json({ error: { message: (e as Error).message } }, 502);
  }
});

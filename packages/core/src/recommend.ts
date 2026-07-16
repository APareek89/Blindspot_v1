import { and, desc, eq, getTableColumns } from "drizzle-orm";
import { evalRuns, getDb, recommendations, routes } from "@blindspot/db";
import { costPer1kCents } from "@blindspot/providers";
import type { Evidence } from "@blindspot/shared";

const COST_UNKNOWN = Number.POSITIVE_INFINITY;

/**
 * Policy → Recommendation (PRD §3, §6). Look at the latest eval per candidate model
 * for a route; if a candidate passes the score bar AND is cheaper than the live model,
 * propose a swap with evidence. NEVER switches silently unless the route opted into
 * auto-approve. Returns the created/existing recommendation, or null if none warranted.
 */
export async function generateRecommendation(
  routeId: string,
  opts?: { mode?: "cost" | "drift" },
) {
  const mode = opts?.mode ?? "cost";
  const db = getDb();
  const route = (await db.select().from(routes).where(eq(routes.id, routeId)).limit(1))[0];
  if (!route) return null;

  const minScore = route.policyJson.minScore;
  const runs = await db
    .select()
    .from(evalRuns)
    .where(eq(evalRuns.routeId, routeId))
    .orderBy(desc(evalRuns.createdAt));

  // latest eval per model
  const latest = new Map<string, (typeof runs)[number]>();
  for (const r of runs) if (!latest.has(r.modelRef)) latest.set(r.modelRef, r);

  const liveModel = route.liveModel;
  const liveRun = liveModel ? latest.get(liveModel) : undefined;
  const liveCost = liveModel ? (costPer1kCents(liveModel) ?? COST_UNKNOWN) : COST_UNKNOWN;

  // "cost": cheapest passing candidate cheaper than live (optimize spend).
  // "drift": highest-scoring passing candidate regardless of cost (recover quality).
  let best: (typeof runs)[number] | null = null;
  let bestCost = mode === "cost" ? liveCost : COST_UNKNOWN;
  let bestScore = -1;
  for (const r of latest.values()) {
    if (r.modelRef === liveModel) continue;
    if (r.avgScore < minScore) continue;
    const cost = costPer1kCents(r.modelRef) ?? COST_UNKNOWN;
    if (mode === "cost") {
      if (cost < bestCost) {
        best = r;
        bestCost = cost;
      }
    } else if (r.avgScore > bestScore || (r.avgScore === bestScore && cost < bestCost)) {
      best = r;
      bestScore = r.avgScore;
      bestCost = cost;
    }
  }
  if (!best) return null;

  // don't stack duplicate pending recs for the same target
  const dupe = (
    await db
      .select()
      .from(recommendations)
      .where(
        and(
          eq(recommendations.routeId, routeId),
          eq(recommendations.status, "pending"),
          eq(recommendations.toModel, best.modelRef),
        ),
      )
      .limit(1)
  )[0];
  if (dupe) return dupe;

  const costDeltaPct =
    liveCost === COST_UNKNOWN ? -100 : ((bestCost - liveCost) / liveCost) * 100;
  const evidence: Evidence = {
    fromModel: liveModel,
    toModel: best.modelRef,
    fromScore: liveRun?.avgScore ?? null,
    toScore: best.avgScore,
    costDeltaPct,
    latencyDeltaMs:
      liveRun && best.latencyMs != null && liveRun.latencyMs != null
        ? best.latencyMs - liveRun.latencyMs
        : null,
    // per-criterion + side-by-side samples: filled once we persist per-example
    // outputs (Phase 4.5). Scores + deltas carry the recommendation for now.
    perCriterion: [],
    samples: [],
  };

  // per-route auto-approve (default OFF): within band + cheaper is already guaranteed
  const autoApprove = route.autoApprove;
  const rec = (
    await db
      .insert(recommendations)
      .values({
        routeId,
        fromModel: liveModel,
        toModel: best.modelRef,
        evidenceJson: evidence,
        status: autoApprove ? "approved" : "pending",
      })
      .returning()
  )[0]!;

  if (autoApprove) {
    await db.update(routes).set({ liveModel: best.modelRef }).where(eq(routes.id, routeId));
  }
  return rec;
}

/** One recommendation scoped to a project (ownership check), or null. */
async function getOwnedRec(id: string, projectId: string) {
  const rows = await getDb()
    .select({ rec: getTableColumns(recommendations), projectId: routes.projectId })
    .from(recommendations)
    .innerJoin(routes, eq(recommendations.routeId, routes.id))
    .where(eq(recommendations.id, id))
    .limit(1);
  const row = rows[0];
  if (!row || row.projectId !== projectId) return null;
  return row.rec;
}

/** Approve → the route's live model switches to the recommended model (PRD §3). */
export async function approveRecommendation(id: string, projectId: string) {
  const db = getDb();
  const rec = await getOwnedRec(id, projectId);
  if (!rec) throw new Error("recommendation not found");
  if (rec.status !== "pending") throw new Error(`recommendation already ${rec.status}`);
  await db.update(recommendations).set({ status: "approved" }).where(eq(recommendations.id, id));
  await db.update(routes).set({ liveModel: rec.toModel }).where(eq(routes.id, rec.routeId));
  return { ...rec, status: "approved" as const };
}

/** Reject → dismissed; the reason tunes future recommendations (PRD §3). */
export async function rejectRecommendation(id: string, projectId: string, reason?: string) {
  const db = getDb();
  const rec = await getOwnedRec(id, projectId);
  if (!rec) throw new Error("recommendation not found");
  if (rec.status !== "pending") throw new Error(`recommendation already ${rec.status}`);
  await db
    .update(recommendations)
    .set({ status: "rejected", reason: reason ?? null })
    .where(eq(recommendations.id, id));
  return { ...rec, status: "rejected" as const, reason: reason ?? null };
}

/** The Approvals inbox for a project (optionally filtered by status). */
export async function listRecommendations(opts: {
  projectId: string;
  status?: "pending" | "approved" | "rejected";
}) {
  const where = opts.status
    ? and(eq(routes.projectId, opts.projectId), eq(recommendations.status, opts.status))
    : eq(routes.projectId, opts.projectId);
  return getDb()
    .select({ ...getTableColumns(recommendations), routeName: routes.name })
    .from(recommendations)
    .innerJoin(routes, eq(recommendations.routeId, routes.id))
    .where(where)
    .orderBy(desc(recommendations.createdAt));
}

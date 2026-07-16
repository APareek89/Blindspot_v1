import { eq } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { hashGatewayKey } from "@blindspot/core";
import { apiKeys, getDb } from "@blindspot/db";
import type { Env } from "./types";

/** Gateway keys are stored only as a sha256 hash — never in plaintext (core is the source). */
export const hashKey = hashGatewayKey;

/** Resolve a bearer key (bs_live_…) to its project id, or null if unknown. */
export async function projectIdForKey(raw: string): Promise<string | null> {
  const rows = await getDb()
    .select({ projectId: apiKeys.projectId })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hashKey(raw)))
    .limit(1);
  return rows[0]?.projectId ?? null;
}

/** Hono middleware: require a valid bs_live_ key and stash the project id. */
export const requireProject: MiddlewareHandler<Env> = async (c, next) => {
  const token = (c.req.header("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return c.json({ error: { message: "missing bearer key" } }, 401);
  const projectId = await projectIdForKey(token);
  if (!projectId) return c.json({ error: { message: "invalid key" } }, 401);
  c.set("projectId", projectId);
  await next();
};

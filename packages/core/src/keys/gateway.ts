import { createHash, randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { apiKeys, getDb } from "@blindspot/db";

/** Project-issued gateway keys look like `bs_live_<48 hex chars>`. */
export const GATEWAY_KEY_PREFIX = "bs_live_";

/**
 * The single source of truth for hashing a gateway key. Keys are stored ONLY as a
 * sha256 hash (+ a shown-once prefix) — never in plaintext. Auth (gateway) and
 * bootstrap both hash through this so the two can never drift apart.
 */
export function hashGatewayKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Mint a new gateway key for a project. Returns the raw key ONCE (never stored/retrievable). */
export async function createGatewayKey(projectId: string) {
  const raw = `${GATEWAY_KEY_PREFIX}${randomBytes(24).toString("hex")}`;
  const prefix = raw.slice(0, 12);
  const row = (
    await getDb()
      .insert(apiKeys)
      .values({ projectId, prefix, keyHash: hashGatewayKey(raw) })
      .returning({ id: apiKeys.id, prefix: apiKeys.prefix, createdAt: apiKeys.createdAt })
  )[0]!;
  return { id: row.id, prefix: row.prefix, createdAt: row.createdAt, key: raw };
}

/** List a project's gateway keys — id, shown-once prefix, createdAt. Never the hash or value. */
export async function listGatewayKeys(projectId: string) {
  return getDb()
    .select({ id: apiKeys.id, prefix: apiKeys.prefix, createdAt: apiKeys.createdAt })
    .from(apiKeys)
    .where(eq(apiKeys.projectId, projectId))
    .orderBy(desc(apiKeys.createdAt));
}

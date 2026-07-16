import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // `prepare: false` keeps us compatible with pooled Postgres (Supabase pgbouncer,
  // port 6543). Schema is passed so `db.query.*` relational helpers work.
  const sql = postgres(url, { prepare: false });
  return drizzle(sql, { schema });
}

let cached: ReturnType<typeof createDb> | null = null;

/**
 * Lazily create the Drizzle client. Not called at import time so the repo runs
 * with a blank `.env` (Phase 0). Throws only when actually used without a URL.
 */
export function getDb() {
  return (cached ??= createDb());
}

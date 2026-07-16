import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { Evidence, Policy } from "@blindspot/shared";

// Blindspot lives in its own Postgres schema so it never collides with (or introspects)
// other tables in a shared database. drizzle.config sets schemaFilter to match.
export const bs = pgSchema("blindspot");

// --- enums ---------------------------------------------------------------
export const candidateSource = bs.enum("candidate_source", [
  "api",
  "hf",
  "aggregator",
  "local",
]);
export const goldenOrigin = bs.enum("golden_origin", ["upload", "agent", "grown"]);
export const goldenLabel = bs.enum("golden_label", ["pass", "fail", "unlabeled"]);
export const recommendationStatus = bs.enum("recommendation_status", [
  "pending",
  "approved",
  "rejected",
]);
export const driftAction = bs.enum("drift_action", [
  "recommended",
  "auto_approved",
  "none",
]);
export const providerName = bs.enum("provider_name", [
  "anthropic",
  "openai",
  "gemini",
  "groq",
  "hf",
  "openrouter",
  "together",
  "ollama",
]);

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// --- tables (PRD §9) -----------------------------------------------------
export const projects = bs.table("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

/** App-issued gateway keys (bs_live_…). We store only a hash + a shown-once prefix. */
export const apiKeys = bs.table(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    prefix: text("prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("api_keys_key_hash_idx").on(t.keyHash)],
);

/** BYO provider keys, encrypted at rest (AES-256-GCM). One per provider per project. */
export const providerKeys = bs.table(
  "provider_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    provider: providerName("provider").notNull(),
    encryptedKey: text("encrypted_key").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("provider_keys_project_provider_idx").on(t.projectId, t.provider),
  ],
);

export const routes = bs.table(
  "routes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** null until a candidate is approved for this route. */
    liveModel: text("live_model"),
    policyJson: jsonb("policy_json").$type<Policy>().notNull(),
    autoApprove: boolean("auto_approve").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("routes_project_name_idx").on(t.projectId, t.name)],
);

export const candidates = bs.table(
  "candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    routeId: uuid("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    modelRef: text("model_ref").notNull(),
    source: candidateSource("source").notNull().default("api"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("candidates_route_model_idx").on(t.routeId, t.modelRef)],
);

export const goldenSets = bs.table(
  "golden_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    routeId: uuid("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    origin: goldenOrigin("origin").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("golden_sets_route_version_idx").on(t.routeId, t.version)],
);

export const goldenExamples = bs.table("golden_examples", {
  id: uuid("id").primaryKey().defaultRandom(),
  goldenSetId: uuid("golden_set_id")
    .notNull()
    .references(() => goldenSets.id, { onDelete: "cascade" }),
  input: text("input").notNull(),
  referenceOutput: text("reference_output"),
  rubric: text("rubric"),
  label: goldenLabel("label").notNull().default("unlabeled"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const evalRuns = bs.table(
  "eval_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    routeId: uuid("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    modelRef: text("model_ref").notNull(),
    goldenSetVersion: integer("golden_set_version").notNull(),
    avgScore: real("avg_score").notNull(),
    /** USD cents per 1k tokens (all money is cents). */
    costPer1k: real("cost_per_1k"),
    latencyMs: integer("latency_ms"),
    createdAt: createdAt(),
  },
  (t) => [index("eval_runs_route_idx").on(t.routeId)],
);

export const recommendations = bs.table(
  "recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    routeId: uuid("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    fromModel: text("from_model"),
    toModel: text("to_model").notNull(),
    evidenceJson: jsonb("evidence_json").$type<Evidence>().notNull(),
    status: recommendationStatus("status").notNull().default("pending"),
    /** rejection reason — tunes future recommendations (PRD §3). */
    reason: text("reason"),
    createdAt: createdAt(),
  },
  (t) => [index("recommendations_route_status_idx").on(t.routeId, t.status)],
);

export const driftEvents = bs.table("drift_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  routeId: uuid("route_id")
    .notNull()
    .references(() => routes.id, { onDelete: "cascade" }),
  modelRef: text("model_ref").notNull(),
  oldScore: real("old_score"),
  newScore: real("new_score").notNull(),
  action: driftAction("action").notNull().default("recommended"),
  createdAt: createdAt(),
});

export const traces = bs.table(
  "traces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    routeId: uuid("route_id").references(() => routes.id, {
      onDelete: "set null",
    }),
    model: text("model").notNull(),
    input: jsonb("input").notNull(),
    output: text("output"),
    costCents: real("cost_cents"),
    latencyMs: integer("latency_ms"),
    createdAt: createdAt(),
  },
  (t) => [index("traces_route_idx").on(t.routeId)],
);

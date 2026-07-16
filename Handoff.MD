# Handoff.MD — Blindspot
> AGENT: read this fully at session start; open with the pending points below (or ask
> "what would you like to do now?" if none). Update after every major change and when
> ~10% of context remains — then tell the user to start a fresh session with:
> "Refer to Handoff.MD in /Users/anandpareek/Documents/Projects/blindspot and begin".
> Keep this file ONE SCREEN: current state only; history lives in Learning.MD and git.

## Compact summary of previous session
- Architecture approved (2026-07-16). Built the **entire Blindspot backend loop, Phases 0→5**,
  and **verified it live** against Groq models + a live Supabase Postgres.
- Stack as approved: TS · pnpm+Turborepo · Hono gateway · Vercel AI SDK v4 adapters · Drizzle ·
  BullMQ/Redis (inline fallback) · Zod. Packages: `shared`, `db`, `providers`, `core`; apps:
  `gateway`, `worker`.
- One real bug found + fixed via the live smoke test (golden inputs must be self-contained — see
  Learning.MD). Nothing committed yet (no git commits).

## Current state
- ✅ **Phases 0–5 code-complete, `pnpm typecheck` green on all 6 packages, VERIFIED LIVE**:
  connect → `route:<name>` (auto-create) → trace → golden set (upload OR agent) → eval (LLM-judge)
  → recommendation (evidence) → approve → **live model actually switched** → drift detected →
  CI gate returned **422** on a sub-bar model.
- ✅ **DB**: `blindspot` Postgres schema (11 tables) pushed to Supabase (isolated via `schemaFilter`
  because the DB is shared — `public.generations` etc. exist). `db:push`/`bootstrap` work.
- ✅ **`.env` fixed**: real secrets moved from committed `.env.example` (now blank) into git-ignored
  `.env`. Config: `BLINDSPOT_DEFAULT_MODEL=groq:llama-3.3-70b-versatile`, `JUDGE_MODEL=groq:llama-3.3-70b-versatile`.
- ⚠️ **ANTHROPIC_API_KEY is invalid** — every Anthropic model returns 404 not_found (no model access).
  Groq works great. OpenAI/Gemini/HF keys are blank.
- ✅ 5 mermaid diagrams current + validated (`docs/architecture-flow.html`); build-decisions log updated.
- ✅ **FMEA done (14 modes)** — **P0 tenant-IDOR FIXED & verified** (Project B → 404 on A's golden data);
  P1s fixed: cost-cap enforced in `runEval`, per-example eval resilience, provider timeout (`PROVIDER_TIMEOUT_MS`),
  best-effort trace write, race-safe route auto-create. Typecheck green.
- ▶ **Next = Phase 7 dashboard** (Next.js §10) — the demo surface, against the finished API.

## Pending points
- 🧑 USER: **Loop stays OFF** (paid evals cost money — re-offer only if asked). Fix the **Anthropic key**
  (all models 404) if you want Claude candidates. Optionally set `REDIS_URL` to exercise the BullMQ worker.
- 🤖 AGENT: **Phase 7 dashboard** — build §10 screens (Connect + Approvals + Golden Sets first) as a
  Next.js app in `apps/dashboard` hitting the existing `/v1/*` API. Dark, Linear/Vercel-clean (§10 tokens).
- 🤖 AGENT: **FMEA P2 backlog** (tracked, not blocking): non-transactional approve (status vs live_model);
  drift+auto_approve could pick a pricier model (add cost guard); no rate-limit/pagination (P8); upload size
  cap; model-env-vs-available-key config drift. Also **Phase 4.5** (persist per-example outputs → fill
  recommendation evidence `samples`/`perCriterion`), **Phase 8** observability/Sentry/OTel, first **git commit**.

## API surface (all `/v1`, bearer `bs_live_` key; run: `pnpm --filter @blindspot/gateway bootstrap`)
`POST /chat/completions` · golden: `/routes/:n/golden-sets/{upload,generate}`, `/golden-sets/:id/examples`,
`/golden-examples/:id` · eval: `/routes/:n/{candidates,eval,eval-runs}` · approvals: `/recommend`,
`/recommendations[/:id/{approve,reject}]` · drift/gate: `/routes/:n/{drift-check,drift-events,gate}`.

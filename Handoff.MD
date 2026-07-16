# Handoff.MD — Blindspot
> AGENT: read this fully at session start; open with the pending points below (or ask
> "what would you like to do now?" if none). Update after every major change and when
> ~10% of context remains — then tell the user to start a fresh session with:
> "Refer to Handoff.MD in /Users/anandpareek/Documents/Projects/blindspot and begin".
> Keep this file ONE SCREEN: current state only; history lives in Learning.MD and git.

## Compact summary of previous session
- Backend loop Phases 0–5 built + verified live (Groq + Supabase). Then this session:
  **Phase 7 dashboard (Next.js App Router)** + the **management API** it needed + **cleared the
  FMEA P2 backlog**. First git commits made (repo had none). All verified live.

## Current state
- ✅ **Phases 0–7 code-complete; `pnpm typecheck` green (7 packages incl. dashboard); build green.**
- ✅ **Management API** (`packages/core` logic, thin Hono handlers): `GET /v1/me · /overview · /settings`,
  `GET/PATCH /v1/routes[/:name]`, `DELETE /routes/:name/candidates/:modelRef`, `GET /v1/traces`,
  `GET /v1/drift-events` (timeline), `POST/GET /v1/keys` (mint bs_live_ once), `GET/PUT/DELETE /v1/provider-keys`.
  Every endpoint tenant-scoped by `project_id`; smoke-tested live.
- ✅ **Dashboard** `apps/dashboard` (port 3001, `pnpm start:dashboard`): Overview · Routes & Models (+ route
  detail: candidate pool, policy editor, auto-approve toggle, score chart) · Approvals + evidence drawer ·
  Golden Sets (upload/agent/CRUD/label/promote/versions) · Drift (timeline + version-bump simulator) ·
  Connect · Settings (provider keys, gateway-key mint, cost caps). Sign-in-with-key → **httpOnly cookie**,
  all gateway calls proxied server-side (key never in the browser). All 7 screens render live data; auth
  redirect + empty states confirmed.
- ✅ **FMEA P2 backlog cleared:** transactional approve (in-tx status recheck), drift+auto_approve cost
  guard (never switches to a pricier model), pagination on all list endpoints, golden upload size/row caps,
  startup model↔key validation. Single source of truth for the gateway-key hash moved into core.
- ✅ 6 mermaid diagrams valid + viewer rebuilt (added `05-dashboard-mgmt.mmd`); status flipped to BUILT.
- ✅ **FMEA feature-complete scan done (8 modes, 0 P0 / 0 P1 / 8 P2)** — residual, all Phase-4.5/8-shaped.
- ⚠️ **ANTHROPIC_API_KEY invalid** (404); only **Groq** has a working key. `BLINDSPOT_DEFAULT_MODEL` +
  `JUDGE_MODEL` = `groq:llama-3.3-70b-versatile`. Gemini/OpenAI/HF keys blank.

## Pending points
- 🧑 USER: **Loop stays OFF** (paid eval runs cost money — re-offer only if asked). To populate the demo
  (recommendation + evidence + drift) you must run a paid back-test: generate/upload a golden set → add a
  cheaper candidate (`groq:llama-3.1-8b-instant`) → it back-tests → a Recommendation appears in Approvals →
  approve → live model swaps. I seeded a 2-example uploaded golden set on `route:summarizer` (no LLM cost).
  Fix the Anthropic key if you want Claude candidates. Set `REDIS_URL` to exercise the BullMQ worker.
- 🤖 AGENT (FMEA P2 — tracked, non-blocking): (1) `getOverview`/`listRoutes` load unbounded eval-run
  history — window/aggregate in SQL; (2) dashboard eval buttons spend BYO money with only a per-run cap —
  add per-project budget/confirm (Phase 8 rate-limit); (3) management 500s aren't logged/alerted (Phase 8
  obs); (4) **Phase 4.5** — persist per-example candidate outputs to fill evidence `samples`/`perCriterion`
  (evidence drawer shows an honest note until then); (5) `BLINDSPOT_GATEWAY_URL` unset in prod silently
  targets localhost — fail loud; (6) `updateRoute` policy patch is read-modify-write (last-write-wins).
- 🤖 AGENT: **Phase 8** (queue scale, DLQ, rate limits, OTel/Sentry, k6) then **Phase 9** ship (Render).

## Run it
`set -a; . ./.env; set +a` then: gateway → `pnpm --filter @blindspot/gateway bootstrap` (prints a bs_live_
key ONCE) → `pnpm start:gateway` (:8787). Dashboard → `pnpm start:dashboard` (:3001) → sign in with the key.
`BLINDSPOT_GATEWAY_URL` defaults to http://localhost:8787.

## API surface (all `/v1`, bearer `bs_live_` key)
mgmt: `/me · /overview · /settings · /routes[/:name] (GET,PATCH) · /routes/:n/candidates/:ref (DELETE) ·
/traces · /drift-events · /keys (GET,POST) · /provider-keys[/:provider] (GET,PUT,DELETE)`.
loop: `/chat/completions` · golden `/routes/:n/golden-sets/{upload,generate}`, `/golden-sets/:id/examples`,
`/golden-examples/:id`, `/golden-sets/:id/promote-trace` · eval `/routes/:n/{candidates,eval,eval-runs}` ·
approvals `/routes/:n/recommend`, `/recommendations[/:id/{approve,reject}]` · drift `/routes/:n/{drift-check,drift-events,gate}`.

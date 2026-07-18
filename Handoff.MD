# Handoff.MD — Blindspot
> last-synced: a9cf51b · Read this + Loop.MD at session start. Update before checkpoints and phase ends.
> Continue with: **Refer to Handoff.MD in `/Users/anandpareek/Documents/Projects/Blindspot_v1` and begin**

## Current state
- ✅ Shipped through Phase 7; **7A Connect + Observe** and **7B Registry + Compatibility** are built locally.
- ✅ SDK ingest → workflow/node/execution/span tables → environment-scoped Routes; capture is user-selected (`metadata` default) and workflow optimization is explicit/observe-only by default.
- ✅ Project-scoped `model_registry`: read-only Anthropic/HF/Fireworks adapters, normalized capabilities/pricing/access, Sonnet 4.6 vs Haiku 4.5 picker, exact eligible/excluded reasons and server-side candidate guard.
- ✅ Candidate addition spends nothing and never changes `live_model`; direct eval buttons are disabled until Phase 7C presents an estimate + explicit budget approval.
- ✅ Provider-key replacement/removal invalidates prior catalog verification; in-flight sync locks/rechecks key version; responses have timeout + streaming 5 MB cap.
- ✅ Migration `0002_moaning_sinister_six.sql` applied to dev Postgres. Real Anthropic GET probe: 10 discovered, 2 prototype models, 0 inference tokens; synthetic compatibility/selection/live-model gates pass and test rows are removed.
- ✅ `pnpm typecheck`, production build and 8/8 Mermaid validation pass. Local `BLINDSPOT_EVAL_MODE=inline` bypasses Redis even while its URL remains configured.
- ⚠️ In-app browser bootstrap still fails (`Cannot redefine property: process`); compiled UI verified, click-through not claimed.

## Decisions (approved 2026-07-18)
- Discovery, content capture, experiment eligibility and live-model approval are separate permissions. Technical compatibility permits an experiment; golden quality permits a Recommendation; the user approves every swap.
- Full eval cost is estimated first. Below-full caps use a disclosed reproducible stratified sample; never silently sample or overspend.
- Claude Sonnet 4.6 vs Haiku 4.5 is the prototype picker; HF + Fireworks stay pluggable. Redis is intentionally bypassed locally until Monday.

## Pending — wait for user OK between checkpoints
- 🧑 USER: review Phase 7B. Next checkpoint after OK is **7C Quality + Experiment**: context import, golden lifecycle growth, per-example issues/evidence, cost estimator and transparent stratified sampling.
- 🧑 USER before Redis/live gstpilot use: rotate the exposed Upstash credential and update both projects; never paste the replacement in chat.
- 🤖 Phase 7B FMEA at `a9cf51b` + worktree: 0 P0; P1 — add per-project registry-sync rate limit/cooldown and replace the legacy raw eval API with Phase 7C server-side spend authorization. P2 — provider retry/backoff, registry freshness TTL, bulk upserts/limited registry pagination, persistent regression tests.
- 🤖 Phase 7A P1 backlog remains: batched/scheduled ingest rate limits, dropped-span/DLQ visibility, bounded workflow-history aggregates/N+1 removal. Phase 7D is continuous eval/drift simulation/debug/approval application.
- 🔒 Loop stays `off`; no paid model/eval calls without explicit estimated-cost approval.

## Run
`set -a; . ./.env; set +a` · migrate: `pnpm --filter @blindspot/db db:push` · gateway `pnpm start:gateway` (:8787) · dashboard `pnpm start:dashboard` (:3001) · verify `pnpm typecheck && pnpm build`.

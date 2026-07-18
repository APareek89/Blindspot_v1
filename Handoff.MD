# Handoff.MD — Blindspot
> last-synced: 6b36614 · Read this + Loop.MD at session start. Update before checkpoints and phase ends.
> Continue with: **Refer to Handoff.MD in `/Users/anandpareek/Documents/Projects/Blindspot_v1` and begin**

## Current state
- ✅ Shipped through Phase 7: gateway, eval/recommend/approve/drift loop, golden lifecycle and dashboard (history: git log + Learning.MD).
- ✅ **Phase 7A Connect + Observe built:** `@blindspot/sdk` → authenticated `/v1/ingest/spans` → workflow/node/execution/span tables → environment-scoped Routes → Workflows selection UI.
- ✅ Data controls: `metadata` default, `inputs`, `full`; server applies stricter of project/SDK, redacts credential fields, downgrades >900 KB spans to metadata, bounded one retry.
- ✅ Claude-first prototype catalog: Sonnet 4.6 vs Haiku 4.5. HF adapter retained; Fireworks OpenAI-compatible adapter + encrypted BYO key wiring added.
- ✅ Migration `0001_panoramic_reptil.sql` applied to configured dev Postgres. Typecheck (8 packages), production dashboard build, 7/7 Mermaid validation and real SDK→gateway→DB probe pass.
- ✅ Probe discovered synthetic `gstpilot` nodes (`intake` Haiku; `sonnet-generation` Sonnet/tools) and proved metadata policy stored no content. Test projects/keys removed.
- ✅ Local `.env`: Anthropic and Postgres copied from `creative-QC-agent/.env.local` and verified; Redis command normalized to a TLS URL and verified; Blindspot's own encryption key preserved.
- ⚠️ In-app browser bootstrap fails in this desktop session (`Cannot redefine property: process`); rendered click-through not claimed.

## Decisions (approved 2026-07-18)
- Existing agent connects observe-only through SDK/OTel or through gateway for controlled routing; env vars configure identity but do not magically transmit telemetry.
- User explicitly selects discovered workflows and capture level. Discovery never grants permission to change a model.
- Technical compatibility permits experiments; golden-set quality permits recommendations; every live swap remains approval-gated.
- Full eval cost is estimated first. If the user cap is lower, propose a disclosed reproducible stratified sample; never silently sample or overspend.
- Start Claude Sonnet 4.6 vs Haiku 4.5; keep HF + Fireworks pluggable. Active implementation repo is private `APareek89/Blindspot_v1`.

## Pending — wait for user OK between checkpoints
- 🧑 USER: review Phase 7A diff. Next approved checkpoint is **7B Model Registry + Compatibility** (Anthropic account model sync, node requirements, capability probe, compatible/excluded reasons).
- 🧑 USER before live gstpilot run: rotate the Redis credential in Upstash and update both projects; a malformed-URL diagnostic exposed the old credential in local session output. Do not paste the replacement in chat.
- 🤖 Phase 7A FMEA: 0 P0; P1 backlog — batch/schedule ingestion + per-project rate limit, dropped-span/DLQ visibility, bounded workflow-history aggregates/N+1 removal.
- 🤖 Phase 7C: per-example eval evidence, cost estimator + stratified sampling, live-trace golden suggestions. Phase 7D: continuous eval/drift simulation/approval application.
- 🔒 Loop stays `off`; no paid model/eval calls without explicit estimated-cost approval.

## Run
`set -a; . ./.env; set +a` · migration: `pnpm --filter @blindspot/db db:push` · gateway: `pnpm start:gateway` (:8787) · dashboard: `pnpm start:dashboard` (:3001) · verify: `pnpm typecheck && pnpm build`.

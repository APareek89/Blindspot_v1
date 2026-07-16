# Blindspot — Architecture Flow

> **Status: BUILT & verified live (Phases 0–7, 2026-07-16).** The loop + the Next.js
> dashboard/management surface run against Groq + Supabase. Pending: Phase 4.5 (per-example
> outputs → fill evidence samples/perCriterion) and Phase 8 (queue scale, observability,
> rate limits). These diagrams describe the *real* runtime; update the `.mmd` in the same
> session as any structural change — the git diff of the `.mmd` IS the change highlight.
> Regenerate the standalone viewer with:
> `node /Users/anandpareek/.claude/skills/power-coding/scripts/build-html.mjs docs/mermaid docs/architecture-flow.html`
>
> **Diagrams:** `00` master loop · `01` build decisions · `02` golden sets · `03` eval→recommend ·
> `04` drift→gate · **`05` dashboard + management API** (Phase 7).

## Legend
| Label | Meaning |
|---|---|
| **AGENT · model** | an LLM makes the decision/generation (model named) |
| **FUNCTION** | deterministic code, no model |
| **LIBRARY · name** | an external library does the heavy lifting |
| **DATA · store** | a table/store being read or written |
| **USER** | a decision only the human can make (approve/reject) |

## Gates at a glance
| Gate | Enforcer | Threshold / rule |
|---|---|---|
| Policy (recommend) | FUNCTION | cheapest candidate with judge score **≥ 0.85** (per route) |
| Drift detection | FUNCTION | new score **below** route band (old − margin) → drift event |
| Approval | USER | no `live_model` change without approve — unless route `auto_approve` = ON |
| Auto-approve (opt-in) | FUNCTION | within quality band **AND** cost decreases (default OFF) |
| CI Gate | FUNCTION | regressing candidate vs bar → block the change |

## Master flow — Observe → Eval → Recommend → Approve → Route → Gate
```mermaid
flowchart TD
  A["User agent call<br/>ENTRY · base_url points to gateway, model = route:name"]:::term
  B["Resolve route to approved live_model<br/>FUNCTION<br/>in: route:name · out: concrete model_ref"]:::fn
  C{"Route exists?<br/>FUNCTION"}:::dec
  D["Auto-create route with default policy<br/>FUNCTION · out: routes row"]:::fn
  E["Decrypt user provider key<br/>FUNCTION · AES-256-GCM<br/>in: provider_keys.encrypted_key · out: in-memory key"]:::fn
  F["Live LLM call through user key<br/>LIBRARY · Vercel AI SDK adapter<br/>in: prompt + model_ref · out: completion"]:::data
  G["Write trace<br/>DATA · traces · cost, latency, output"]:::data
  H["Enqueue eval run, async<br/>LIBRARY · BullMQ on Redis"]:::data
  I["Judge scores golden set<br/>AGENT · JUDGE_MODEL<br/>in: outputs vs golden_examples · out: per-criterion scores"]:::agent
  J["Aggregate avg_score, cost, latency<br/>FUNCTION · writes DATA · eval_runs"]:::fn
  K{"Drift? new score below route band<br/>FUNCTION · new below old minus margin"}:::dec
  L{"Policy: cheaper candidate at or above bar?<br/>FUNCTION · cheapest with score at or above 0.85"}:::dec
  M["Create Recommendation with evidence<br/>FUNCTION · per-criterion scores, cost and latency delta, 3 side-by-side samples<br/>DATA · recommendations status = pending"]:::fn
  N["Approvals inbox<br/>DATA · recommendations"]:::data
  O{"User decision<br/>USER · approve or reject"}:::ask
  P["Apply: update routes.live_model<br/>FUNCTION · drift auto-revert ONLY if route.auto_approve"]:::fn
  Q["Store rejection reason, tunes future recs<br/>FUNCTION · DATA · recommendations status = rejected"]:::fn
  R["CI Gate endpoint<br/>FUNCTION · blocks a regressing change<br/>in: candidate eval vs bar · out: pass or fail"]:::fn

  A --> B --> C
  C -- "no" --> D --> E
  C -- "yes" --> E
  E --> F --> G
  F --> H --> I --> J
  J --> K
  J --> L
  K -- "yes, quality dropped" --> M
  L -- "yes, cheaper passes" --> M
  M --> N --> O
  O -- "approve" --> P
  O -- "reject" --> Q
  R -.-> L

  classDef agent fill:#dbeafe,stroke:#2563eb,color:#0b2a5b;
  classDef fn fill:#dcfce7,stroke:#16a34a,color:#052e16;
  classDef dec fill:#f3e8ff,stroke:#9333ea,color:#2a0a4a;
  classDef term fill:#e5e7eb,stroke:#6b7280,color:#111827;
  classDef ask fill:#cffafe,stroke:#0891b2,color:#083344;
  classDef data fill:#ede9fe,stroke:#7c3aed,color:#2a0a4a;
```

## File index (stage → file)
| Stage | Diagram file |
|---|---|
| Master flow | [`docs/mermaid/00-master-flow.mmd`](./mermaid/00-master-flow.mmd) |
| _(planned)_ Gateway resolve + trace | `docs/mermaid/01-gateway.mmd` |
| _(planned)_ Golden-set lifecycle | `docs/mermaid/02-golden-sets.mmd` |
| _(planned)_ Eval + recommendation | `docs/mermaid/03-eval-recommend.mmd` |
| _(planned)_ Drift + CI gate | `docs/mermaid/04-drift-gate.mmd` |

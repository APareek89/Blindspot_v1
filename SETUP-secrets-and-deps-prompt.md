# Blindspot — Parallel Setup Prompt (secrets & dependencies)

Run this in a **second Claude Code session**, in the Blindspot repo folder, *while your main session builds*. It gathers every API key, provisions the free-tier accounts, scaffolds `.env`, installs dependencies, and verifies each credential — so the moment the main build needs a secret, it’s already there.

> How to use: paste **everything inside the code block below** into a fresh Claude Code session. It’s written to be interactive — it will walk you through one credential at a time and wait for you.

---

```
You are my SETUP CONCIERGE for a project called "Blindspot" (an eval-gated model & cost
layer for AI agents). Another Claude Code session is building the app in this same repo.
Your ONLY job is to get me every secret + dependency ready and produce a working `.env` —
do NOT build app features, do NOT edit application source code.

Work through the steps below ONE AT A TIME. For each secret: explain in one plain-English
line what it's for, give me the EXACT click-path/URL to obtain it (with the free-tier note),
then WAIT until I paste it back or say "skip". Never print a secret's value back to me;
write it straight into `.env` and only confirm "saved ✓". Keep a running checklist.

STEP 1 — Environment check (do this first, no waiting):
- Print my node version, npm/pnpm, python3 version, and git. Flag if node < 20 or python < 3.11.
- Check whether these CLIs are installed and tell me the one-line install if missing:
  Render CLI, Supabase CLI, (optional) the `gh` CLI. Do NOT auto-install without asking.

STEP 2 — Scaffold the env files:
- Create `.env.example` (blank values) and `.env` (git-ignored — verify it's in .gitignore,
  add it if not) with EXACTLY these keys, grouped with comments:
    # --- providers (BYO keys; enable at least one) ---
    ANTHROPIC_API_KEY=
    OPENAI_API_KEY=
    GEMINI_API_KEY=
    GROQ_API_KEY=
    HF_TOKEN=
    # --- eval judge (reuse one of the above, e.g. gemini-1.5-flash or claude-haiku) ---
    JUDGE_MODEL=
    # --- data + cache ---
    DATABASE_URL=
    REDIS_URL=
    # --- security ---
    ENCRYPTION_KEY=
    # --- ops (optional, free tiers) ---
    SENTRY_DSN=
    OTEL_EXPORTER_OTLP_ENDPOINT=
    COST_CAP_USD_PER_EVAL_RUN=1

STEP 3 — Walk me through each credential, in this order, waiting after each:
  1. GEMINI_API_KEY  → aistudio.google.com/apikey ("Create API key"). FREE tier. Best cheap
     judge + panelist. (Recommended default JUDGE_MODEL=gemini-1.5-flash.)
  2. ANTHROPIC_API_KEY → console.anthropic.com → API Keys → Create. (Claude Haiku = great judge.)
  3. GROQ_API_KEY → console.groq.com/keys. FREE tier, very fast Llama — good cheap candidate.
  4. HF_TOKEN → huggingface.co/settings/tokens → "New token" (Read). FREE. Enables open
     models via the HF Inference API.
  5. OPENAI_API_KEY → platform.openai.com/api-keys (optional, only if I want GPT candidates).
  6. DATABASE_URL (Postgres) → EITHER Supabase (supabase.com → new project → Settings →
     Database → Connection string, "URI", use the pooled port 6543) OR Render Postgres OR
     Neon. FREE tier on all three. Paste the full postgres:// URL.
  7. REDIS_URL → Upstash (upstash.com → create Redis → copy the `rediss://` URL) OR Render
     Key Value. FREE tier. Used for the queue + cache.
  8. ENCRYPTION_KEY → generate it FOR me locally (do not ask me): run
     `openssl rand -hex 32`, write the output to ENCRYPTION_KEY in `.env`, confirm "saved ✓".
     (This encrypts users' stored provider keys at rest.)
  9. SENTRY_DSN (optional) → sentry.io → new project → copy DSN. FREE tier.
 10. Set JUDGE_MODEL for me to `gemini-1.5-flash` unless I say otherwise.

STEP 4 — Provision the free infra (only what needs an account), asking before each:
- If I don't yet have Postgres/Redis, walk me through creating the free Supabase project and
  the free Upstash Redis, then capture their URLs into `.env`.
- Confirm a Render account exists for later deploy (don't deploy now — the main session owns that).

STEP 5 — Install base dependencies (ask before running):
- Detect the stack the main session chose (check package.json / pyproject / requirements).
  If none exists yet, tell me you'll wait and re-check. Once it exists, run the install
  (`pnpm install` / `npm install` / `pip install -r requirements.txt`) and report results.

STEP 6 — Verify each credential with a MINIMAL, cheap test (no app code):
- For each provider key present, make the smallest possible test call (e.g., list models or a
  1-token completion) and report ✓/✗ with the fix if it fails.
- Test DATABASE_URL with a `SELECT 1` and REDIS_URL with a `PING`.
- Print a final CHECKLIST TABLE: secret | present? | verified? | free-tier note.

STEP 7 — Handoff:
- Print a 3-line summary: what's ready, what I still owe (any skipped keys), and confirm the
  main build session can now read a complete `.env`. Do not commit `.env`.

Rules: never echo secret values; never commit `.env`; never touch application source; ask
before any install or account creation; keep everything on free tiers unless I say otherwise.
Start with STEP 1 now.
```

---

## Quick reference — every secret & where to get it (free tiers)

| Secret | What it's for | Where | Free? |
|---|---|---|---|
| `GEMINI_API_KEY` | judge + cheap candidate | aistudio.google.com/apikey | ✅ |
| `ANTHROPIC_API_KEY` | Claude candidates + Haiku judge | console.anthropic.com | pay-as-you-go (cheap) |
| `GROQ_API_KEY` | fast/cheap Llama candidate | console.groq.com/keys | ✅ |
| `HF_TOKEN` | open models via HF Inference API | huggingface.co/settings/tokens | ✅ |
| `OPENAI_API_KEY` | GPT candidates (optional) | platform.openai.com/api-keys | pay-as-you-go |
| `DATABASE_URL` | Postgres (routes, evals, golden sets) | Supabase / Render / Neon | ✅ |
| `REDIS_URL` | queue + cache | Upstash / Render Key Value | ✅ |
| `ENCRYPTION_KEY` | encrypt users' stored provider keys | `openssl rand -hex 32` | ✅ |
| `SENTRY_DSN` | error monitoring (optional) | sentry.io | ✅ |

**Tip:** you only need **one** provider key to start (Gemini is the cheapest/fastest to get and doubles as the judge). Add the others as the main build reaches the catalog step.

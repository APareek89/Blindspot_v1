import { Copy } from "@/components/Copy";
import { GATEWAY_URL } from "@/lib/api";

export const dynamic = "force-dynamic";

const BASE = `${GATEWAY_URL}/v1`;

const CURL = `curl ${BASE}/chat/completions \\
  -H "Authorization: Bearer $BLINDSPOT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "route:summarizer",
    "messages": [{"role": "user", "content": "Summarize: ..."}]
  }'`;

const PY = `from openai import OpenAI

client = OpenAI(
    base_url="${BASE}",
    api_key="bs_live_…",          # your Blindspot project key
)

resp = client.chat.completions.create(
    model="route:summarizer",     # a call-site alias, not a model
    messages=[{"role": "user", "content": "Summarize: ..."}],
)`;

const JS = `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${BASE}",
  apiKey: process.env.BLINDSPOT_KEY,  // your Blindspot project key
});

const resp = await client.chat.completions.create({
  model: "route:section-writer",       // one alias per call-site
  messages: [{ role: "user", content: "Write the intro..." }],
});`;

const STEPS = [
  {
    n: 1,
    title: "Routes appear",
    body: "Every distinct route:<name> you call shows up under Routes & Models with live cost and quality — auto-created on first traffic.",
  },
  {
    n: 2,
    title: "Give a route a golden set",
    body: "Upload a CSV/JSONL, or let the Golden Set Agent write one from the task. This defines “good” for that route.",
  },
  {
    n: 3,
    title: "Blindspot evals + recommends",
    body: "Add cheaper candidate models; each is back-tested on the golden set. A passing, cheaper model becomes an evidence-backed Recommendation.",
  },
  {
    n: 4,
    title: "You approve — never a silent switch",
    body: "Approve in the Approvals inbox and the route’s live model updates. On a provider version bump, drift is caught and re-surfaced for approval.",
  },
];

function CodeCard({ title, code }: { title: string; code: string }) {
  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 12 }}>
        <span className="card-title">{title}</span>
        <Copy text={code} />
      </div>
      <pre className="code">{code}</pre>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Connect</h1>
          <p>
            Point your app’s model client at the Blindspot gateway and set{" "}
            <span className="model-ref">model</span> to <span className="model-ref">route:&lt;name&gt;</span>.
            Nothing else in your code changes.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row between wrap" style={{ gap: 10 }}>
          <div>
            <div className="card-title">Gateway base URL</div>
            <div className="mono" style={{ marginTop: 6, fontSize: 14 }}>
              {BASE}
            </div>
          </div>
          <Copy text={BASE} label="Copy URL" />
        </div>
      </div>

      <div className="grid cols-2" style={{ marginBottom: 14 }}>
        <CodeCard title="Python (OpenAI SDK)" code={PY} />
        <CodeCard title="JavaScript / TypeScript" code={JS} />
      </div>

      <CodeCard title="curl" code={CURL} />

      <h2 style={{ margin: "26px 0 14px", fontSize: 16 }}>What happens after you connect</h2>
      <div className="grid cols-2">
        {STEPS.map((s) => (
          <div key={s.n} className="card">
            <div className="row" style={{ gap: 10, marginBottom: 8 }}>
              <span className="badge accent">{s.n}</span>
              <span className="card-title">{s.title}</span>
            </div>
            <p className="muted small">{s.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}

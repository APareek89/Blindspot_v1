"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ScoreChart } from "@/components/charts";
import { costPer1k, modelName, ms, qualityPct } from "@/lib/format";
import type {
  ModelCompatibility,
  RouteDetail,
  RouteModelCompatibility,
} from "@/lib/types";
import { addCandidateA, recommendA, removeCandidateA, savePolicy } from "../actions";

function capabilityLabels(model: ModelCompatibility): string[] {
  return [
    ...(model.capabilities.toolCalling ? ["tools"] : []),
    ...(model.capabilities.structuredOutput ? ["structured"] : []),
    ...(model.capabilities.streaming ? ["streaming"] : []),
    ...(model.capabilities.inputModalities.includes("image") ? ["vision"] : []),
    ...(model.capabilities.contextTokens
      ? [`${Math.round(model.capabilities.contextTokens / 1000)}K context`]
      : []),
  ];
}

function priceLabel(model: ModelCompatibility): string {
  if (model.inputUsdPerMillion == null || model.outputUsdPerMillion == null) {
    return "Pricing unavailable";
  }
  return `$${model.inputUsdPerMillion}/$${model.outputUsdPerMillion} per MTok in/out`;
}

export function RouteDetailView({
  detail,
  compatibility,
}: {
  detail: RouteDetail;
  compatibility: RouteModelCompatibility;
}) {
  const route = detail.route.name;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [minScore, setMinScore] = useState(detail.route.policy.minScore);
  const pooledModels = new Set(detail.candidates.map((candidate) => candidate.modelRef));

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string) => {
    setError(null);
    setMsg(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "failed");
      else if (ok) setMsg(ok);
    });
  };

  return (
    <>
      {error && (
        <div className="alert danger" style={{ marginBottom: 14 }}>
          {error}
        </div>
      )}
      {msg && (
        <div className="alert info" style={{ marginBottom: 14 }}>
          {msg}
        </div>
      )}

      <div className="grid cols-2" style={{ marginBottom: 14 }}>
        {/* policy + automation */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>
            Policy &amp; automation
          </div>
          <div className="field">
            <label className="label">Quality bar — cheapest candidate scoring ≥</label>
            <div className="row" style={{ gap: 8 }}>
              <input
                className="input mono"
                type="number"
                min={0}
                max={1}
                step={0.01}
                style={{ width: 110 }}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
              />
              <button
                className="btn"
                disabled={pending || minScore === detail.route.policy.minScore}
                onClick={() => run(() => savePolicy(route, { minScore }), "Policy updated.")}
              >
                Save bar
              </button>
            </div>
          </div>
          <div className="divider" />
          <div className="row between">
            <div>
              <div style={{ fontWeight: 550 }}>Auto-approve</div>
              <div className="muted small" style={{ maxWidth: 320 }}>
                Only fires when a candidate is within the band <em>and</em> cheaper. Default off.
              </div>
            </div>
            <button
              className={`toggle ${detail.route.autoApprove ? "on" : ""}`}
              disabled={pending}
              onClick={() =>
                run(
                  () => savePolicy(route, { autoApprove: !detail.route.autoApprove }),
                  `Auto-approve ${detail.route.autoApprove ? "disabled" : "enabled"}.`,
                )
              }
              aria-label="toggle auto-approve"
            />
          </div>
        </div>

        {/* quick actions */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>
            Actions
          </div>
          <div className="stack" style={{ gap: 10 }}>
            <button
              className="btn"
              disabled
              title="Phase 7C adds the cost estimate and explicit spend approval"
            >
              Re-evaluate · budget setup next
            </button>
            <button
              className="btn"
              disabled={pending}
              onClick={() => run(() => recommendA(route), "Checked policy — see Approvals for any recommendation.")}
            >
              Check for a cheaper model
            </button>
            {detail.pendingRecs > 0 && (
              <Link href="/approvals" className="btn primary">
                {detail.pendingRecs} pending approval{detail.pendingRecs === 1 ? "" : "s"} →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* score over time */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title" style={{ marginBottom: 4 }}>
          Live-model score over time
        </div>
        <div className="card-sub" style={{ marginBottom: 12 }}>
          Dashed line = policy bar. Vertical marks = golden-set version changes.
        </div>
        <ScoreChart series={detail.scoreSeries} bar={detail.route.policy.minScore} />
      </div>

      {/* candidate pool */}
      <div className="card pad-0" style={{ marginBottom: 14 }}>
        <div className="row between" style={{ padding: "14px 16px" }}>
          <span className="card-title">Candidate pool</span>
          <span className="muted small">quality evidence appears after an approved eval</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Source</th>
              <th className="num">Score</th>
              <th className="num">Cost/1k</th>
              <th className="num">Latency</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {detail.candidates.map((c) => (
              <tr key={c.id}>
                <td>
                  <span className="model-ref">{modelName(c.modelRef)}</span>
                  {c.isLive && (
                    <span className="badge pass" style={{ marginLeft: 8 }}>
                      live
                    </span>
                  )}
                </td>
                <td className="muted small">{c.source}</td>
                <td className="num mono">{qualityPct(c.score)}</td>
                <td className="num mono">{costPer1k(c.costPer1kCents)}</td>
                <td className="num mono">{ms(c.latencyMs)}</td>
                <td className="num">
                  <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                    <button
                      className="btn sm"
                      disabled
                      title="Phase 7C adds the cost estimate and explicit spend approval"
                    >
                      Eval · budget first
                    </button>
                    {!c.isLive && (
                      <button
                        className="btn sm danger-ghost"
                        disabled={pending}
                        onClick={() => run(() => removeCandidateA(route, c.modelRef), "Candidate removed.")}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* technically compatible catalog */}
      <div className="card">
        <div className="row between wrap" style={{ marginBottom: 4 }}>
          <span className="card-title">Compatible models</span>
          <span className="badge cyan">Technical gate</span>
        </div>
        <div className="card-sub" style={{ marginBottom: 12 }}>
          Models are matched against the requirements Blindspot observed at this exact agent node.
          Quality is evaluated separately on your golden set.
        </div>

        {compatibility.workflow && (
          <div className="hint" style={{ marginBottom: 12 }}>
            Source: <span className="mono">{compatibility.workflow.name}</span> →{" "}
            <span className="mono">{compatibility.workflow.nodeName}</span>
          </div>
        )}
        {!compatibility.optimizationAllowed && (
          <div className="alert warn" style={{ marginBottom: 12 }}>
            {compatibility.optimizationBlockedReason}.{" "}
            <Link href="/workflows">Choose it under Workflows →</Link>
          </div>
        )}

        {compatibility.eligible.length === 0 ? (
          <div className="alert info" style={{ marginBottom: 12 }}>
            No model is eligible yet. Sync Anthropic under <Link href="/settings">Settings</Link>{" "}
            or inspect the exclusion reasons below.
          </div>
        ) : (
          <div className="grid cols-2" style={{ marginBottom: 14 }}>
            {compatibility.eligible.map((model) => {
              const inPool = pooledModels.has(model.modelRef);
              return (
                <div className="card" key={model.modelRef}>
                  <div className="row between wrap" style={{ marginBottom: 7 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{model.displayName}</div>
                      <div className="mono muted small">{model.modelRef}</div>
                    </div>
                    <span className="badge pass">Compatible</span>
                  </div>
                  <div className="row wrap" style={{ gap: 5, marginBottom: 9 }}>
                    {capabilityLabels(model).map((capability) => (
                      <span className="badge neutral" key={capability}>
                        {capability}
                      </span>
                    ))}
                  </div>
                  <div className="muted small" style={{ marginBottom: 10 }}>
                    {priceLabel(model)}
                  </div>
                  <button
                    className={`btn sm ${inPool ? "" : "primary"}`}
                    disabled={pending || inPool || !compatibility.optimizationAllowed}
                    onClick={() =>
                      run(
                        () => addCandidateA(route, model.modelRef),
                        "Candidate added. No eval spend yet — budget approval comes next.",
                      )
                    }
                  >
                    {inPool ? "In candidate pool" : "Add candidate"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <details>
          <summary style={{ cursor: "pointer", fontWeight: 550 }}>
            Excluded models ({compatibility.excluded.length})
          </summary>
          <div className="stack" style={{ marginTop: 10, gap: 8 }}>
            {compatibility.excluded.map((model) => (
              <div className="card" key={model.modelRef}>
                <div className="row between wrap" style={{ marginBottom: 5 }}>
                  <span style={{ fontWeight: 550 }}>{model.displayName}</span>
                  <span className="badge warn">{model.status.replaceAll("_", " ")}</span>
                </div>
                <ul className="muted small" style={{ paddingLeft: 18 }}>
                  {model.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
        <div className="hint">
          Adding a compatible model only creates an experiment candidate. Blindspot will show the
          full eval estimate and sampling plan before any paid run.
        </div>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ScoreChart } from "@/components/charts";
import { CATALOG } from "@/lib/catalog";
import { costPer1k, modelName, ms, qualityPct } from "@/lib/format";
import type { RouteDetail } from "@/lib/types";
import { addCandidateA, recommendA, removeCandidateA, runEvalA, savePolicy } from "../actions";

export function RouteDetailView({ detail }: { detail: RouteDetail }) {
  const route = detail.route.name;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [minScore, setMinScore] = useState(detail.route.policy.minScore);
  const [newRef, setNewRef] = useState("");
  const [source, setSource] = useState("api");

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
              disabled={pending || !detail.route.liveModel}
              onClick={() => run(() => runEvalA(route), "Re-evaluated the live model.")}
            >
              Re-evaluate live model
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
          <span className="muted small">back-tested on this route’s golden set</span>
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
                    <button className="btn sm" disabled={pending} onClick={() => run(() => runEvalA(route, c.modelRef), "Back-test complete.")}>
                      Eval
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

      {/* add candidate */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>
          Add a candidate from the catalog
        </div>
        <div className="row wrap" style={{ gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 260px" }}>
            <label className="label">Model</label>
            <input
              className="input mono"
              list="catalog"
              placeholder="provider:model"
              value={newRef}
              onChange={(e) => setNewRef(e.target.value)}
            />
            <datalist id="catalog">
              {CATALOG.map((c) => (
                <option key={c.ref} value={c.ref}>
                  {c.label} — {c.note}
                </option>
              ))}
            </datalist>
          </div>
          <div>
            <label className="label">Source</label>
            <select className="select" style={{ width: 130 }} value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="api">api</option>
              <option value="hf">hf</option>
              <option value="aggregator">aggregator</option>
              <option value="local">local</option>
            </select>
          </div>
          <button
            className="btn primary"
            disabled={pending || !newRef.trim()}
            onClick={() =>
              run(
                () => addCandidateA(route, newRef.trim(), source),
                "Candidate added and back-tested — a passing cheaper model appears in Approvals.",
              )
            }
          >
            {pending ? "Back-testing…" : "Add & back-test"}
          </button>
        </div>
        <div className="hint">
          Adding a candidate runs a back-test on the current golden set — this can take a few
          seconds per example.
        </div>
      </div>
    </>
  );
}

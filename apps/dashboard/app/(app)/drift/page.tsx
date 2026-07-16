import Link from "next/link";
import { PageError } from "@/components/PageError";
import { Empty } from "@/components/ui";
import { dateTime, modelName, quality } from "@/lib/format";
import { requireApi } from "@/lib/session";
import { DriftSimulator } from "./DriftSimulator";

export const dynamic = "force-dynamic";

export default async function DriftPage() {
  const client = await requireApi();
  let events;
  let routes;
  try {
    [events, routes] = await Promise.all([
      client.driftEvents({ limit: 100 }).then((r) => r.drift_events),
      client.listRoutes({ limit: 200 }).then((r) => r.routes),
    ]);
  } catch (e) {
    return <PageError error={e} />;
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Drift</h1>
          <p>
            When a provider ships a new model version and quality slips, Blindspot catches it and
            surfaces an approval — it never silently reverts your live model.
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <DriftSimulator routes={routes} />
      </div>

      <div className="card pad-0">
        <div className="row between" style={{ padding: "14px 16px" }}>
          <span className="card-title">Drift timeline</span>
          <span className="muted small">{events.length} event{events.length === 1 ? "" : "s"}</span>
        </div>
        {events.length === 0 ? (
          <Empty emoji="〜" title="No drift detected">
            <p className="muted small">
              Live models are holding their quality band. Use the simulator above to see the flow.
            </p>
          </Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Route</th>
                <th>Model</th>
                <th className="num">Score</th>
                <th>Action</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {events.map((d) => (
                <tr key={d.id}>
                  <td className="muted small">{dateTime(d.createdAt)}</td>
                  <td style={{ fontWeight: 550 }}>{d.routeName}</td>
                  <td>
                    <span className="model-ref">{modelName(d.modelRef)}</span>
                  </td>
                  <td className="num mono">
                    <span className="muted">{quality(d.oldScore)}</span>
                    <span className="muted"> → </span>
                    <span className="delta-up">{quality(d.newScore)}</span>
                  </td>
                  <td>
                    <span className={`badge ${d.action === "auto_approved" ? "warn" : "accent"}`}>
                      {d.action.replace("_", " ")}
                    </span>
                  </td>
                  <td className="num">
                    {d.recommendationId ? (
                      <Link href="/approvals" className="btn-link">
                        View recommendation →
                      </Link>
                    ) : (
                      <span className="muted small">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

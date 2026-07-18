import Link from "next/link";
import { Empty } from "@/components/ui";
import { PageError } from "@/components/PageError";
import { modelName } from "@/lib/format";
import { requireApi } from "@/lib/session";
import type { WorkflowDetail } from "@/lib/types";
import { setWorkflowSelected } from "./actions";

export const dynamic = "force-dynamic";

function requirementLabels(node: WorkflowDetail["nodes"][number]): string[] {
  const r = node.requirements;
  return [
    ...(r.toolCalling ? ["tools"] : []),
    ...(r.structuredOutput ? ["structured output"] : []),
    ...(r.streaming ? ["streaming"] : []),
    ...(r.systemMessages ? ["system prompt"] : []),
    ...(r.inputModalities.some((m) => m !== "text") ? r.inputModalities : []),
  ];
}

export default async function WorkflowsPage() {
  const client = await requireApi();
  let details: WorkflowDetail[];
  try {
    const { workflows } = await client.listWorkflows();
    details = await Promise.all(workflows.map((workflow) => client.getWorkflow(workflow.id)));
  } catch (error) {
    return <PageError error={error} />;
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Workflows</h1>
          <p>
            Blindspot discovers agent flows and their model-powered nodes from telemetry. Select
            the workflows you want to evaluate; discovery alone never changes the live app.
          </p>
        </div>
        <Link href="/connect" className="btn">
          Connect an app
        </Link>
      </div>

      {details.length === 0 ? (
        <div className="card">
          <Empty emoji="⌁" title="Waiting for the first workflow">
            <p className="muted small">
              Add the Blindspot SDK and run one agent request. The workflow and its nodes will
              appear here automatically.
            </p>
          </Empty>
        </div>
      ) : (
        <div className="stack">
          {details.map(({ workflow, nodes }) => {
            const action = setWorkflowSelected.bind(null, workflow.id, !workflow.selected);
            return (
              <section className="card" key={workflow.id}>
                <div className="row between wrap" style={{ marginBottom: 14 }}>
                  <div>
                    <div className="row wrap" style={{ marginBottom: 5 }}>
                      <h2 style={{ fontSize: 17 }}>{workflow.name}</h2>
                      <span className={`badge ${workflow.selected ? "pass" : "neutral"}`}>
                        {workflow.selected ? "Selected for optimization" : "Observe only"}
                      </span>
                      <span className="badge accent">{workflow.environment}</span>
                    </div>
                    <div className="card-sub">
                      {[workflow.framework, workflow.language].filter(Boolean).join(" · ") ||
                        "Custom instrumentation"}
                      {` · ${workflow.executionCount} executions · ${workflow.nodeCount} nodes`}
                    </div>
                  </div>
                  <form action={action}>
                    <button className={`btn ${workflow.selected ? "danger-ghost" : "primary"}`}>
                      {workflow.selected ? "Stop optimizing" : "Select workflow"}
                    </button>
                  </form>
                </div>

                <div className="card pad-0">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Node</th>
                        <th>Observed model</th>
                        <th>Requirements</th>
                        <th className="num">Calls</th>
                        <th className="num">Avg latency</th>
                        <th className="num">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nodes.map((node) => {
                        const requirements = requirementLabels(node);
                        return (
                          <tr key={node.id}>
                            <td>
                              <div style={{ fontWeight: 550 }}>{node.name}</div>
                              <div className="muted small">{node.kind}</div>
                            </td>
                            <td>
                              {node.latestModel ? (
                                <span className="model-ref">{modelName(node.latestModel)}</span>
                              ) : (
                                <span className="muted">—</span>
                              )}
                            </td>
                            <td>
                              <div className="row wrap" style={{ gap: 5 }}>
                                {requirements.length > 0 ? (
                                  requirements.map((requirement) => (
                                    <span className="badge neutral" key={requirement}>
                                      {requirement}
                                    </span>
                                  ))
                                ) : (
                                  <span className="muted small">text</span>
                                )}
                              </div>
                            </td>
                            <td className="num mono">{node.spanCount}</td>
                            <td className="num mono">
                              {node.avgLatencyMs == null ? "—" : `${Math.round(node.avgLatencyMs)} ms`}
                            </td>
                            <td className={`num mono ${node.errorCount > 0 ? "delta-up" : ""}`}>
                              {node.errorCount}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

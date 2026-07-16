import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { ApiError } from "@/lib/api";
import { requireApi } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const client = await requireApi();

  let project = "";
  let pending = 0;
  let gatewayDown = false;
  try {
    const [me, ov] = await Promise.all([client.me(), client.overview()]);
    project = me.project.name;
    pending = ov.pendingApprovals;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/login");
    gatewayDown = true; // connection / server error — pages render their own errors
  }

  return (
    <div className="shell">
      <Sidebar pending={pending} project={project} />
      <main className="main">
        {gatewayDown && (
          <div className="alert danger" style={{ marginBottom: 18 }}>
            Can&apos;t reach the gateway. Start it with{" "}
            <span className="mono">pnpm start:gateway</span> and reload.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

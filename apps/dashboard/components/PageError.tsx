import { ApiError } from "@/lib/api";

/** Renders an API failure inline instead of crashing the page. */
export function PageError({ error }: { error: unknown }) {
  const msg =
    error instanceof ApiError
      ? error.status === 0
        ? "Can't reach the gateway — start it with `pnpm start:gateway`."
        : `${error.message} (${error.status})`
      : error instanceof Error
        ? error.message
        : "Something went wrong.";
  return (
    <div className="card" style={{ borderColor: "var(--danger)" }}>
      <div className="row" style={{ gap: 8 }}>
        <span className="badge danger">Error</span>
        <span>{msg}</span>
      </div>
    </div>
  );
}

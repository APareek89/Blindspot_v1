// A small starter catalog (PRD §5) — the models a route can pick from. Mirrors the
// gateway's price table; users can also type any provider:model ref by hand.
export interface CatalogEntry {
  ref: string;
  label: string;
  source: "api" | "hf" | "aggregator" | "local";
  note: string;
}

export const CATALOG: CatalogEntry[] = [
  {
    ref: "anthropic:claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    source: "api",
    note: "current gstpilot answer model",
  },
  {
    ref: "anthropic:claude-haiku-4-5-20251001",
    label: "Claude Haiku 4.5",
    source: "api",
    note: "lower-cost Claude candidate",
  },
];

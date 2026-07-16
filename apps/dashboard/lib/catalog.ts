// A small starter catalog (PRD §5) — the models a route can pick from. Mirrors the
// gateway's price table; users can also type any provider:model ref by hand.
export interface CatalogEntry {
  ref: string;
  label: string;
  source: "api" | "hf" | "aggregator" | "local";
  note: string;
}

export const CATALOG: CatalogEntry[] = [
  { ref: "groq:llama-3.1-8b-instant", label: "Llama 3.1 8B Instant", source: "api", note: "cheapest, fast" },
  { ref: "groq:llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile", source: "api", note: "strong open model" },
  { ref: "gemini:gemini-1.5-flash-8b", label: "Gemini 1.5 Flash-8B", source: "api", note: "very cheap" },
  { ref: "gemini:gemini-1.5-flash", label: "Gemini 1.5 Flash", source: "api", note: "cheap, capable" },
  { ref: "gemini:gemini-1.5-pro", label: "Gemini 1.5 Pro", source: "api", note: "frontier" },
  { ref: "openai:gpt-4o-mini", label: "GPT-4o mini", source: "api", note: "cheap frontier" },
  { ref: "openai:gpt-4o", label: "GPT-4o", source: "api", note: "frontier" },
  { ref: "anthropic:claude-3-5-haiku-latest", label: "Claude 3.5 Haiku", source: "api", note: "cheap Claude" },
  { ref: "anthropic:claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet", source: "api", note: "frontier Claude" },
];

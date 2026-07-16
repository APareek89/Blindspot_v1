import { parse } from "csv-parse/sync";
import { GoldenExampleInputSchema, type GoldenExampleInput } from "@blindspot/shared";

export type UploadFormat = "csv" | "jsonl";

/**
 * Parse + validate a golden-set upload (PRD §7 seed path).
 * CSV columns / JSONL keys: `input` (required), `reference_output`, `rubric`, `label`.
 * Throws a readable error on the first invalid row so the UI can show a preview.
 */
export function parseGoldenUpload(
  format: UploadFormat,
  data: string,
): GoldenExampleInput[] {
  const rows: unknown[] =
    format === "csv"
      ? (parse(data, { columns: true, skip_empty_lines: true, trim: true }) as unknown[])
      : data
          .split(/\r?\n/)
          .filter((line) => line.trim().length > 0)
          .map((line, i) => {
            try {
              return JSON.parse(line);
            } catch {
              throw new Error(`JSONL parse error on line ${i + 1}`);
            }
          });

  return rows.map((raw, i) => {
    const row = (raw ?? {}) as Record<string, unknown>;
    const parsed = GoldenExampleInputSchema.safeParse({
      input: row.input,
      referenceOutput: row.reference_output ?? row.referenceOutput ?? null,
      rubric: row.rubric ?? null,
      label: row.label ?? "unlabeled",
    });
    if (!parsed.success) {
      throw new Error(`row ${i + 1}: ${parsed.error.issues[0]?.message ?? "invalid"}`);
    }
    return parsed.data;
  });
}

"use server";

import { revalidatePath } from "next/cache";
import { requireApi } from "@/lib/session";

export type Result = { ok: true } | { ok: false; error: string };

/** Simulate a provider version bump that drops the live model's score, to demo drift. */
export async function simulateDrift(route: string, newScore: number): Promise<Result> {
  const client = await requireApi();
  try {
    await client.driftCheck(route, { simulateNewScore: newScore });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "action failed" };
  }
  revalidatePath("/drift");
  revalidatePath("/approvals");
  revalidatePath("/");
  return { ok: true };
}

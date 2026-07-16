"use server";

import { revalidatePath } from "next/cache";
import { requireApi } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(e: unknown): ActionResult {
  return { ok: false, error: e instanceof Error ? e.message : "action failed" };
}

/** Approve → the route's live model switches to the recommended model. */
export async function approveRec(id: string): Promise<ActionResult> {
  const client = await requireApi();
  try {
    await client.approve(id);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/approvals");
  revalidatePath("/");
  revalidatePath("/routes");
  return { ok: true };
}

/** Reject → dismissed; the reason tunes future recommendations. */
export async function rejectRec(id: string, reason?: string): Promise<ActionResult> {
  const client = await requireApi();
  try {
    await client.reject(id, reason?.trim() || undefined);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/approvals");
  revalidatePath("/");
  return { ok: true };
}

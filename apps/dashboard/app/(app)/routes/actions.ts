"use server";

import { revalidatePath } from "next/cache";
import { requireApi } from "@/lib/session";

export type Result = { ok: true } | { ok: false; error: string };

function fail(e: unknown): Result {
  return { ok: false, error: e instanceof Error ? e.message : "action failed" };
}

function bust(route: string) {
  revalidatePath(`/routes/${route}`);
  revalidatePath("/routes");
  revalidatePath("/");
  revalidatePath("/approvals");
}

export async function savePolicy(
  route: string,
  patch: { minScore?: number; autoApprove?: boolean },
): Promise<Result> {
  const client = await requireApi();
  try {
    await client.patchRoute(route, patch);
  } catch (e) {
    return fail(e);
  }
  bust(route);
  return { ok: true };
}

export async function addCandidateA(
  route: string,
  modelRef: string,
  source: string,
): Promise<Result> {
  const client = await requireApi();
  try {
    await client.addCandidate(route, { modelRef, source });
  } catch (e) {
    return fail(e);
  }
  bust(route);
  return { ok: true };
}

export async function removeCandidateA(route: string, modelRef: string): Promise<Result> {
  const client = await requireApi();
  try {
    await client.removeCandidate(route, modelRef);
  } catch (e) {
    return fail(e);
  }
  bust(route);
  return { ok: true };
}

export async function runEvalA(route: string, modelRef?: string): Promise<Result> {
  const client = await requireApi();
  try {
    await client.runEval(route, modelRef);
  } catch (e) {
    return fail(e);
  }
  bust(route);
  return { ok: true };
}

export async function recommendA(route: string): Promise<Result> {
  const client = await requireApi();
  try {
    await client.recommend(route);
  } catch (e) {
    return fail(e);
  }
  bust(route);
  return { ok: true };
}

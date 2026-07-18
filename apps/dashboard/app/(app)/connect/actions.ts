"use server";

import { revalidatePath } from "next/cache";
import { requireApi } from "@/lib/session";
import type { CaptureMode } from "@/lib/types";

export async function setCaptureMode(mode: CaptureMode, _formData: FormData): Promise<void> {
  const client = await requireApi();
  await client.setDataControls(mode);
  revalidatePath("/connect");
}

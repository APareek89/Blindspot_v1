"use server";

import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setKeyCookie } from "@/lib/session";

/** Validate a bs_live_ key against the gateway, then set the session cookie. */
export async function signIn(_prev: string | null, formData: FormData): Promise<string | null> {
  const key = String(formData.get("key") ?? "").trim();
  if (!key.startsWith("bs_live_")) {
    return "That doesn't look like a project key — it should start with bs_live_.";
  }
  try {
    await api(key).me();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return "That key wasn't recognized by the gateway.";
    if (e instanceof ApiError && e.status === 0) return "Can't reach the gateway. Is it running?";
    return "Sign-in failed — please try again.";
  }
  await setKeyCookie(key);
  redirect("/");
}

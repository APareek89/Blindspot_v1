import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api, type Client } from "./api";

const COOKIE = "bs_key";

/** The project key from the httpOnly cookie, or null. Server-only. */
export async function getKey(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

export async function setKeyCookie(key: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearKeyCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Get an API client for the signed-in project, or redirect to the sign-in screen. */
export async function requireApi(): Promise<Client> {
  const key = await getKey();
  if (!key) redirect("/login");
  return api(key);
}

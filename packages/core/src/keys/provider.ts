import { and, desc, eq } from "drizzle-orm";
import { getDb, providerKeys } from "@blindspot/db";
import { PROVIDERS, decryptSecret, encryptSecret, type Provider } from "@blindspot/shared";

/** Fetch + decrypt a project's BYO key for a provider (in-memory only), or null. */
export async function getProviderKey(
  projectId: string,
  provider: Provider,
): Promise<string | null> {
  const row = (
    await getDb()
      .select({ encryptedKey: providerKeys.encryptedKey })
      .from(providerKeys)
      .where(and(eq(providerKeys.projectId, projectId), eq(providerKeys.provider, provider)))
      .limit(1)
  )[0];
  return row ? decryptSecret(row.encryptedKey) : null;
}

/** True if `p` is a provider we support (guards untrusted input from the API). */
export function isProvider(p: string): p is Provider {
  return (PROVIDERS as readonly string[]).includes(p);
}

/**
 * List which providers a project has a key for — provider + when it was saved.
 * NEVER returns the encrypted blob or the plaintext value (PRD §5, §10 Settings).
 */
export async function listProviderKeys(projectId: string) {
  return getDb()
    .select({ provider: providerKeys.provider, createdAt: providerKeys.createdAt })
    .from(providerKeys)
    .where(eq(providerKeys.projectId, projectId))
    .orderBy(desc(providerKeys.createdAt));
}

/** Store (or replace) a project's BYO key for a provider, encrypted at rest (AES-256-GCM). */
export async function setProviderKey(projectId: string, provider: Provider, rawValue: string) {
  const encryptedKey = encryptSecret(rawValue);
  const row = (
    await getDb()
      .insert(providerKeys)
      .values({ projectId, provider, encryptedKey })
      .onConflictDoUpdate({
        target: [providerKeys.projectId, providerKeys.provider],
        set: { encryptedKey },
      })
      .returning({ provider: providerKeys.provider, createdAt: providerKeys.createdAt })
  )[0]!;
  return row; // { provider, createdAt } — never the value
}

/** Remove a project's key for a provider. Returns true if a row was deleted. */
export async function deleteProviderKey(projectId: string, provider: Provider): Promise<boolean> {
  const deleted = await getDb()
    .delete(providerKeys)
    .where(and(eq(providerKeys.projectId, projectId), eq(providerKeys.provider, provider)))
    .returning({ id: providerKeys.id });
  return deleted.length > 0;
}

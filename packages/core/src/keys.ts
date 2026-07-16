import { and, eq } from "drizzle-orm";
import { getDb, providerKeys } from "@blindspot/db";
import { decryptSecret, type Provider } from "@blindspot/shared";

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

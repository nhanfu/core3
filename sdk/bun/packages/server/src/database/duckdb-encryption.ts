export type DuckDbEncryptionOptions = {
  key: string;
  cipher: 'GCM' | 'CBC' | 'CTR';
  keyId?: string;
};

export function resolveDuckDbEncryption(
  storage: any,
  env: Record<string, string | undefined>,
  serviceId: string,
): DuckDbEncryptionOptions | undefined {
  const encryption = storage?.encryption;
  if (!encryption || String(encryption.enabled || 'false').toLowerCase() !== 'true') return undefined;
  const keyEnv = String(encryption.key_env || `CORE3_${serviceId.toUpperCase()}_DB_ENCRYPTION_KEY`);
  const key = env[keyEnv];
  if (!key) throw new Error(`DuckDB encryption is enabled for ${serviceId}, but ${keyEnv} is not set`);
  const cipher = String(encryption.cipher || 'GCM').toUpperCase();
  if (!['GCM', 'CBC', 'CTR'].includes(cipher)) throw new Error(`Unsupported DuckDB encryption cipher for ${serviceId}: ${cipher}`);
  return { key, cipher: cipher as DuckDbEncryptionOptions['cipher'], keyId: encryption.key_id ? String(encryption.key_id) : undefined };
}

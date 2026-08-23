import { SignJWT, jwtVerify, generateKeyPair, exportJWK, exportPKCS8, exportSPKI, importPKCS8, importSPKI, type JWTPayload, type KeyLike } from 'jose';
import { readFile, writeFile } from 'node:fs/promises';

export const DEFAULT_AUTH_JWT_SECRET = 'core3-auth-dev-secret-32chars!!!!';

export function authJwtSecret(env: Record<string, string | undefined>): Uint8Array {
  return new TextEncoder().encode(env.AUTH_JWT_SECRET || env.JWT_SECRET || DEFAULT_AUTH_JWT_SECRET);
}

export async function signAuthJwt(claims: Record<string, unknown>, secret: Uint8Array): Promise<string> {
  return new SignJWT(claims as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

export async function verifyAuthJwt<T extends object>(token: string, secret: Uint8Array): Promise<T | null> {
  try {
    const result = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return result.payload as T;
  } catch {
    return null;
  }
}

type StoredAuthKey = { kid: string; privateKey: string; publicKey: string; status?: 'active' | 'published' };
type AuthKey = { kid: string; privateKey: KeyLike; publicKey: KeyLike; status: 'active' | 'published' };

export class AuthJwtKeyRing {
  private constructor(private readonly path: string, private readonly keys: Map<string, AuthKey>, private activeKid: string) {}

  static async load(path: string): Promise<AuthJwtKeyRing> {
    try {
      const stored = JSON.parse(await readFile(path, 'utf8')) as StoredAuthKey[] | StoredAuthKey;
      const records = Array.isArray(stored) ? stored : [stored];
      const keys = new Map<string, AuthKey>();
      for (const record of records) {
        keys.set(record.kid, { kid: record.kid, privateKey: await importPKCS8(record.privateKey, 'EdDSA', { extractable: true }), publicKey: await importSPKI(record.publicKey, 'EdDSA', { extractable: true }), status: record.status || (record.kid === records[records.length - 1]?.kid ? 'active' : 'published') });
      }
      const active = records.find((record) => record.status === 'active') || records[records.length - 1];
      if (!active) throw new Error('Auth key ring is empty');
      return new AuthJwtKeyRing(path, keys, active.kid);
    } catch {
      const keys = await generateKeyPair('EdDSA', { extractable: true });
      const kid = `client-${crypto.randomUUID()}`;
      const ring = new AuthJwtKeyRing(path, new Map([[kid, { kid, privateKey: keys.privateKey, publicKey: keys.publicKey, status: 'active' }]]), kid);
      await ring.persist();
      return ring;
    }
  }

  get kid(): string { return this.activeKid; }
  async rotate(kid = `client-${crypto.randomUUID()}`): Promise<string> {
    const keys = await generateKeyPair('EdDSA', { extractable: true });
    const previous = this.keys.get(this.activeKid);
    if (previous) previous.status = 'published';
    this.keys.set(kid, { kid, privateKey: keys.privateKey, publicKey: keys.publicKey, status: 'active' });
    this.activeKid = kid;
    await this.persist();
    return kid;
  }
  async retire(kid: string): Promise<void> { if (kid === this.activeKid) throw new Error('Cannot retire the active client signing key'); this.keys.delete(kid); await this.persist(); }
  async sign(claims: Record<string, unknown>): Promise<string> { const key = this.keys.get(this.activeKid); if (!key) throw new Error('No active client signing key'); return new SignJWT(claims as JWTPayload).setProtectedHeader({ alg: 'EdDSA', kid: key.kid, typ: 'JWT' }).setIssuer('auth').setAudience('core3').setIssuedAt().setExpirationTime('8h').sign(key.privateKey); }
  async verify<T extends object>(token: string): Promise<T | null> { try { const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString()) as { kid?: string }; const key = header.kid ? this.keys.get(header.kid) : undefined; if (!key) return null; const result = await jwtVerify(token, key.publicKey, { algorithms: ['EdDSA'], issuer: 'auth', audience: 'core3' }); return result.payload as T; } catch { return null; } }
  async jwks(): Promise<Record<string, unknown>[]> { return Promise.all([...this.keys.values()].map(async (key) => ({ ...(await exportJWK(key.publicKey)), kid: key.kid, alg: 'EdDSA', use: 'sig', purpose: 'client_access' }))); }
  async jwk(): Promise<Record<string, unknown>> { const keys = await this.jwks(); return keys.find((key) => key.kid === this.activeKid)!; }
  private async persist(): Promise<void> { const stored: StoredAuthKey[] = []; for (const key of this.keys.values()) stored.push({ kid: key.kid, status: key.status, privateKey: await exportPKCS8(key.privateKey), publicKey: await exportSPKI(key.publicKey) }); await writeFile(this.path, JSON.stringify(stored, null, 2), { mode: 0o600 }); }
}

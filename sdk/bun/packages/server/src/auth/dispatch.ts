import { SignJWT, jwtVerify, generateKeyPair, exportJWK, exportPKCS8, exportSPKI, importPKCS8, importSPKI, decodeProtectedHeader, type KeyLike } from 'jose';
import { readFile, writeFile } from 'node:fs/promises';

export type DispatchClaims = {
  sub?: string; sid?: string; did?: string; jti?: string; parent_jti?: string;
  aud: string; source_service: string; command_class: string; permissions: string[];
  authz_version: number; user_security_revision?: number; session_revision?: number;
  correlation_id?: string; causation_id?: string; dispatch_id: string; token_type: 'internal_dispatch';
};

export class DispatchKeyRing {
  private constructor(private readonly privateKey: KeyLike, private readonly publicKey: KeyLike, readonly kid: string) {}
  static async create(kid = `dispatch-${crypto.randomUUID()}`): Promise<DispatchKeyRing> { const keys = await generateKeyPair('EdDSA', { extractable: true }); return new DispatchKeyRing(keys.privateKey, keys.publicKey, kid); }
  static async load(path: string): Promise<DispatchKeyRing> {
    try {
      const stored = JSON.parse(await readFile(path, 'utf8')) as { kid: string; privateKey: string; publicKey: string };
      return new DispatchKeyRing(await importPKCS8(stored.privateKey, 'EdDSA', { extractable: true }), await importSPKI(stored.publicKey, 'EdDSA', { extractable: true }), stored.kid);
    } catch {
      const ring = await DispatchKeyRing.create();
      await writeFile(path, JSON.stringify({ kid: ring.kid, privateKey: await exportPKCS8(ring.privateKey), publicKey: await exportSPKI(ring.publicKey) }), { mode: 0o600 });
      return ring;
    }
  }
  static async fromStored(stored: { kid: string; privateKey: string; publicKey: string }): Promise<DispatchKeyRing> { return new DispatchKeyRing(await importPKCS8(stored.privateKey, 'EdDSA', { extractable: true }), await importSPKI(stored.publicKey, 'EdDSA', { extractable: true }), stored.kid); }
  async privateKeyPem(): Promise<string> { return exportPKCS8(this.privateKey); }
  async publicKeyPem(): Promise<string> { return exportSPKI(this.publicKey); }
  async jwk(): Promise<Record<string, unknown>> { return { ...(await exportJWK(this.publicKey)), kid: this.kid, alg: 'EdDSA', use: 'sig' }; }
  async issue(claims: Omit<DispatchClaims, 'token_type' | 'dispatch_id'>, expiresInSeconds = 60): Promise<string> { return new SignJWT({ ...claims, token_type: 'internal_dispatch', dispatch_id: crypto.randomUUID() }).setProtectedHeader({ alg: 'EdDSA', kid: this.kid, typ: 'JWT' }).setIssuer('auth').setAudience(claims.aud).setIssuedAt().setExpirationTime(`${expiresInSeconds}s`).sign(this.privateKey); }
  async verify<T extends DispatchClaims>(token: string, audience: string, expected?: Partial<Pick<DispatchClaims, 'source_service' | 'command_class'>>): Promise<T> { const { payload } = await jwtVerify(token, this.publicKey, { algorithms: ['EdDSA'], issuer: 'auth', audience }); if (payload.token_type !== 'internal_dispatch' || !Array.isArray(payload.permissions)) throw new Error('Invalid dispatch token'); for (const [key, value] of Object.entries(expected || {})) if (payload[key] !== value) throw new Error(`Invalid dispatch ${key}`); return payload as T; }
}

export class DispatchSigningKeyRing {
  private readonly keys = new Map<string, DispatchKeyRing>();
  private activeKid!: string;
  private constructor(private readonly persistencePath?: string) {}
  static async create(): Promise<DispatchSigningKeyRing> { const ring = new DispatchSigningKeyRing(); await ring.rotate(); return ring; }
  static async load(path: string): Promise<DispatchSigningKeyRing> {
    const ring = new DispatchSigningKeyRing(path);
    try {
      const stored = JSON.parse(await readFile(path, 'utf8')) as { activeKid: string; keys: Array<{ kid: string; privateKey: string; publicKey: string }> };
      for (const record of stored.keys || []) ring.keys.set(record.kid, await DispatchKeyRing.fromStored(record));
      ring.activeKid = stored.activeKid;
      if (!ring.keys.has(ring.activeKid)) throw new Error('Dispatch key ring has no active key');
      return ring;
    } catch {
      await ring.rotate();
      await ring.persist(path);
      return ring;
    }
  }
  async rotate(kid = `dispatch-${crypto.randomUUID()}`): Promise<string> { const key = await DispatchKeyRing.create(kid); this.keys.set(kid, key); this.activeKid = kid; if (this.persistencePath) await this.persist(this.persistencePath); return kid; }
  retire(kid: string): void { if (kid === this.activeKid) throw new Error('Cannot retire the active dispatch signing key'); this.keys.delete(kid); if (this.persistencePath) void this.persist(this.persistencePath); }
  async issue(claims: Omit<DispatchClaims, 'token_type' | 'dispatch_id'>, expiresInSeconds = 60): Promise<string> { const key = this.keys.get(this.activeKid); if (!key) throw new Error('No active dispatch signing key'); return key.issue(claims, expiresInSeconds); }
  async verify<T extends DispatchClaims>(token: string, audience: string, expected?: Partial<Pick<DispatchClaims, 'source_service' | 'command_class'>>): Promise<T> { const { kid } = decodeProtectedHeader(token); const key = kid ? this.keys.get(kid) : undefined; if (!key) throw new Error('Unknown dispatch signing key'); return key.verify<T>(token, audience, expected); }
  async jwks(): Promise<{ keys: Record<string, unknown>[] }> { return { keys: await Promise.all([...this.keys.values()].map((key) => key.jwk())) }; }
  async persist(path: string): Promise<void> { const keys = []; for (const [kid, key] of this.keys) keys.push({ kid, privateKey: await key.privateKeyPem(), publicKey: await key.publicKeyPem() }); await writeFile(path, JSON.stringify({ activeKid: this.activeKid, keys }, null, 2), { mode: 0o600 }); }
}

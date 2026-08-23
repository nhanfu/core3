import { createHmac, randomBytes } from 'node:crypto';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';

export type RefreshFamily = { familyId: string; subject: string; deviceId: string; generation: number; currentHash: string; revoked: boolean; expiresAt: number };
export class RefreshTokenStore {
  private readonly families = new Map<string, RefreshFamily>();
  private readonly history = new Map<string, Set<string>>();
  constructor(private readonly secret: Uint8Array, private readonly now: () => number = Date.now, private readonly statePath?: string) { this.load(); }
  create(subject: string, deviceId: string, lifetimeMs = 30 * 24 * 60 * 60 * 1000): { token: string; family: RefreshFamily } { const familyId = crypto.randomUUID(); const token = this.rawToken(); const family = { familyId, subject, deviceId, generation: 0, currentHash: this.hash(token), revoked: false, expiresAt: this.now() + lifetimeMs }; this.families.set(familyId, family); this.persist(); return { token, family: { ...family } }; }
  rotate(token: string): { token: string; family: RefreshFamily } {
    const hash = this.hash(token); const family = [...this.families.values()].find((candidate) => candidate.currentHash === hash || this.history.get(candidate.familyId)?.has(hash));
    if (!family || family.revoked || family.expiresAt <= this.now()) throw Object.assign(new Error('Refresh token is invalid'), { code: 'INVALID_REFRESH_TOKEN', status: 401 });
    if (family.currentHash !== hash) { family.revoked = true; this.persist(); throw Object.assign(new Error('Refresh token reuse detected'), { code: 'REFRESH_REUSE', status: 401 }); }
    const history = this.history.get(family.familyId) || new Set<string>(); history.add(hash); this.history.set(family.familyId, history); const next = this.rawToken(); family.generation += 1; family.currentHash = this.hash(next); this.persist(); return { token: next, family: { ...family } };
  }
  revokeFamily(familyId: string): void { const family = this.families.get(familyId); if (family) family.revoked = true; this.persist(); }
  private rawToken(): string { return randomBytes(32).toString('base64url'); }
  private hash(token: string): string { return createHmac('sha256', this.secret).update(token).digest('hex'); }
  private load(): void { if (!this.statePath) return; try { const state = JSON.parse(readFileSync(this.statePath, 'utf8')) as { families?: RefreshFamily[]; history?: Array<[string, string[]]> }; for (const family of state.families || []) this.families.set(family.familyId, family); for (const [familyId, hashes] of state.history || []) this.history.set(familyId, new Set(hashes)); } catch { /* first start */ } }
  private persist(): void { if (!this.statePath) return; try { writeFileSync(`${this.statePath}.tmp`, JSON.stringify({ families: [...this.families.values()], history: [...this.history.entries()].map(([id, hashes]) => [id, [...hashes]]) })); renameSync(`${this.statePath}.tmp`, this.statePath); } catch { /* durable auth DB remains authoritative */ } }
}

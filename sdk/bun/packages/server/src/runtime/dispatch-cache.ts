export type DispatchCacheKey = {
  did?: string;
  sid?: string;
  clientJti?: string;
  targetService: string;
  commandClass: string;
  userSecurityRevision?: number;
  sessionRevision?: number;
  authzVersion?: number;
};

type Entry = { token: string; expiresAt: number; key: DispatchCacheKey };

function stableKey(key: DispatchCacheKey): string {
  return [key.did || '', key.sid || '', key.clientJti || '', key.targetService, key.commandClass,
    key.userSecurityRevision ?? '', key.sessionRevision ?? '', key.authzVersion ?? ''].join('|');
}

function tokenExpiry(token: string): number | undefined {
  try {
    const payload = token.split('.')[1];
    if (!payload) return undefined;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: number };
    return typeof claims.exp === 'number' ? claims.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

export class DispatchTokenCache {
  private readonly entries = new Map<string, Entry>();
  private readonly flights = new Map<string, Promise<string>>();
  constructor(private readonly maxEntries = 2048, private readonly skewMs = 5000, private readonly now: () => number = Date.now) {}

  async getOrCreate(key: DispatchCacheKey, mint: () => Promise<string>, clientExpiresAt?: number): Promise<string> {
    const id = stableKey(key);
    const current = this.entries.get(id);
    if (current && current.expiresAt > this.now()) return current.token;
    const existing = this.flights.get(id);
    if (existing) return existing;
    const flight = (async () => {
      try {
        const token = await mint();
        const tokenExpiryAt = tokenExpiry(token);
        const expiresAt = Math.max(0, Math.min(tokenExpiryAt ?? this.now() + 60_000, clientExpiresAt ?? Infinity) - this.skewMs);
        this.entries.set(id, { token, expiresAt, key: { ...key } });
        while (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value!);
        return token;
      } finally {
        this.flights.delete(id);
      }
    })();
    this.flights.set(id, flight);
    return flight;
  }

  invalidate(predicate: (key: DispatchCacheKey) => boolean): void {
    for (const [id, entry] of this.entries) if (predicate(entry.key)) this.entries.delete(id);
  }

  clear(): void { this.entries.clear(); }
  size(): number { return this.entries.size; }
}

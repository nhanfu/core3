export type IdempotencyEntry = { key: string; state: 'in_flight' | 'completed'; response?: unknown; createdAt: number };
export class IdempotencyInbox {
  private readonly entries = new Map<string, IdempotencyEntry>();
  constructor(private readonly maxEntries = 10000, private readonly ttlMs = 24 * 60 * 60 * 1000, private readonly now: () => number = Date.now) {}
  begin(key: string): { fresh: boolean; response?: unknown } { this.prune(); const existing = this.entries.get(key); if (existing) return { fresh: false, response: existing.response }; this.entries.set(key, { key, state: 'in_flight', createdAt: this.now() }); while (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value!); return { fresh: true }; }
  complete(key: string, response: unknown): void { const entry = this.entries.get(key); if (entry) this.entries.set(key, { ...entry, state: 'completed', response }); }
  fail(key: string): void { const entry = this.entries.get(key); if (entry?.state === 'in_flight') this.entries.delete(key); }
  has(key: string): boolean { this.prune(); return this.entries.has(key); }
  private prune(): void { const cutoff = this.now() - this.ttlMs; for (const [key, entry] of this.entries) if (entry.createdAt < cutoff) this.entries.delete(key); }
}

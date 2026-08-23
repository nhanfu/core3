export type RateLimitRule = { scope: 'ip' | 'user'; routeClass?: string; service?: string; max: number; windowMs: number };
export type RateLimitResult = { allowed: boolean; limit: number; remaining: number; resetAt: number; retryAfter: number };
type Counter = { startedAt: number; count: number; lastUsedAt: number };
export class GatewayRateLimiter {
  private readonly counters = new Map<string, Counter>();
  private readonly accepted = new Map<string, number>();
  private readonly rejected = new Map<string, number>();
  private evictions = 0;
  constructor(private readonly rules: RateLimitRule[], private readonly maxKeys = 10000, private readonly now: () => number = Date.now) {}
  check(input: { ip: string; userId?: string; routeClass?: string; service?: string }): RateLimitResult {
    const rule = this.rules.filter((r) => r.scope === 'ip' ? Boolean(input.ip) : Boolean(input.userId)).filter((r) => !r.routeClass || r.routeClass === input.routeClass).filter((r) => !r.service || r.service === input.service).sort((a, b) => (Number(Boolean(input.userId)) * (Number(b.scope === 'user') - Number(a.scope === 'user'))) + (Number(Boolean(b.routeClass)) + Number(Boolean(b.service))) - (Number(Boolean(a.routeClass)) + Number(Boolean(a.service))))[0];
    if (!rule) return { allowed: true, limit: 0, remaining: 0, resetAt: this.now(), retryAfter: 0 };
    const key = `${rule.scope}:${rule.routeClass || ''}:${rule.service || ''}:${rule.scope === 'ip' ? input.ip : input.userId}`;
    const now = this.now(); let counter = this.counters.get(key); if (!counter || now >= counter.startedAt + rule.windowMs) counter = { startedAt: now, count: 0, lastUsedAt: now };
    counter.count += 1; counter.lastUsedAt = now; this.counters.set(key, counter); while (this.counters.size > this.maxKeys) {
      const oldest = [...this.counters.entries()].sort((left, right) => left[1].lastUsedAt - right[1].lastUsedAt)[0]?.[0];
      if (!oldest) break;
      this.counters.delete(oldest);
      this.evictions += 1;
    }
    const allowed = counter.count <= rule.max;
    const metricKey = `${rule.scope}:${rule.routeClass || ''}:${rule.service || ''}`;
    const metrics = allowed ? this.accepted : this.rejected;
    metrics.set(metricKey, (metrics.get(metricKey) || 0) + 1);
    const resetAt = counter.startedAt + rule.windowMs; return { allowed, limit: rule.max, remaining: Math.max(0, rule.max - counter.count), resetAt, retryAfter: Math.max(0, resetAt - now) };
  }
  size(): number { return this.counters.size; }
  metrics(): { evictions: number; accepted: Record<string, number>; rejected: Record<string, number> } { return { evictions: this.evictions, accepted: Object.fromEntries(this.accepted), rejected: Object.fromEntries(this.rejected) }; }
}

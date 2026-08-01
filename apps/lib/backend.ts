import vm from 'node:vm';
import type { IAuthProvider, User } from './interfaces/auth';
import type { DataSource } from './interfaces/datasource';

interface DbAdapter {
  query(sql: string, params?: Record<string, unknown>): Promise<unknown[]>;
}

interface RunAdapters {
  query?: (sql: string, params?: Record<string, unknown>) => Promise<unknown[]>;
  ws?: (url: string) => { send: (d: string) => void; close: () => void };
  fetch?: (url: string, opts?: unknown) => Promise<unknown>;
}

interface ActionDef {
  source: 'generated' | 'custom';
  fn: unknown;
}

const TTL_RE = /^(\d+)([smh])$/;
const TTL_MS: Record<string, number> = { s: 1000, m: 60000, h: 3600000 };

function parseTtl(ttl: string): number {
  const m = ttl.match(TTL_RE);
  return m ? parseInt(m[1]) * (TTL_MS[m[2]] || 1000) : 60000;
}

export class DataSourceRunner {
  private cache = new Map<string, { data: unknown[]; expires: number }>();
  private auth: IAuthProvider;
  private defaultDb?: DbAdapter;

  constructor(auth: IAuthProvider, db?: { query?: DbAdapter['query'] }) {
    this.auth = auth;
    if (db?.query) this.defaultDb = { query: db.query };
  }

  getAction(ds: DataSource, actionId: string): ActionDef | undefined {
    const dot = actionId.lastIndexOf('.');
    if (dot === -1) return undefined;
    const dsId = actionId.slice(0, dot);
    const op = actionId.slice(dot + 1);
    if (dsId !== ds.id) return undefined;

    if (op === 'create' && ds.create) return { source: 'custom', fn: ds.create };
    if (op === 'update' && ds.update) return { source: 'custom', fn: ds.update };
    if (op === 'delete' && ds.delete) return { source: 'custom', fn: ds.delete };

    const crud = ds.crud;
    if (!crud) return undefined;
    const allowed: string[] = crud === true ? ['create', 'update', 'delete'] : (crud as string[]);
    if (!allowed.includes(op)) return undefined;
    return { source: 'generated', fn: null };
  }

  async run(
    ds: DataSource,
    user: User,
    params: Record<string, unknown>,
    adapters?: RunAdapters,
  ): Promise<{ data: unknown[]; meta: { total: number; page: number; pageSize: number } }> {
    // Role gate
    if (ds.roles?.length) {
      const ok = ds.roles.some(r => user.roles.includes(r));
      if (!ok) {
        throw Object.assign(
          new Error(`Requires one of roles: ${ds.roles.join(', ')}`),
          { status: 403 },
        );
      }
    }

    // Permission gate (synchronous)
    const hasPerm = this.auth.hasPermission(user, ds.permission);
    if (!hasPerm) {
      throw Object.assign(
        new Error(`Missing permission: ${ds.permission}`),
        { status: 403 },
      );
    }

    // WebSocket protocol (synchronous path — must stay before first await)
    if (ds.protocol === 'websocket') {
      adapters?.ws?.('ws://localhost');
      return { data: [], meta: { total: 0, page: 1, pageSize: 25 } };
    }

    // Security context + param merging
    const secCtx = this.auth.getSecurityContext(user);
    const merged: Record<string, unknown> = { ...params, allowed_branches: secCtx.allowedBranches };

    // Cache read
    const cacheKey = JSON.stringify({ id: ds.id, params: merged });
    if (ds.cache) {
      const entry = this.cache.get(cacheKey);
      if (entry && entry.expires > Date.now()) {
        return { data: entry.data, meta: { total: entry.data.length, page: 1, pageSize: 25 } };
      }
    }

    let data: unknown[];

    // Script datasource — vm sandbox blocks process/require etc.
    if (ds.language === 'javascript' && ds.script) {
      const ctx = { user, params: merged };
      const wrapped = `(function(ctx) { "use strict"; ${ds.script} })(ctx)`;
      const result = vm.runInNewContext(wrapped, { ctx });
      data = Array.isArray(result) ? result : await result;
    } else if (ds.query) {
      const queryFn = adapters?.query ?? this.defaultDb?.query.bind(this.defaultDb);
      if (queryFn) {
        data = await queryFn(ds.query, merged);
      } else {
        data = [];
      }
    } else {
      data = [];
    }

    // Cache write
    if (ds.cache) {
      const ttlMs = parseTtl(ds.cache.ttl);
      this.cache.set(cacheKey, { data, expires: Date.now() + ttlMs });
    }

    return { data, meta: { total: data.length, page: 1, pageSize: 25 } };
  }
}

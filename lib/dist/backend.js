import vm from 'node:vm';
const TTL_RE = /^(\d+)([smh])$/;
const TTL_MS = { s: 1000, m: 60000, h: 3600000 };
function parseTtl(ttl) {
    const m = ttl.match(TTL_RE);
    return m ? parseInt(m[1]) * (TTL_MS[m[2]] || 1000) : 60000;
}
export class DataSourceRunner {
    cache = new Map();
    auth;
    defaultDb;
    constructor(auth, db) {
        this.auth = auth;
        if (db?.query)
            this.defaultDb = { query: db.query };
    }
    getAction(ds, actionId) {
        const dot = actionId.lastIndexOf('.');
        if (dot === -1)
            return undefined;
        const dsId = actionId.slice(0, dot);
        const op = actionId.slice(dot + 1);
        if (dsId !== ds.id)
            return undefined;
        if (op === 'create' && ds.create)
            return { source: 'custom', fn: ds.create };
        if (op === 'update' && ds.update)
            return { source: 'custom', fn: ds.update };
        if (op === 'delete' && ds.delete)
            return { source: 'custom', fn: ds.delete };
        const crud = ds.crud;
        if (!crud)
            return undefined;
        const allowed = crud === true ? ['create', 'update', 'delete'] : crud;
        if (!allowed.includes(op))
            return undefined;
        return { source: 'generated', fn: null };
    }
    async run(ds, user, params, adapters) {
        // Role gate
        if (ds.roles?.length) {
            const ok = ds.roles.some(r => user.roles.includes(r));
            if (!ok) {
                throw Object.assign(new Error(`Requires one of roles: ${ds.roles.join(', ')}`), { status: 403 });
            }
        }
        // Permission gate (synchronous)
        const hasPerm = this.auth.hasPermission(user, ds.permission);
        if (!hasPerm) {
            throw Object.assign(new Error(`Missing permission: ${ds.permission}`), { status: 403 });
        }
        // WebSocket protocol (synchronous path — must stay before first await)
        if (ds.protocol === 'websocket') {
            adapters?.ws?.('ws://localhost');
            return { data: [], meta: { total: 0, page: 1, pageSize: 25 } };
        }
        // Security context + param merging
        const secCtx = this.auth.getSecurityContext(user);
        const merged = { ...params, allowed_branches: secCtx.allowedBranches };
        // Cache read
        const cacheKey = JSON.stringify({ id: ds.id, params: merged });
        if (ds.cache) {
            const entry = this.cache.get(cacheKey);
            if (entry && entry.expires > Date.now()) {
                return { data: entry.data, meta: { total: entry.data.length, page: 1, pageSize: 25 } };
            }
        }
        let data;
        // Script datasource — vm sandbox blocks process/require etc.
        if (ds.language === 'javascript' && ds.script) {
            const ctx = { user, params: merged };
            const wrapped = `(function(ctx) { "use strict"; ${ds.script} })(ctx)`;
            const result = vm.runInNewContext(wrapped, { ctx });
            data = Array.isArray(result) ? result : await result;
        }
        else if (ds.query) {
            const queryFn = adapters?.query ?? this.defaultDb?.query.bind(this.defaultDb);
            if (queryFn) {
                data = await queryFn(ds.query, merged);
            }
            else {
                data = [];
            }
        }
        else {
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

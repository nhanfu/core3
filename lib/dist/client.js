/**
 * HTTP client singleton — JWT-aware, routes to DuckDB WASM or HTTP backend.
 */
class Client {
    constructor() {
        this._token = null;
        this._refreshFn = null;
    }
    setToken(token) { this._token = token; }
    onRefresh(fn) { this._refreshFn = fn; }
    _headers() {
        const h = { 'Content-Type': 'application/json' };
        if (this._token)
            h['Authorization'] = `Bearer ${this._token}`;
        return h;
    }
    _resolveBase() {
        if (typeof window !== 'undefined' && window.__CORE3_API_BASE__) {
            return window.__CORE3_API_BASE__;
        }
        return '/api';
    }
    async _fetch(url, opts) {
        let res = await fetch(url, { ...opts, headers: this._headers() });
        if (res.status === 401 && this._refreshFn) {
            this._token = await this._refreshFn();
            res = await fetch(url, { ...opts, headers: this._headers() });
        }
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw Object.assign(new Error(err.message || 'Request failed'), { status: res.status });
        }
        return res.json();
    }
    async query(vm) {
        if (vm.protocol === 'duckdb') {
            const { queryDuckDB } = await import('./duckdb.js');
            return queryDuckDB(vm.query, vm.params);
        }
        return this._fetch(`${this._resolveBase()}/query`, {
            method: 'POST',
            body: JSON.stringify(vm),
        });
    }
    async patch(vm) {
        return this._fetch(`${this._resolveBase()}/patch`, {
            method: 'POST',
            body: JSON.stringify(vm),
        });
    }
    async patchMany(vms) {
        return this._fetch(`${this._resolveBase()}/patch-many`, {
            method: 'POST',
            body: JSON.stringify(vms),
        });
    }
    async deactivate(table, id) {
        return this._fetch(`${this._resolveBase()}/deactivate`, {
            method: 'POST',
            body: JSON.stringify({ table, id }),
        });
    }
    async hardDelete(table, id) {
        return this._fetch(`${this._resolveBase()}/delete`, {
            method: 'POST',
            body: JSON.stringify({ table, id }),
        });
    }
    async uploadFile(file, meta = {}) {
        const form = new FormData();
        form.append('file', file);
        form.append('meta', JSON.stringify(meta));
        const res = await fetch(`${this._resolveBase()}/upload`, {
            method: 'POST',
            headers: this._token ? { Authorization: `Bearer ${this._token}` } : {},
            body: form,
        });
        if (!res.ok)
            throw Object.assign(new Error('Upload failed'), { status: res.status });
        return res.json();
    }
}
export const client = new Client();

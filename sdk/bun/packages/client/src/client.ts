/**
 * HTTP client singleton — JWT-aware, routes to DuckDB WASM or HTTP backend.
 */

import { i18n } from './i18n.ts';

class Client {
  _token: string | null = null;
  _refreshFn: null | (() => Promise<string>) = null;

  constructor() {
  }

  setToken(token: string | null) { this._token = token; }
  onRefresh(fn: null | (() => Promise<string>)) { this._refreshFn = fn; }

  _headers() {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this._token) h['Authorization'] = `Bearer ${this._token}`;
    if (i18n.lang) h['Accept-Language'] = i18n.lang;
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
      const fallback = err.message || err.error || 'Request failed';
      const message = err.message_key ? i18n.tKey(String(err.message_key), err.message_params || {}, fallback) : fallback;
      throw Object.assign(new Error(message), {
        status: res.status,
        code: err.code,
        messageKey: err.message_key,
        messageParams: err.message_params,
      });
    }

    return res.json();
  }

  async query(vm) {
    if (vm.protocol === 'duckdb') {
      const { queryDuckDB } = await import('./duckdb.ts');
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

  async action(name, params = {}) {
    return this._fetch(`${this._resolveBase()}/actions/${encodeURIComponent(name)}`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /** Raw authenticated request that returns the Response untouched (SSE, downloads, manual status checks). */
  async request(path: string, options: RequestInit = {}) {
    return fetch(`${this._resolveBase()}${path}`, {
      ...options,
      headers: { ...this._headers(), ...(options.headers || {}) },
    });
  }

  async workflow(sourceId: string, operation: string, params = {}) {
    return this._fetch(`${this._resolveBase()}/datasources/${encodeURIComponent(sourceId)}/workflow`, {
      method: 'POST',
      body: JSON.stringify({ operation, ...params }),
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
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      const fallback = error.error || error.message || 'Upload failed';
      const message = error.message_key ? i18n.tKey(String(error.message_key), error.message_params || {}, fallback) : fallback;
      throw Object.assign(new Error(message), {
        status: res.status,
        code: error.code,
        messageKey: error.message_key,
        messageParams: error.message_params,
      });
    }
    return res.json();
  }

  async fetchFile(path) {
    let res = await fetch(`${this._resolveBase()}${path}`, {
      headers: this._token ? { Authorization: `Bearer ${this._token}` } : {},
    });
    if (res.status === 401 && this._refreshFn) {
      this._token = await this._refreshFn();
      res = await fetch(`${this._resolveBase()}${path}`, {
        headers: this._token ? { Authorization: `Bearer ${this._token}` } : {},
      });
    }
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      const fallback = error.error || error.message || 'Download failed';
      const message = error.message_key ? i18n.tKey(String(error.message_key), error.message_params || {}, fallback) : fallback;
      throw Object.assign(new Error(message), {
        status: res.status,
        code: error.code,
        messageKey: error.message_key,
        messageParams: error.message_params,
      });
    }
    return res.blob();
  }

  async downloadFile(path, fileName = 'download') {
    const url = URL.createObjectURL(await this.fetchFile(path));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }
}

export const client = new Client();

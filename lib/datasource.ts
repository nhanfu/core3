/**
 * DataSource adapter — resolves a datasource config to a query function.
 * Routes to DuckDB WASM (protocol: duckdb) or HTTP backend (protocol: http).
 */

import { client } from './client.ts';
import { createQuery } from './dtos.ts';

const _cache = new Map();

function parseTtl(ttl = '60s') {
  const m = String(ttl).match(/^(\d+)([smh])$/);
  if (!m) return 60000;
  const unit = { s: 1000, m: 60000, h: 3600000 };
  return parseInt(m[1]) * (unit[m[2]] || 1000);
}

export async function fetchSource(def, params = {}) {
  const key = JSON.stringify({ id: def.id, params });

  if (def.cache) {
    const cached = _cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.data;
  }

  const vm = createQuery({
    sourceId: def.id,
    params,
    protocol: def.protocol || 'http',
    query: def.query,
  });

  const result = await client.query(vm);

  if (def.cache) {
    _cache.set(key, { data: result, expires: Date.now() + parseTtl(def.cache.ttl) });
  }

  return result;
}

export function clearCache(sourceId) {
  for (const key of _cache.keys()) {
    if (key.includes(`"id":"${sourceId}"`)) _cache.delete(key);
  }
}

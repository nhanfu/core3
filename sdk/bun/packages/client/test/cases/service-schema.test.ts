import { describe, expect, it } from 'vitest';
import { validateServiceManifest } from '@core3/server/yaml/service-schema';
import { addColumnstoreAccessMethod } from '@core3/server/migrations';

describe('YAML service manifest schema', () => {
  it('accepts a declarative domain service manifest', () => {
    expect(validateServiceManifest({
      id: 'order',
      kind: 'domain-service',
      runtime: undefined,
      database: 'order',
      menu: { dashboard: { path: '/orders' } },
      permissions: 'permissions.yaml',
      topics: 'topics.yaml',
      events: 'events.yaml',
      storage: 'storage.yaml',
    })).toEqual({
      id: 'order',
      kind: 'domain-service',
      database: 'order',
      menu: { dashboard: { path: '/orders' } },
      permissions: 'permissions.yaml',
      topics: 'topics.yaml',
      events: 'events.yaml',
      storage: 'storage.yaml',
    });
  });

  it('accepts service-owned Postgres storage with in-memory DuckDB compute', () => {
    expect(validateServiceManifest({
      id: 'order',
      database: {
        storage: { driver: 'postgres', url_env: 'ORDER_DATABASE_URL', schema: 'orders' },
        compute: { driver: 'duckdb', mode: 'memory' },
      },
    }).database).toEqual({
      storage: { driver: 'postgres', url_env: 'ORDER_DATABASE_URL', schema: 'orders' },
      compute: { driver: 'duckdb', mode: 'memory' },
    });
  });

  it('accepts a service-owned in-memory DuckDB storage driver', () => {
    expect(validateServiceManifest({
      id: 'chat',
      database: { storage: { driver: 'duckdb-memory' } },
    }).database).toEqual({
      storage: { driver: 'duckdb-memory' },
    });
  });

  it('adds the columnstore access method without changing the table schema or name', () => {
    const sql = 'CREATE TABLE IF NOT EXISTS orders (id VARCHAR PRIMARY KEY, note VARCHAR); CREATE INDEX idx_orders ON orders(id);';
    expect(addColumnstoreAccessMethod(sql, ['orders'])).toBe('CREATE TABLE IF NOT EXISTS orders (id VARCHAR PRIMARY KEY, note VARCHAR) USING columnstore; CREATE INDEX idx_orders ON orders(id);');
  });

  it('rejects invalid service identifiers and declaration types', () => {
    expect(() => validateServiceManifest({ id: 'Order' })).toThrow(/id is invalid/);
    expect(() => validateServiceManifest({ id: 'order', database: 42 })).toThrow(/database must be a string/);
    expect(() => validateServiceManifest({ id: 'order', database: { storage: { driver: 'mysql' } } })).toThrow(/driver is invalid/);
    expect(() => validateServiceManifest({ id: 'order', database: { storage: { driver: 'postgres' }, compute: { driver: 'postgres' } } })).toThrow(/compute must declare/);
    expect(() => validateServiceManifest({ id: 'order', menu: [] })).toThrow(/menu must be an object/);
  });
});

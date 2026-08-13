import { describe, expect, it } from 'vitest';
import { validateServiceManifest } from '@core3/server/yaml/service-schema';

describe('YAML service manifest schema', () => {
  it('accepts a declarative domain service manifest', () => {
    expect(validateServiceManifest({
      id: 'order',
      kind: 'domain-service',
      runtime: undefined,
      database: 'order',
      pages: ['pages/orders.yaml'],
      permissions: 'permissions.yaml',
      topics: 'topics.yaml',
      events: 'events.yaml',
      storage: 'storage.yaml',
    })).toEqual({
      id: 'order',
      kind: 'domain-service',
      database: 'order',
      pages: ['pages/orders.yaml'],
      permissions: 'permissions.yaml',
      topics: 'topics.yaml',
      events: 'events.yaml',
      storage: 'storage.yaml',
    });
  });

  it('rejects invalid service identifiers and declaration types', () => {
    expect(() => validateServiceManifest({ id: 'Order' })).toThrow(/id is invalid/);
    expect(() => validateServiceManifest({ id: 'order', pages: 'pages/orders.yaml' })).toThrow(/pages must be a string list/);
    expect(() => validateServiceManifest({ id: 'order', database: 42 })).toThrow(/database must be a string/);
  });
});

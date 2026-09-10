import { describe, expect, test } from 'bun:test';
import { applyDefaultFilters } from '@core3/server/routes/yaml-api';

describe('YAML API default filter prefetching', () => {
  test('applies nested ListView defaults without overriding explicit URL filters', () => {
    const params: Record<string, unknown> = { status: 'archived' };
    applyDefaultFilters([
      { type: 'ListView', source: 'top-level', default_filters: { status: 'active', with_models: true } },
      { type: 'Notebook', tabs: [{ components: [{ type: 'ListView', source: 'nested', default_filters: { scope: 'orders' } }] }] },
    ], params);

    expect(params).toEqual({ status: 'archived', with_models: true, scope: 'orders' });
  });
});

import { describe, expect, it, vi } from 'vitest';
import { resolveQueryWindow } from '@core3/server/database/query-window';
import { datasourceMethods } from '@core3/server/datasource-runtime';

const windowDefinition = {
  table: 'orders',
  date_field: 'order_date',
  max_years: 2,
  deny_unbounded: true,
};

describe('datasource query windows', () => {
  it('rejects unbounded and over-wide ranges', () => {
    expect(() => resolveQueryWindow(windowDefinition, {})).toThrow(/bounded date range/);
    expect(() => resolveQueryWindow(windowDefinition, { from_date: '2020-01-01', to_date: '2021-01-01' })).toThrow(/outside the permitted window/);
  });

  it('accepts a bounded range in the permitted window', () => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    expect(resolveQueryWindow(windowDefinition, {
      from_date: `${year - 1}-01-01`,
      to_date: tomorrow.toISOString().slice(0, 10),
    }).from).toBe(`${year - 1}-01-01`);
  });

  it('denies before executing the datasource query', async () => {
    const query = vi.fn();
    let error: any;
    try {
      await datasourceMethods.querySource.call({ query }, { query_window: windowDefinition, query: 'SELECT 1' } as any, {}, 0, 25);
    } catch (candidate) {
      error = candidate;
    }
    expect(error).toMatchObject({ code: 'QUERY_RANGE_NOT_ALLOWED' });
    expect(query).not.toHaveBeenCalled();
  });
});

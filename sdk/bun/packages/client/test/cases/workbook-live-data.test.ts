import { describe, expect, it } from 'vitest';
import { WorkbookLiveData } from '../../src/spreadsheet/live-data';

describe('Per-viewer formula data', () => {
  const catalog = { data: [{ key: 'orders', columns: [{ field: 'amount' }], max_rows: 50 }] };
  it('deduplicates a page, refreshes values, and never reuses another viewer cache', async () => {
    let amount = 42, calls = 0;
    const request = async (path: string) => {
      if (path === '/sources') return catalog;
      calls++; return { data: [{ amount }] };
    };
    const first = new WorkbookLiveData(request);
    try {
      await first.refresh();
      expect(first.read('orders', 'amount', 1, '{}').error).toContain('Loading');
      first.read('orders', 'amount', 1, '{}');
      await Promise.resolve();
      expect(first.read('orders', 'amount', 1, '{}').value).toBe(42);
      expect(calls).toBe(1);
      amount = 73;
      const second = new WorkbookLiveData(request);
      try {
        await second.refresh(); second.read('orders', 'amount', 1, '{}'); await Promise.resolve();
        expect(second.read('orders', 'amount', 1, '{}').value).toBe(73);
        expect(first.read('orders', 'amount', 1, '{}').value).toBe(42);
      } finally { second.dispose(); }
      await first.refresh(); first.read('orders', 'amount', 1, '{}'); await Promise.resolve();
      expect(first.read('orders', 'amount', 1, '{}').value).toBe(73);
    } finally { first.dispose(); }
  });
  it('discards an obsolete response after permissions change', async () => {
    let finish!: (value: any) => void;
    let denied = false;
    const data = new WorkbookLiveData(async path => path === '/sources' ? denied ? { data: [] } : catalog : new Promise(resolve => { finish = resolve; }));
    try {
      await data.refresh(); data.read('orders', 'amount', 1, '{}');
      denied = true; await data.refresh();
      finish({ data: [{ amount: 'secret' }] }); await Promise.resolve();
      expect(data.read('orders', 'amount', 1, '{}')).toEqual({ error: 'Datasource or field unavailable to your account' });
    } finally { data.dispose(); }
  });
});

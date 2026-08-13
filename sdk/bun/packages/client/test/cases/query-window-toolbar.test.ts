import { describe, expect, it } from 'vitest';
import { ListToolbar } from '@core3/client/components/ListToolbar';

describe('protected date toolbar', () => {
  it('removes unrestricted presets and constrains date inputs', () => {
    const toolbar = new ListToolbar('toolbar', {}, {
      search: false,
      date_range: { presets: ['month', 'all'], max_years: 2, deny_unbounded: true },
    });
    const container = document.createElement('div');
    toolbar.mount(container);
    expect(container.querySelector('[data-date-preset="all"]')).toBeNull();
    const from = container.querySelector<HTMLInputElement>('input[aria-label="Từ ngày"]')!;
    expect(from.min).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(from.max).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

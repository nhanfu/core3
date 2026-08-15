import { describe, expect, it, vi } from 'vitest';
import { DateRangeFilterTag, validateDateRange } from '@core3/client/components/DateRangeFilterTag';
import { resolveDatePreset } from '@core3/client/components/ListToolbar';

describe('DateRangeFilterTag', () => {
  it('renders a non-dismissible tag and applies a preset', () => {
    const onChange = vi.fn();
    const container = document.createElement('div');
    new DateRangeFilterTag({
      values: { from_date: '2026-01-01', to_date: '2026-08-15' },
      definition: { fromField: 'from_date', toField: 'to_date', label: 'Order date', presets: ['today'], maxYears: 2, denyUnbounded: true },
      onChange,
    }).render(container);

    expect(container.querySelector('.o-list-date-range-tag')).not.toBeNull();
    expect(container.querySelector('.o-list-date-range-summary')?.textContent).toContain('Order date: 2026-01-01 - 2026-08-15');
    expect(container.querySelector('.o-list-date-range-summary button')).toBeNull();
    container.querySelector<HTMLButtonElement>('[data-date-preset="today"]')!.click();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ from_date: expect.any(String), to_date: expect.any(String) }));
  });

  it('rejects reversed and overlong ranges', () => {
    const definition = { maxYears: 2, denyUnbounded: true };
    expect(validateDateRange('2026-08-15', '2026-08-01', definition)).toContain('start date');
    expect(validateDateRange('2020-01-01', '2026-01-01', definition)).toContain('between');
    expect(validateDateRange('', '2026-01-01', definition)).toContain('bounded');
  });

  it('marks the active preset and supports calendar range selection', () => {
    const month = resolveDatePreset('month');
    const onChange = vi.fn();
    const container = document.createElement('div');
    new DateRangeFilterTag({
      values: { from_date: month.from, to_date: month.to },
      definition: { fromField: 'from_date', toField: 'to_date', presets: ['month'], maxYears: 2, denyUnbounded: true },
      onChange,
    }).render(container);

    expect(container.querySelector('[data-date-preset="month"]')?.classList.contains('is-active')).toBe(true);
    const days = [...container.querySelectorAll<HTMLButtonElement>('[data-calendar-date]')];
    days[0].click();
    days[4].click();
    container.querySelector<HTMLButtonElement>('.o-list-date-range-apply')!.click();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ from_date: expect.any(String), to_date: expect.any(String) }));
  });
});

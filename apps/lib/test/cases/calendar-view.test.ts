import { describe, expect, it, vi } from 'vitest';
import { CalendarView } from '../../components/CalendarView.ts';

describe('CalendarView', () => {
  it('renders dated rows in a month grid and opens an event', () => {
    const host = document.createElement('div');
    const submit = vi.fn();
    const view = new CalendarView('orders-calendar', {
      rows: [{ id: 'o1', order_date: '2026-08-12', number: 'ORD-001', customer: 'Acme' }],
      month: '2026-08',
    }, {
      view: { id: 'calendar', label: 'Calendar', dateField: 'order_date', card: { title: 'number', subtitle: 'customer' } },
      openAction: 'view_order',
    });
    view._onAction = submit;
    view.mount(host);

    expect(host.querySelector('.o-calendar-grid')).not.toBeNull();
    expect(host.querySelectorAll('.o-calendar-day')).toHaveLength(42);
    expect(host.querySelector('[data-row-id="o1"]')?.textContent).toBe('ORD-001');
    (host.querySelector('[data-row-id="o1"]') as HTMLButtonElement).click();
    expect(submit).toHaveBeenCalledWith('view_order', { row: expect.objectContaining({ id: 'o1' }) }, expect.anything());
  });
});

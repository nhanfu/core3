import { describe, expect, it, vi } from 'vitest';
import { CalendarView } from '@core3/client/components/CalendarView';

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

  it('starts on the first event month when no month is selected', () => {
    const host = document.createElement('div');
    const view = new CalendarView('orders-calendar', {
      rows: [{ id: 'o1', order_date: '2026-07-19', number: 'ORD-001' }],
    }, {
      view: { id: 'calendar', label: 'Calendar', dateField: 'order_date', card: { title: 'number' } },
    });
    view.mount(host);

    expect(host.querySelector('.o-calendar-title')?.textContent).toContain('July');
    expect(host.querySelector('[data-row-id="o1"]')?.textContent).toBe('ORD-001');
  });

  it('renders SQL timestamp rows with a space date-time separator', () => {
    const host = document.createElement('div');
    const view = new CalendarView('events-calendar', {
      rows: [{ id: 'event-1', start_at: '2026-09-14 14:00:00', name: 'Conference' }],
      month: '2026-09',
    }, {
      view: { id: 'calendar', label: 'Calendar', dateField: 'start_at', card: { title: 'name' } },
    });
    view.mount(host);

    expect(host.querySelector('[data-row-id="event-1"]')?.textContent).toBe('Conference');
  });

  it('renders a year calendar as twelve month panels', () => {
    const host = document.createElement('div');
    const view = new CalendarView('time-off-calendar', {
      rows: [{ id: 'leave-1', date_from: '2026-01-12', name: 'LEAVE/2026/0001' }],
      month: '2026-01',
    }, {
      view: { id: 'calendar', label: 'Calendar', mode: 'year', dateField: 'date_from', card: { title: 'name' } },
    });
    view.mount(host);

    expect(host.querySelector('.o-calendar-title')?.textContent).toBe('2026');
    expect(host.querySelectorAll('.o-calendar-month')).toHaveLength(12);
    expect(host.querySelectorAll('.o-calendar-year-event')).toHaveLength(1);
    expect(host.querySelector('[data-row-id="leave-1"]')?.textContent).toBe('LEAVE/2026/0001');
  });
});

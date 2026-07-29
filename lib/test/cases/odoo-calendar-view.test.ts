import { describe, expect, it } from 'vitest';
import { OdooCalendarView } from '../../components/OdooAnalyticsViews.ts';

describe('OdooCalendarView', () => {
  it('renders the current month, navigates, and opens event records', () => {
    const container = document.createElement('div');
    const now = new Date();
    const date = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-15`;
    const calendar = new OdooCalendarView('calendar', { rows: [{ id: 'opp-1', name: 'Renewal', created_at: date, next_activity: 'Call' }] });
    const actions: unknown[] = [];
    calendar._onAction = (_action: string, params: unknown) => actions.push(params);
    calendar.mount(container);

    expect(container.querySelector('.odoo-calendar-header strong')?.textContent).toContain(String(now.getUTCFullYear()));
    expect(container.querySelector('.odoo-calendar-event')?.textContent).toContain('Renewal');
    (container.querySelector('.odoo-calendar-event') as HTMLElement).click();
    expect(actions).toEqual([{ id: 'opp-1' }]);

    const currentTitle = container.querySelector('.odoo-calendar-header strong')?.textContent;
    (container.querySelector('.odoo-calendar-header button') as HTMLElement).click();
    expect(container.querySelector('.odoo-calendar-header strong')?.textContent).not.toBe(currentTitle);
  });
});

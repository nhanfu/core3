import { describe, expect, it, vi } from 'vitest';
import { ActivityView } from '@core3/client/components/ActivityView';

describe('ActivityView', () => {
  const view = {
    id: 'activity' as const,
    label: 'Activity',
    titleField: 'name',
    subtitleField: 'owner',
    activityTypes: [
      { id: 'todo', label: 'To-Do' },
      { id: 'email', label: 'Email' },
    ],
  };

  it('renders Odoo-style activity columns, state counters, and empty cells', () => {
    const host = document.createElement('div');
    const component = new ActivityView('activities', {
      rows: [
        { id: 'r1', name: 'Design Fair', owner: 'Mitchell', activity_type: 'todo', activity_summary: 'Confirm venue', activity_date: '2026-01-20', activity_state: 'overdue' },
        { id: 'r2', name: 'Balloon Race', owner: 'Marc', activity_type: 'email', activity_summary: 'Send reminder', activity_date: '2026-01-22', activity_state: 'planned' },
      ],
    }, { view, rowKey: 'id', openAction: 'open_record', emptyCellAction: 'schedule_activity', scheduleAction: 'schedule_activity' });
    const submit = vi.fn();
    component._transport = { submit };
    component.mount(host);

    expect(host.querySelectorAll('.o-activity-type-header')).toHaveLength(2);
    expect(host.querySelector('[data-activity-state="overdue"]')?.textContent).toBe('Overdue 1');
    expect(host.querySelector('.o-activity-cell.is-overdue')?.textContent).toContain('Confirm venue');
    expect(host.querySelectorAll('.o-activity-empty-action')).toHaveLength(2);
    (host.querySelector('.o-activity-empty-action') as HTMLButtonElement).click();
    expect(submit).toHaveBeenCalledWith('schedule_activity', expect.objectContaining({ activity_type: 'email' }));
    (host.querySelector('.o-activity-schedule') as HTMLButtonElement).click();
    expect(submit).toHaveBeenCalledWith('schedule_activity', expect.objectContaining({ rows: expect.any(Array) }));
  });

  it('keeps an empty dataset inside the activity table', () => {
    const host = document.createElement('div');
    const component = new ActivityView('empty-activities', { rows: [] }, { view });
    component.mount(host);

    expect(host.querySelector('.o-activity-table-viewport')).not.toBeNull();
    expect(host.querySelector('.o-activity-no-records')?.textContent).toContain('No records found');
    expect(host.querySelector('.o-activity-no-records')?.getAttribute('colspan')).toBe('4');
  });
});

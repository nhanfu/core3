import { afterEach, describe, expect, it, vi } from 'vitest';
import { client } from '@core3/client/client';
import { PageRuntime } from '@core3/client/components/PageRoot';

describe('Maintenance request activity browser transport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    window.history.pushState({}, '', '/maintenance-requests/detail?id=request-1');
    delete window.__CORE3_USER__;
  });

  it('schedules from the modal and completes from chatter using authenticated action payloads', async () => {
    const action = vi.spyOn(client, 'action').mockResolvedValue({ ok: true });
    vi.spyOn(client, 'query').mockImplementation(async (query: any) => {
      if (query.query?.includes('maintenance_request_activities')) {
        return { data: [{ id: 'activity-1', row_version: 1, request_id: 'request-1', activity_type: 'todo', summary: 'Inspect belt', state: 'planned', action: 'maintenance.requests.activity.scheduled', action_label: 'Activity scheduled', created_at: '2026-01-15T09:00:00.000Z' }], meta: { total: 1 } };
      }
      return { data: { id: 'request-1', row_version: 4, name: 'MNT/2026/0001', equipment_name: 'CNC Mill 01', state: 'New Request', archived: false }, meta: { total: 1 } };
    });
    window.__CORE3_USER__ = { permissions: ['maintenance.read', 'maintenance.write'] };

    const container = document.createElement('div');
    document.body.appendChild(container);
    await new PageRuntime({
      page: { id: 'maintenance-request-detail' },
      datasources: [
        { id: 'maintenance_request_detail', single: true, data: { id: 'request-1', row_version: 4, name: 'MNT/2026/0001', equipment_name: 'CNC Mill 01', state: 'New Request', archived: false } },
        { id: 'maintenance_request_activity', data: [{ id: 'activity-1', row_version: 1, request_id: 'request-1', activity_type: 'todo', summary: 'Inspect belt', state: 'planned', action: 'maintenance.requests.activity.scheduled', action_label: 'Activity scheduled', created_at: '2026-01-15T09:00:00.000Z' }] },
      ],
      components: [{ type: 'OdooFormView', source: 'maintenance_request_detail', message_source: 'maintenance_request_activity', activity_complete_action: 'complete_activity', header_actions: [{ id: 'schedule_activity', label: 'Schedule activity' }] }],
      actions: [
        { id: 'schedule_activity', type: 'server_form', permission: 'maintenance.write', title: 'Schedule activity', action: 'maintenance.requests.activity.schedule', operation: 'insert', params: { request_id: '{row.id}' }, fields: [{ field: 'activity_type', label: 'Activity type', type: 'select', options: [{ value: 'todo', label: 'To-Do' }], required: true }, { field: 'summary', label: 'Summary', type: 'text', required: true }], mutation: { operation: 'insert' } },
        { id: 'complete_activity', type: 'server', permission: 'maintenance.write', action: 'maintenance.requests.activity.complete', operation: 'update', params: { id: '{row.id}', values: { state: 'done' } }, mutation: { operation: 'update' } },
      ],
    }, new Map()).render(container);

    container.querySelector<HTMLButtonElement>('.o-form-action')?.click();
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    const type = dialog.querySelector('select') as HTMLSelectElement;
    type.value = 'todo';
    type.dispatchEvent(new Event('change', { bubbles: true }));
    (dialog.querySelector('input') as HTMLInputElement).value = 'Inspect belt';
    dialog.querySelector<HTMLButtonElement>('.btn-primary')?.click();
    await new Promise(resolve => setTimeout(resolve, 25));
    expect(action).toHaveBeenCalledWith('maintenance.requests.activity.schedule', expect.objectContaining({
      request_id: 'request-1',
      values: { activity_type: 'todo', summary: 'Inspect belt' },
    }));

    document.querySelector<HTMLButtonElement>('.o-form-chatter-complete')?.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(action).toHaveBeenCalledWith('maintenance.requests.activity.complete', {
      id: 'activity-1',
      expected_row_version: 1,
      values: { state: 'done' },
    });
  });
});

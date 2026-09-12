import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off allocation Activity view', () => {
  test('matches Odoo allocation activity columns and route action', () => {
    const page = yaml('pages/allocations.yaml');
    const api = yaml('api/allocations.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const activity = list.views.find((view: any) => view.id === 'activity');
    const source = api.datasources.find((candidate: any) => candidate.id === 'time_off_allocations');
    const schedule = api.actions.find((action: any) => action.id === 'schedule_allocation_activity');

    expect(activity).toMatchObject({ label: 'Activity', mobile: false, title_field: 'name', subtitle_field: 'leave_type_name', record_date_field: 'date_from', record_end_date_field: 'date_to' });
    expect(activity.activity_types.map((type: any) => type.label)).toEqual(['To-Do', 'Email', 'Call', 'Meeting', 'Time Off Approval', 'Time Off Second Approve', 'Document']);
    expect(source.query).toContain('activity_summary');
    expect(source.query).toContain('activity_user');
    expect(source.query).toContain('activity_state');
    expect(schedule).toMatchObject({ type: 'navigate', permission: 'time_off.manage', navigate_to: '/time-off-allocations' });
  });
});

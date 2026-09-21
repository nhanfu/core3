import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off My Allocations Activity view parity', () => {
  test('joins the personal allocation page/API and matches Odoo activity columns', () => {
    const page = yaml('pages/my-allocations.yaml');
    const api = yaml('api/my-allocations.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const activity = list.views.find((view: any) => view.id === 'activity');
    const source = api.datasources.find((candidate: any) => candidate.id === 'my_allocations');
    const schedule = api.actions.find((action: any) => action.id === 'schedule_my_allocation_activity');

    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.map((source: any) => source.id)).toEqual(['my_allocation_types', 'my_allocations']);
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'card', 'activity']);
    expect(activity).toMatchObject({ label: 'Activity', mobile: false, title_field: 'name', subtitle_field: 'leave_type_name', record_date_field: 'date_from', record_end_date_field: 'date_to', schedule_action: 'schedule_my_allocation_activity' });
    expect(activity.activity_types.map((type: any) => type.label)).toEqual(['To-Do', 'Email', 'Call', 'Meeting', 'Time Off Approval', 'Time Off Second Approve', 'Document']);
    expect(source.query).toContain('time_off_my_allocation_activities');
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'TIME_OFF_MY_ALLOCATIONS_UNAVAILABLE' });
    expect(schedule).toMatchObject({ type: 'server_form', permission: 'time_off.write', operation: 'update' });
    expect(schedule.mutation.concurrency).toMatchObject({ required: true, input: 'expected_row_version' });
  });

  test('persists seeded slots, schedules a valid activity, and rejects invalid or stale writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_my_allocations_activity', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_my_allocations_activity', ['schema', 'data']);
    const api = yaml('api/my-allocations.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'my_allocations');
    const activity = api.actions.find((action: any) => action.id === 'schedule_my_allocation_activity');
    const seeded = (await repository.querySource(source, { q: null }, 0, 50)).data;
    expect(seeded.filter((row: any) => Number(row.activity_count) > 0).map((row: any) => row.id)).toEqual(['allocation-demo-001', 'allocation-demo-004']);
    expect((await repository.querySource(source, { q: 'allocation request' }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const scheduled = await repository.executeMutation(activity.mutation, {
      id: 'my-allocation-activity-allocation-demo-004',
      expected_row_version: 1,
      values: { activity_type: 'meeting', activity_summary: 'Confirm allocation dates', activity_date: '2026-01-20' },
    });
    expect(scheduled).toMatchObject({ allocation_id: 'allocation-demo-004', activity_type: 'meeting', activity_summary: 'Confirm allocation dates', activity_count: 1, row_version: 2 });
    expect((await repository.querySource(source, { q: 'Confirm allocation dates' }, 0, 50)).data).toMatchObject([{ id: 'allocation-demo-004', activity_type: 'meeting', activity_state: 'planned' }]);
    await expect(repository.executeMutation(activity.mutation, { id: 'my-allocation-activity-allocation-demo-004', expected_row_version: 1, values: { activity_type: 'todo', activity_summary: 'Stale', activity_date: '2026-01-20' } })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(activity.mutation, { id: 'my-allocation-activity-allocation-demo-004', expected_row_version: 2, values: { activity_type: 'invalid', activity_summary: 'Bad', activity_date: '2026-01-20' } })).rejects.toMatchObject({ status: 422, code: 'TIME_OFF_MY_ALLOCATION_ACTIVITY_TYPE_INVALID' });
    await expect(repository.executeMutation(activity.mutation, { id: 'my-allocation-activity-allocation-demo-004', expected_row_version: 2, values: { activity_type: 'todo', activity_summary: 'Bad date', activity_date: '20/01/2026' } })).rejects.toMatchObject({ status: 422, code: 'TIME_OFF_MY_ALLOCATION_ACTIVITY_DATE_INVALID' });
    database.close();
  });

  test('retains scheduled activity and migration replay across file-backed restart', async () => {
    const databasePath = `/tmp/time-off-my-allocations-activity-${crypto.randomUUID()}.duckdb`;
    const firstDatabase = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(firstDatabase);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'time_off_my_allocations_activity_restart', ['schema', 'data']);
    const activity = yaml('api/my-allocations.yaml').actions.find((action: any) => action.id === 'schedule_my_allocation_activity');
    await firstRepository.executeMutation(activity.mutation, { id: 'my-allocation-activity-allocation-demo-004', expected_row_version: 1, values: { activity_type: 'document', activity_summary: 'Attach approval note', activity_date: '2026-01-21' } });
    firstDatabase.close();
    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'time_off_my_allocations_activity_restart', ['schema', 'data']);
    expect(await reopenedRepository.query("SELECT activity_type, activity_summary, CAST(activity_date AS VARCHAR) AS activity_date, row_version FROM time_off_my_allocation_activities WHERE allocation_id = 'allocation-demo-004'")).toEqual([{ activity_type: 'document', activity_summary: 'Attach approval note', activity_date: '2026-01-21', row_version: 2 }]);
    expect(await reopenedRepository.query("SELECT version FROM time_off_my_allocations_activity_restart WHERE version = '0.0.23'")).toEqual([{ version: '0.0.23' }]);
    reopenedDatabase.close();
  });
});

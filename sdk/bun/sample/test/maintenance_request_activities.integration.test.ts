import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Maintenance Request activities parity', () => {
  test('schedules and completes a request activity with permission, validation, persistence, and stale guards', async () => {
    const page = yaml('pages/request-detail.yaml');
    const api = yaml('api/request-detail.yaml');
    const activity = api.datasources.find((source: any) => source.id === 'maintenance_request_activity');
    const schedule = action(api, 'schedule_maintenance_request_activity');
    const complete = action(api, 'complete_maintenance_request_activity');
    expect(page.components[0]).toMatchObject({ message_source: 'maintenance_request_activity' });
    expect(activity.query).toContain('request_id = :id');
    expect(schedule).toMatchObject({ type: 'server_form', permission: 'maintenance.write', operation: 'create', params: { request_id: '{state.id}' } });
    expect(complete).toMatchObject({ type: 'server', permission: 'maintenance.write', operation: 'update', params: { id: '{row.id}' } });

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_request_activity_migrations', ['schema', 'data']);

    const created = await repository.executeMutation(schedule.mutation, {
      id: 'maintenance-activity-qa-001',
      values: { request_id: 'maintenance-demo-001', activity_type: 'todo', summary: 'Confirm calibration checklist', due_date: '2026-01-20', assigned_to: 'Alex Chen' },
    });
    expect(created).toMatchObject({ id: 'maintenance-activity-maintenance-demo-001-1', request_id: 'maintenance-demo-001', state: 'planned', activity_type: 'todo' });

    const activityRows = await repository.query("SELECT summary, due_date, assigned_to, state FROM maintenance_request_activities WHERE request_id = 'maintenance-demo-001' ORDER BY id");
    expect(activityRows).toEqual(expect.arrayContaining([expect.objectContaining({ summary: 'Confirm calibration checklist', due_date: '2026-01-20T00:00:00.000Z', assigned_to: 'Alex Chen', state: 'planned' })]));

    await expect(repository.executeMutation(schedule.mutation, { id: 'maintenance-activity-qa-invalid', values: { request_id: 'maintenance-demo-001', activity_type: 'invalid', summary: 'Nope' } })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_ACTIVITY_TYPE_INVALID' });
    await expect(repository.executeMutation(schedule.mutation, { id: 'maintenance-activity-qa-blank', values: { request_id: 'maintenance-demo-001', activity_type: 'todo', summary: '   ' } })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_ACTIVITY_SUMMARY_REQUIRED' });
    await repository.query("UPDATE maintenance_requests SET archived = TRUE WHERE id = 'maintenance-demo-004'");
    await expect(repository.executeMutation(schedule.mutation, { id: 'maintenance-activity-qa-archived', values: { request_id: 'maintenance-demo-004', activity_type: 'todo', summary: 'Blocked' } })).rejects.toMatchObject({ status: 404, code: 'MAINTENANCE_REQUEST_NOT_FOUND' });

    const activityId = 'maintenance-activity-maintenance-demo-001-1';
    const completed = await repository.executeMutation(complete.mutation, { id: activityId, expected_row_version: 1, values: { state: 'done', completed_at: '2026-01-15 10:00:00', action: 'maintenance.requests.activity.completed', action_label: 'Activity completed', detail: 'Completed from the Maintenance request.' } });
    expect(completed).toMatchObject({ id: activityId, state: 'done', row_version: 2 });
    expect((await repository.query(`SELECT completed_at, action_label, detail FROM maintenance_request_activities WHERE id = '${activityId}'`))[0]).toMatchObject({ completed_at: '2026-01-15T10:00:00.000Z', action_label: 'Activity completed' });
    await expect(repository.executeMutation(complete.mutation, { id: activityId, expected_row_version: 1, values: { state: 'done' } })).rejects.toMatchObject({ status: 404, code: 'MAINTENANCE_ACTIVITY_NOT_FOUND' });
    database.close();
  });
});

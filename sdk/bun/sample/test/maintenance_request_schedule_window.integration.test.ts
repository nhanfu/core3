import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Maintenance request schedule window parity', () => {
  test('maps Odoo scheduled end and duration through the Maintenance page/API boundary', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/maintenance/models/maintenance.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/maintenance/views/maintenance_views.xml', 'utf8');
    const page = yaml('pages/request-detail.yaml');
    const detail = yaml('api/request-detail.yaml');
    const requests = yaml('api/requests.yaml');
    const calendar = yaml('api/calendar.yaml');
    const edit = detail.actions.find((entry: any) => entry.id === 'edit_maintenance_request_detail');
    const create = requests.actions.find((entry: any) => entry.id === 'create_maintenance_request');

    expect(source).toContain("schedule_end = fields.Datetime(");
    expect(source).toContain('request.schedule_end = request.schedule_date and request.schedule_date + relativedelta(hours=1)');
    expect(source).toContain("duration = (request.schedule_end - request.schedule_date).total_seconds() / 3600");
    expect(view).toContain('<field name="schedule_end"/>');
    expect(detail.page).toEqual({ id: 'maintenance-request-detail' });
    expect(page.page.id).toBe('maintenance-request-detail');
    expect(detail.datasources[0].query).toContain('scheduled_end');
    expect(detail.datasources[0].query).toContain('duration');
    expect(calendar.datasources.find((entry: any) => entry.id === 'maintenance_calendar').query).toContain('scheduled_end');
    expect(edit.mutation.fields).toEqual(expect.arrayContaining(['scheduled_date', 'scheduled_end', 'duration']));
    expect(create.mutation.fields).toEqual(expect.arrayContaining(['scheduled_date', 'scheduled_end', 'duration']));
    expect(edit.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'MAINTENANCE_REQUEST_SCHEDULED_END_INVALID', status: 422 }),
      expect.objectContaining({ code: 'MAINTENANCE_REQUEST_SCHEDULE_WINDOW_INVALID', status: 422 }),
    ]));
    expect(page.components[0].groups[1].fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'scheduled_end', label: 'Scheduled end' }),
      expect.objectContaining({ field: 'duration', label: 'Duration (hours)' }),
    ]));
  });

  test('defaults schedule end to one hour and persists an explicit duration across create/edit', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'maintenance_request_schedule_window', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'maintenance_request_schedule_window', ['schema', 'data']);

    expect(await repository.query("SELECT version FROM maintenance_request_schedule_window WHERE version = '0.0.12'")).toHaveLength(1);
    const create = yaml('api/requests.yaml').actions.find((entry: any) => entry.id === 'create_maintenance_request');
    const values = {
      name: 'Schedule window QA request', equipment_id: 'equipment-demo-001', equipment_name: 'CNC Mill 01',
      request_type: 'Preventive', description: 'Verify schedule window persistence.', priority: 'Normal',
      scheduled_date: '2026-03-20', recurrence: null,
    };
    await repository.executeMutation(create.mutation, { id: 'maintenance-schedule-window-001', values });
    expect((await repository.query("SELECT CAST(scheduled_end AS VARCHAR) AS scheduled_end, duration FROM maintenance_requests WHERE id = 'maintenance-schedule-window-001'"))[0])
      .toMatchObject({ scheduled_end: '2026-03-20 01:00:00', duration: 1 });

    const edit = yaml('api/request-detail.yaml').actions.find((entry: any) => entry.id === 'edit_maintenance_request_detail');
    await expect(repository.executeMutation(edit.mutation, {
      id: 'maintenance-schedule-window-001', expected_row_version: 1,
      values: { ...values, name: values.name, scheduled_date: '2026-03-20', scheduled_end: '2026-03-21 03:30:00' },
    })).resolves.toBeDefined();
    expect((await repository.query("SELECT CAST(scheduled_end AS VARCHAR) AS scheduled_end, duration, row_version FROM maintenance_requests WHERE id = 'maintenance-schedule-window-001'"))[0])
      .toMatchObject({ scheduled_end: '2026-03-21 03:30:00', duration: 27.5, row_version: 2 });

    await expect(repository.executeMutation(edit.mutation, {
      id: 'maintenance-schedule-window-001', expected_row_version: 2,
      values: { ...values, scheduled_date: '2026-03-21', scheduled_end: '2026-03-20 03:30:00' },
    })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_REQUEST_SCHEDULE_WINDOW_INVALID' });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'maintenance-schedule-window-001', expected_row_version: 1,
      values: { ...values, scheduled_end: 'not-a-timestamp' },
    })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_REQUEST_SCHEDULED_END_INVALID' });
    database.close();
  });
});

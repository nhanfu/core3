import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const valid = { task_id: 'task-demo-001', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company', fixture_state: null };

describe('Timesheets task progress parity', () => {
  test('maps Odoo task progress fields to a separate page/API summary', () => {
    const page = yaml('pages/task-timesheets.yaml');
    const api = yaml('api/task-timesheets.yaml');
    const source = api.datasources.find((item: any) => item.id === 'task_timesheet_progress');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/models/project_task.py', 'utf8');
    expect(page.page).toEqual({ id: 'task-timesheets', route: '/task-timesheets', breadcrumb: ['Project', 'Task', 'Timesheets'], auth: { require: ['timesheets.read'] } });
    expect(page.page).not.toHaveProperty('datasources');
    const progress = page.components.find((item: any) => item.type === 'StatRow');
    expect(progress).toMatchObject({ source: 'task_timesheet_progress', title: 'Task progress' });
    expect(progress.stats.map((item: any) => item.field)).toEqual(['allocated_hours', 'effective_hours', 'remaining_hours', 'progress_percent', 'overtime_hours']);
    expect(api.page).toEqual({ id: 'task-timesheets' });
    expect(source).toMatchObject({ single: true, permission: 'timesheets.read' });
    expect(String(source.query)).toContain('t.company_name = COALESCE(NULLIF(:current_company_name');
    expect(String(source.query)).toContain("e.state <> 'Cancelled'");
    expect(String(source.query)).toContain('t.row_version');
    expect(odoo).toContain("'effective_hours'");
    expect(odoo).toContain("'remaining_hours'");
    expect(odoo).toContain("'progress'");
    expect(odoo).toContain('task.effective_hours = timesheets_per_task.get(task.id, 0.0)');
  });

  test('returns deterministic allocated, spent, remaining, progress, and overtime values', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'timesheets_task_progress_values', ['schema', 'data']);
    const source = yaml('api/task-timesheets.yaml').datasources.find((item: any) => item.id === 'task_timesheet_progress');
    expect((await repository.querySource(source, valid, 0, 1)).data).toMatchObject({
      task_id: 'task-demo-001', task_name: 'Complete module migration', allocated_hours: 40, effective_hours: 8, remaining_hours: 32, progress_percent: 20, overtime_hours: 0, effective_time_display: '08:00', row_version: 1,
    });
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(source, { ...valid, fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'TASK_TIMESHEET_PROGRESS_UNAVAILABLE' });
    database.close();
  });

  test('reflects a concurrent allocation change and survives a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-task-progress-'));
    const path = join(directory, 'timesheets.duckdb');
    const source = yaml('api/task-timesheets.yaml').datasources.find((item: any) => item.id === 'task_timesheet_progress');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, serviceRoot + '/migrations', undefined, 'timesheets_task_progress_restart', ['schema', 'data']);
      expect((await repository.querySource(source, valid, 0, 1)).data).toMatchObject({ allocated_hours: 40, remaining_hours: 32, row_version: 1 });
      await repository.query("UPDATE timesheet_tasks SET allocated_hours = 10, row_version = row_version + 1 WHERE id = 'task-demo-001'");
      expect((await repository.querySource(source, valid, 0, 1)).data).toMatchObject({ allocated_hours: 10, effective_hours: 8, remaining_hours: 2, progress_percent: 80, overtime_hours: 0, row_version: 2 });
      first.close();
      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      expect((await reopened.querySource(source, valid, 0, 1)).data).toMatchObject({ allocated_hours: 10, remaining_hours: 2, progress_percent: 80, row_version: 2 });
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test('keeps the task progress fixture replay-safe and concurrency-visible', () => {
    const migration = readFileSync(join(serviceRoot, 'migrations/20260921100000-015-timesheets-task-progress.yaml'), 'utf8');
    const api = yaml('api/task-timesheets.yaml');
    expect(migration).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
    expect(String(api.datasources.find((item: any) => item.id === 'task_timesheet_progress').query)).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random_uuid|gen_random_uuid/i);
  });
});

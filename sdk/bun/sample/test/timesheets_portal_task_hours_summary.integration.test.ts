import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const valid = { task_id: 'task-demo-001', current_user_name: 'Portal User', current_company_name: 'Core3 Demo Company', expected_task_row_version: '1', fixture_state: null };

describe('Timesheets portal task hours summary parity', () => {
  test('maps Odoo portal task totals to a separate page/API summary contract', () => {
    const page = yaml('pages/portal-task-timesheets.yaml');
    const api = yaml('api/portal-task-timesheets.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/models/project_task.py', 'utf8');
    const template = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/project_task_portal_templates.xml', 'utf8');
    const migration = readFileSync(join(serviceRoot, 'migrations/20260921200000-029-timesheets-portal-task-hours-summary.yaml'), 'utf8');
    const summary = api.datasources.find((candidate: any) => candidate.id === 'portal_task_timesheet_hours');
    const stat = page.components.find((component: any) => component.type === 'StatRow');

    expect(source).toContain('def _get_portal_total_hours_dict(self):');
    expect(source).toContain("'allocated_hours': sum(tasks_for_total.mapped('allocated_hours'))");
    expect(source).toContain("'effective_hours': sum(tasks_for_total.mapped('total_hours_spent'))");
    expect(template).toContain('_get_portal_total_hours_dict()');
    expect(page.page).toMatchObject({ id: 'portal-task-timesheets', route: '/my/projects/task/timesheets' });
    expect(api.page).toEqual({ id: 'portal-task-timesheets' });
    expect(page.datasources).toBeUndefined();
    expect(summary).toMatchObject({ id: 'portal_task_timesheet_hours', permission: 'project.portal', single: true });
    expect(stat).toMatchObject({ source: 'portal_task_timesheet_hours', title: 'Task time progress' });
    expect(stat.stats.map((entry: any) => entry.field)).toEqual(['allocated_hours', 'effective_time_spent', 'remaining_hours', 'progress_percent']);
    expect(migration).toContain('allow_timesheets BOOLEAN');
    expect(migration).toContain('timesheet_task_portal_hours_idx');
  });

  test('returns durable parent totals without double-counting child entries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_portal_task_hours_scope', ['schema', 'data']);
      const summary = yaml('api/portal-task-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'portal_task_timesheet_hours');
      const result = await repository.querySource(summary, valid, 0, 1);

      expect(result.data).toMatchObject({ task_id: 'task-demo-001', task_name: 'Complete module migration', allocated_hours: 40, effective_hours: 8, remaining_hours: 32, progress_percent: 20, effective_time_spent: '08:00' });
      expect(result.data.effective_hours).not.toBe(11.5);
    } finally {
      database.close();
    }
  });

  test('fails closed for portal actor, company, missing, empty, and stale contexts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_portal_task_hours_guards', ['schema', 'data']);
      const summary = yaml('api/portal-task-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'portal_task_timesheet_hours');

      for (const context of [
        { ...valid, current_user_name: 'Other Portal User' },
        { ...valid, current_company_name: 'Other Company' },
        { ...valid, task_id: 'missing-task' },
        { ...valid, fixture_state: 'empty' },
        { ...valid, expected_task_row_version: '2' },
      ]) {
        expect((await repository.querySource(summary, context, 0, 1)).data).toEqual({});
      }
    } finally {
      database.close();
    }
  });

  test('preserves summary values and relation refresh across a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-portal-hours-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_portal_task_hours_restart', ['schema', 'data']);
      const summary = yaml('api/portal-task-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'portal_task_timesheet_hours');
      const before = await repository.querySource(summary, valid, 0, 1);
      await repository.query("UPDATE timesheet_entries SET hours = 10 WHERE id = 'timesheet-demo-001'");
      expect((await repository.querySource(summary, valid, 0, 1)).data).toMatchObject({ effective_hours: 10, remaining_hours: 30, progress_percent: 25, effective_time_spent: '10:00' });
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_portal_task_hours_restart', ['schema', 'data']);
      expect(await reopened.querySource(summary, valid, 0, 1)).toMatchObject({ data: expect.objectContaining({ effective_hours: 10, remaining_hours: 30 }) });
      expect(before.data).toMatchObject({ allocated_hours: 40, effective_hours: 8 });
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Employees All activities parity batch', () => {
  test('binds a layout-only page to its read-only page-id API contract', () => {
    const page = yaml('pages/activities.yaml');
    const api = yaml('api/activities.yaml');
    const list = page.components[0];
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'employee-activities', route: '/employees/activities' });
    expect(api.page.id).toBe(page.page.id);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('employee-activities')).toContain('employee_activities');
    expect(list).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'employee_activities', view_navigation: 'tabs' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'activity', 'graph', 'pivot', 'card']);
    expect(list.views.find((view: any) => view.id === 'card')).toMatchObject({ label: 'Kanban', mobile: true });
    expect(list.columns.map((column: any) => column.label)).toEqual(['Employee', 'Activities', 'Next Activity Deadline', 'Department', 'Job']);
    expect(api.datasources.find((source: any) => source.id === 'employee_activities')).toMatchObject({ permission: 'employees.read' });
    expect(api.datasources.find((source: any) => source.id === 'employee_activities').error_states.transport_error)
      .toMatchObject({ status: 503, code: 'EMPLOYEES_ACTIVITIES_UNAVAILABLE' });
    expect(api.actions).toEqual([{ id: 'view_employee_activity', type: 'navigate', permission: 'employees.read', navigate_to: '/employees/detail', params: { id: '{row.employee_id}' } }]);
  });

  test('projects only active employees with activities and preserves source filters', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_all_activities_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_all_activities_schema_migrations', ['schema', 'data']);
    const source = yaml('api/activities.yaml').datasources.find((item: any) => item.id === 'employee_activities');

    const populated = await repository.querySource(source, { q: null, timing: null, activity_type: null }, 0, 50);
    expect(populated.data.map((row: any) => row.employee_id)).toEqual(['employee-demo-001', 'employee-demo-002', 'employee-demo-003']);
    expect(populated.data.map((row: any) => row.activity_count)).toEqual([2, 1, 1]);
    expect(populated.data.every((row: any) => row.active === undefined || row.active !== false)).toBe(true);

    const search = await repository.querySource(source, { q: 'probation', timing: null, activity_type: null }, 0, 50);
    expect(search.data.map((row: any) => row.employee_name)).toEqual(['Nguyen Minh Anh']);
    const today = await repository.querySource(source, { q: null, timing: 'Today', activity_type: null }, 0, 50);
    expect(today.data.map((row: any) => row.employee_name)).toEqual(['Admin User', 'Nguyen Minh Anh']);
    const calls = await repository.querySource(source, { q: null, timing: null, activity_type: 'call' }, 0, 50);
    expect(calls.data.map((row: any) => row.employee_name)).toEqual(['Admin User']);
    const empty = await repository.querySource(source, { q: null, timing: null, activity_type: null, fixture_state: 'empty' }, 0, 50);
    expect(empty.data).toEqual([]);
    await expect(repository.querySource(source, { q: null, timing: null, activity_type: null, fixture_state: 'transport_error' }, 0, 50))
      .rejects.toMatchObject({ status: 503, code: 'EMPLOYEES_ACTIVITIES_UNAVAILABLE' });
  });

  test('keeps deterministic, page-local-fixture-free implementation boundaries', () => {
    const pageText = readFileSync(join(root, 'pages/activities.yaml'), 'utf8');
    const migrationText = readFileSync(join(root, 'migrations/20260911220000-015-all-activities.yaml'), 'utf8');
    expect(pageText).not.toMatch(/\bSELECT\b|\bUPDATE\b|\bINSERT\b/i);
    expect(migrationText).not.toMatch(/CURRENT_DATE|CURRENT_TIMESTAMP|gen_random_uuid/i);
    expect(migrationText).toContain('employee_activities_all_action_idx');
  });
});

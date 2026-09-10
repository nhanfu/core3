import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Employees Odoo action-mode parity batch', () => {
  test('keeps the bounded pages layout-only and discoverable by page id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const routes = [
      ['pages/employees.yaml', 'employees', 'employees'],
      ['pages/directory.yaml', 'employee-directory', 'employee_directory'],
      ['pages/activities.yaml', 'employee-activities', 'employee_activities'],
      ['pages/departments.yaml', 'employee-departments', 'employee_departments_report'],
      ['pages/department-detail.yaml', 'employee-department-detail', 'employee_department_detail'],
    ] as const;
    for (const [file, pageId, sourceId] of routes) {
      const page = yaml(file);
      expect(page.datasources, file).toBeUndefined();
      expect(page.actions, file).toBeUndefined();
      expect(page.page.id, file).toBe(pageId);
      expect(discovered.pages.get(pageId), file).toBeTruthy();
      expect(discovered.pageDatasources.get(pageId), file).toContain(sourceId);
    }
  });

  test('matches Odoo employee and directory view-mode ordering with visible tabs', () => {
    const employees = yaml('pages/employees.yaml').components[0];
    expect(employees.view_navigation).toBe('tabs');
    expect(employees.views.map((view: any) => view.id)).toEqual(['kanban', 'list', 'card', 'activity', 'graph', 'pivot']);
    expect(employees.views.map((view: any) => view.label)).toEqual(['Kanban', 'List', 'Cards', 'Activity', 'Graph', 'Pivot']);
    expect(employees.views.find((view: any) => view.id === 'kanban')).toMatchObject({ group_by: 'state', groups_source: 'employee_states' });
    expect(employees.views.find((view: any) => view.id === 'activity')?.activity_types.map((type: any) => type.label))
      .toEqual(['To-Do', 'Email', 'Call', 'Meeting', 'Document']);
    expect(employees.views.find((view: any) => view.id === 'pivot')?.pivot.default)
      .toMatchObject({ rows: ['department_name'], columns: ['state'] });

    const directory = yaml('pages/directory.yaml').components[0];
    expect(directory.view_navigation).toBe('tabs');
    expect(directory.views.map((view: any) => view.id)).toEqual(['kanban', 'list', 'card']);
    expect(directory.columns.map((column: any) => column.label)).toEqual(['Avatar', 'Name', 'Job Position', 'Department', 'Work Email', 'Work Phone']);
  });

  test('declares the all-activities and departments action contracts', () => {
    const activities = yaml('pages/activities.yaml').components[0];
    expect(activities.views.map((view: any) => view.id)).toEqual(['activity', 'list', 'card', 'kanban', 'graph', 'pivot']);
    expect(activities.row_open_action).toBe('view_employee_activity');
    expect(yaml('api/activities.yaml').actions.find((action: any) => action.id === 'view_employee_activity'))
      .toMatchObject({ navigate_to: '/employees/detail', params: { id: '{row.employee_id}' } });

    const departments = yaml('pages/departments.yaml').components[0];
    expect(departments.views.map((view: any) => view.id)).toEqual(['kanban', 'list', 'card']);
    expect(departments.create_action).toBe('create_department');
    expect(yaml('api/departments.yaml').actions.find((action: any) => action.id === 'create_department')?.permission).toBe('employees.manage');
    expect(yaml('api/department-detail.yaml').actions.map((action: any) => action.id)).toEqual([
      'department_employee_count', 'edit_department', 'archive_department', 'restore_department',
    ]);
  });

  test('seeds stable activity slots and department counts without page-local SQL', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_action_modes_schema_migrations', ['schema', 'data']);

    const employeeSource = yaml('api/employees.yaml').datasources.find((source: any) => source.id === 'employees');
    const employees = await repository.querySource(employeeSource, { q: null, active: null, state: null, department_name: null }, 0, 50);
    expect(employees.data.map((row: any) => row.id)).toEqual(['employee-demo-001', 'employee-demo-002', 'employee-demo-003']);
    expect(employees.data.find((row: any) => row.id === 'employee-demo-001')).toMatchObject({ activity_type: 'todo', activity_state: 'overdue' });

    const archived = await repository.querySource(employeeSource, { q: null, active: 'false', state: null, department_name: null }, 0, 50);
    expect(archived.data.map((row: any) => row.id)).toEqual(['employee-demo-004']);

    const activitySource = yaml('api/activities.yaml').datasources.find((source: any) => source.id === 'employee_activities');
    const activities = await repository.querySource(activitySource, { q: null, timing: null, activity_type: null }, 0, 50);
    expect(activities.data).toHaveLength(5);
    expect(activities.data.map((row: any) => row.id)).toEqual([
      'employee-activity-004', 'employee-activity-001', 'employee-activity-005', 'employee-activity-002', 'employee-activity-003',
    ]);

    const departmentSource = yaml('api/departments.yaml').datasources[0];
    const departments = await repository.querySource(departmentSource, { q: null, active: null }, 0, 50);
    expect(departments.data).toHaveLength(1);
    expect(departments.data[0]).toMatchObject({ name: 'Engineering', employee_count: 3 });
  });

  test('keeps source-side boundary and seed contracts deterministic', () => {
    const pageFiles = ['pages/employees.yaml', 'pages/directory.yaml', 'pages/activities.yaml', 'pages/departments.yaml', 'pages/department-detail.yaml'];
    expect(pageFiles.every(file => !/\bSELECT\b|\bUPDATE\b|\bINSERT\b/i.test(readFileSync(join(root, file), 'utf8')))).toBe(true);
    const migration = readFileSync(join(root, 'migrations/20260910140000-004-employees-action-modes.yaml'), 'utf8');
    expect(migration).not.toMatch(/CURRENT_DATE|CURRENT_TIMESTAMP|gen_random_uuid/i);
    expect(migration).toContain('employee-activity-001');
    expect(yaml('manifest.yaml').menu.groups.map((group: any) => group.label)).toEqual(['People', 'Reporting']);
    expect(yaml('manifest.yaml').menu.groups[0].items.map((item: any) => item.label)).toEqual(['Employees', 'Directory', 'All activities']);
  });
});

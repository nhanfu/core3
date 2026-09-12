import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Employees Directory parity', () => {
  test('binds the read-only Odoo public action to separate page/API contracts', () => {
    const page = yaml('pages/directory.yaml');
    const detail = yaml('pages/directory-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'employee-directory', route: '/employees/directory' });
    expect(detail.page).toMatchObject({ id: 'employee-directory-detail', route: '/employees/directory/detail' });
    expect(page.datasources).toBeUndefined();
    expect(discovered.pageDatasources.get('employee-directory')).toContain('employee_directory');
    expect(discovered.pageDatasources.get('employee-directory-detail')).toContain('employee_directory_detail');
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['kanban', 'list', 'card']);
    expect(page.components[0].filters.map((filter: any) => filter.field)).toEqual(['directory_filter', 'company_name', 'department_name']);
    expect(yaml('api/directory.yaml').actions).toEqual([{ id: 'view_directory_employee', type: 'navigate', permission: 'employees.read', navigate_to: '/employees/directory/detail', params: { id: '{row.id}' } }]);
    expect(readFileSync(join(root, 'pages/directory.yaml'), 'utf8')).not.toMatch(/\bSELECT\b|\bINSERT\b|\bUPDATE\b/i);
  });

  test('keeps public fixtures deterministic and explicit across filtered states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_directory_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_directory_schema_migrations', ['schema', 'data']);
    const source = yaml('api/directory.yaml').datasources[0];
    const defaults = { q: null, active: 'active', company_name: null, department_name: null, manager_name: null, newly_hired: null, fixture_state: null };
    expect((await repository.querySource(source, defaults, 0, 50)).data.map((row: any) => row.id)).toEqual(['employee-demo-001', 'employee-demo-002', 'employee-demo-003']);
    expect((await repository.querySource(source, { ...defaults, q: 'anh' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Nguyen Minh Anh']);
    expect((await repository.querySource(source, { ...defaults, newly_hired: 'true' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Tran Bao Long']);
    expect((await repository.querySource(source, { ...defaults, active: 'archived' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Le Thu Ha']);
    expect((await repository.querySource(source, { ...defaults, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...defaults, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'EMPLOYEES_DIRECTORY_UNAVAILABLE' });
    const detail = yaml('api/directory-detail.yaml').datasources[0];
    expect((await repository.querySource(detail, { id: 'employee-demo-002', fixture_state: null }, 0, 1)).data).toMatchObject({ name: 'Nguyen Minh Anh', work_email: 'anh.nguyen@core3.local' });
    expect((await repository.querySource(detail, { id: 'employee-demo-002', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    database.close();
  });
});

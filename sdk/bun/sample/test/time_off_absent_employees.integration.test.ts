import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off absent employees context action', () => {
  test('keeps the source action contract and page/API separation', () => {
    const discovered = discoverPages(join(root, '..'));
    const page = yaml('pages/absent-employees.yaml');
    const api = yaml('api/absent-employees.yaml');
    const view = page.components[0];
    expect(page.page).toMatchObject({ id: 'absent-employees', route: '/time-off/absent-employees', auth: { require: ['time_off.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe('absent-employees');
    expect(discovered.pageDatasources.get('absent-employees')).toEqual(['absent_employee_departments', 'absent_employees']);
    expect(view).toMatchObject({ source: 'absent_employees', row_actions: 'menu', view_navigation: 'tabs' });
    expect(view.columns.map((column: any) => column.label)).toEqual(['Employee', 'Department', 'Job Position', 'Time Off', 'Start', 'End', 'Status']);
    expect(api.actions[0]).toMatchObject({ id: 'open_absent_request', navigate_to: '/leave-requests', permission: 'time_off.read' });
  });

  test('seeds deterministic approved and validated employees idempotently', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_absent_employees_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_absent_employees_migrations', ['schema', 'data']);
    const source = yaml('api/absent-employees.yaml').datasources[1];
    const params = { q: null, department_name: null, fixture_state: null };
    const rows = await repository.querySource(source, params, 0, 50);
    expect(rows.data).toHaveLength(3);
    expect(rows.data.map((row: any) => row.employee_name)).toEqual(['Mitchell Admin', 'Marc Demo', 'Paul Williams']);
    expect(rows.data.map((row: any) => row.state)).toEqual(['Approved', 'Approved', 'Validated']);
    expect((await repository.querySource(source, { ...params, department_name: 'Product' })).data).toHaveLength(2);
    expect((await repository.querySource(source, { ...params, q: 'missing' })).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' })).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' })).rejects.toMatchObject({ status: 503, code: 'TIME_OFF_ABSENT_EMPLOYEES_UNAVAILABLE' });
    expect((await repository.query("SELECT version FROM time_off_absent_employees_migrations WHERE version = '0.0.14'")).length).toBe(1);
    database.close();
  });
});

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off Mandatory Days configuration', () => {
  test('matches the Odoo list/form action and keeps page/API separation', () => {
    const discovered = discoverPages(join(root, '..'));
    const list = yaml('pages/mandatory-days.yaml');
    const detail = yaml('pages/mandatory-day-detail.yaml');
    const listApi = yaml('api/mandatory-days.yaml');
    const detailApi = yaml('api/mandatory-day-detail.yaml');
    const listView = list.components.find((component: any) => component.type === 'ListView');
    const form = detail.components.find((component: any) => component.type === 'OdooFormView');

    expect(list.page).toMatchObject({ id: 'mandatory-days', route: '/mandatory-days', auth: { require: ['time_off.manage'] } });
    expect(detail.page).toMatchObject({ id: 'mandatory-day-detail', route: '/mandatory-days/detail', auth: { require: ['time_off.manage'] } });
    expect(list.datasources).toBeUndefined();
    expect(list.actions).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(detail.actions).toBeUndefined();
    expect(listView).toMatchObject({ source: 'mandatory_days', row_open_action: 'view_mandatory_day', row_double_click_action: 'view_mandatory_day', row_actions: 'menu' });
    expect(listView.columns.find((column: any) => column.field === 'department_names')).toMatchObject({ optional: 'hide' });
    expect(listView.columns.find((column: any) => column.field === 'job_names')).toMatchObject({ optional: 'hide' });
    expect(listView.date_range).toMatchObject({ from_field: 'date_from', to_field: 'date_to', default_preset: 'year' });
    expect(form).toMatchObject({ type: 'OdooFormView', source: 'mandatory_day_detail', editable: true });
    expect(form.groups.map((group: any) => group.title)).toEqual(['Mandatory Day', 'Dates', 'Appearance']);
    expect(discovered.pageDatasources.get('mandatory-day-detail')).toEqual(['mandatory_day_detail']);
    expect(listApi.page.id).toBe('mandatory-days');
    expect(detailApi.page.id).toBe('mandatory-day-detail');
    expect(listApi.datasources[0]).toMatchObject({ id: 'mandatory_days', permission: 'time_off.manage' });
    expect(detailApi.datasources[0]).toMatchObject({ id: 'mandatory_day_detail', single: true, permission: 'time_off.manage' });
    expect([...listApi.actions, ...detailApi.actions].every((action: any) => action.permission === 'time_off.manage')).toBe(true);
    expect(listApi.actions.map((action: any) => action.id)).toEqual(['view_mandatory_day', 'create_mandatory_day', 'delete_mandatory_day']);
    expect(detailApi.actions[0].mutation).toMatchObject({ operation: 'update', table: 'mandatory_days', concurrency: { required: true } });
    expect(detailApi.actions[0].mutation.guards.map((guard: any) => guard.status)).toEqual([404, 422, 409]);
  });

  test('seeds deterministic records idempotently and supports search, period, empty, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_mandatory_days_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_mandatory_days_schema_migrations', ['schema', 'data']);
    const source = yaml('api/mandatory-days.yaml').datasources[0];
    const params = { q: null, from_date: null, to_date: null, fixture_state: null };

    const populated = await repository.querySource(source, params, 0, 50);
    expect(populated.data).toHaveLength(1);
    expect(populated.data[0]).toMatchObject({ id: 'mandatory-day-demo-001', name: 'Company Celebration', row_version: 1, color_index: 6, department_names: '', job_names: '' });
    expect((await repository.querySource(source, { ...params, q: 'celebration' })).data).toHaveLength(1);
    expect((await repository.querySource(source, { ...params, from_date: '2026-10-01', to_date: '2026-10-31' })).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' })).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' })).rejects.toMatchObject({ status: 503, code: 'TIME_OFF_MANDATORY_DAYS_UNAVAILABLE' });
    expect((await repository.query("SELECT version FROM time_off_mandatory_days_schema_migrations WHERE version = '0.0.9'")).length).toBe(1);
    expect((await repository.query("SELECT index_name FROM duckdb_indexes() WHERE index_name = 'mandatory_days_date_idx'")).length).toBe(1);
    database.close();
  });

  test('enforces create/update/delete validation, uniqueness, permissions, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_mandatory_days_mutation_migrations', ['schema', 'data']);
    const listApi = yaml('api/mandatory-days.yaml');
    const detailApi = yaml('api/mandatory-day-detail.yaml');
    const create = listApi.actions.find((action: any) => action.id === 'create_mandatory_day').mutation;
    const update = detailApi.actions.find((action: any) => action.id === 'edit_mandatory_day').mutation;
    const remove = listApi.actions.find((action: any) => action.id === 'delete_mandatory_day').mutation;
    const values = { name: 'Company Retreat', date_from: '2026-06-10', date_to: '2026-06-12', color: 'blue', company: 'YShip Demo Company', department_names: 'Operations', job_names: 'Operations Manager' };

    const created = await repository.executeMutation(create, { values });
    expect(created).toMatchObject({ id: 'mandatory-day-company-retreat-2026-06-10', name: 'Company Retreat', row_version: 1, department_names: 'Operations', job_names: 'Operations Manager' });
    await expect(repository.executeMutation(create, { values: { ...values, name: 'company retreat', date_from: '2026-07-01', date_to: '2026-07-01' } })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_MANDATORY_DAY_EXISTS' });
    await expect(repository.executeMutation(create, { values: { ...values, name: 'Reversed Day', date_from: '2026-07-02', date_to: '2026-07-01' } })).rejects.toMatchObject({ status: 422, code: 'TIME_OFF_MANDATORY_DAY_INVALID' });

    const updated = await repository.executeMutation(update, { id: created.id, expected_row_version: 1, values: { ...values, color: 'green', date_to: '2026-06-13' } });
    expect(updated).toMatchObject({ id: created.id, date_to: '2026-06-13T00:00:00.000Z', color: 'green', row_version: 2 });
    await expect(repository.executeMutation(update, { id: created.id, expected_row_version: 1, values: { ...values, color: 'red' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(update, { id: 'missing-mandatory-day', expected_row_version: 1, values })).rejects.toMatchObject({ status: 404, code: 'TIME_OFF_MANDATORY_DAY_NOT_FOUND' });
    await expect(repository.executeMutation(remove, { id: created.id, expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(remove, { id: created.id, expected_row_version: 2 });
    expect(await repository.query(`SELECT id FROM mandatory_days WHERE id = '${created.id}'`)).toEqual([]);
    await expect(repository.executeMutation(remove, { id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'TIME_OFF_MANDATORY_DAY_NOT_FOUND' });
    database.close();
  });
});

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off Public Holidays configuration', () => {
  test('keeps the Odoo list/detail contract and page/API page-id separation', () => {
    const discovered = discoverPages(join(root, '..'));
    const list = yaml('pages/public-holidays.yaml');
    const detail = yaml('pages/public-holiday-detail.yaml');
    const listApi = yaml('api/public-holidays.yaml');
    const detailApi = yaml('api/public-holiday-detail.yaml');
    const listView = list.components.find((component: any) => component.type === 'ListView');
    const form = detail.components.find((component: any) => component.type === 'OdooFormView');

    expect(list.page).toMatchObject({ id: 'public-holidays', route: '/public-holidays', auth: { require: ['time_off.manage'] } });
    expect(detail.page).toMatchObject({ id: 'public-holiday-detail', route: '/public-holidays/detail' });
    expect(list.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(list.actions).toBeUndefined();
    expect(detail.actions).toBeUndefined();
    expect(listView).toMatchObject({
      source: 'public_holidays',
      row_open_action: 'view_public_holiday',
      row_actions: 'menu',
      empty_state: { title: 'No public holidays found' },
    });
    expect(listView.date_range).toMatchObject({ from_field: 'date_from', to_field: 'date_to', default_preset: 'year' });
    expect(form).toMatchObject({ source: 'public_holiday_detail', editable: true });
    expect(discovered.pageDatasources.get('public-holiday-detail')).toEqual(['public_holiday_detail']);
    expect(listApi.page.id).toBe('public-holidays');
    expect(detailApi.page.id).toBe('public-holiday-detail');
    expect(listApi.datasources[0]).toMatchObject({ id: 'public_holidays', permission: 'time_off.manage' });
    expect(listApi.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'TIME_OFF_PUBLIC_HOLIDAYS_UNAVAILABLE' });
    expect(detailApi.datasources[0]).toMatchObject({ id: 'public_holiday_detail', single: true, permission: 'time_off.manage' });
    expect([...listApi.actions, ...detailApi.actions].every((action: any) => action.permission === 'time_off.manage')).toBe(true);
    expect(listApi.actions.map((action: any) => action.id)).toEqual(['view_public_holiday', 'create_public_holiday', 'delete_public_holiday']);
    expect(detailApi.actions[0].mutation).toMatchObject({ operation: 'update', table: 'public_holidays', concurrency: { required: true } });
    expect(detailApi.actions[0].mutation.guards.map((guard: any) => guard.status)).toEqual([404, 422, 409]);
  });

  test('seeds fixed 2026 holidays idempotently and supports search, period, empty, and error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_public_holiday_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_public_holiday_schema_migrations', ['schema', 'data']);
    const source = yaml('api/public-holidays.yaml').datasources[0];

    const params = { q: null, from_date: null, to_date: null, fixture_state: null };
    const populated = await repository.querySource(source, params, 0, 50);
    expect(populated.data.map((row: any) => row.name)).toEqual([
      'Public Time Off',
      'Reunification Day',
      'National Day Holiday',
    ]);
    expect(populated.data[0]).toMatchObject({ row_version: 1, date_from: '2026-02-13', calendar_name: 'Standard 40 hours/week' });
    expect((await repository.querySource(source, { ...params, q: 'national' })).data).toHaveLength(1);
    expect((await repository.querySource(source, { ...params, from_date: '2026-04-01', to_date: '2026-05-01' })).data).toHaveLength(1);
    expect((await repository.querySource(source, { ...params, q: 'does-not-exist' })).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' })).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' })).rejects.toMatchObject({ status: 503, code: 'TIME_OFF_PUBLIC_HOLIDAYS_UNAVAILABLE' });
    expect((await repository.query("SELECT version FROM time_off_public_holiday_schema_migrations WHERE version = '0.0.8'")).length).toBe(1);
    expect((await repository.query("SELECT index_name FROM duckdb_indexes() WHERE index_name = 'public_holidays_date_idx'")).length).toBe(1);
    database.close();
  });

  test('enforces permissioned create/update/delete validation, not-found, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_public_holiday_mutation_migrations', ['schema', 'data']);
    const listApi = yaml('api/public-holidays.yaml');
    const detailApi = yaml('api/public-holiday-detail.yaml');
    const create = listApi.actions.find((action: any) => action.id === 'create_public_holiday').mutation;
    const update = detailApi.actions.find((action: any) => action.id === 'edit_public_holiday').mutation;
    const remove = listApi.actions.find((action: any) => action.id === 'delete_public_holiday').mutation;

    const created = await repository.executeMutation(create, {
      values: { name: 'Tet Holiday', date_from: '2026-01-29', date_to: '2026-01-30', calendar_name: 'Standard 40 hours/week' },
    });
    expect(created).toMatchObject({ id: 'public-holiday-tet-holiday-2026-01-29', name: 'Tet Holiday', row_version: 1 });
    await expect(repository.executeMutation(create, {
      values: { name: 'tet holiday', date_from: '2026-02-01', date_to: '2026-02-01' },
    })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_PUBLIC_HOLIDAY_EXISTS' });
    await expect(repository.executeMutation(create, {
      values: { name: 'Reversed Dates', date_from: '2026-02-02', date_to: '2026-02-01' },
    })).rejects.toMatchObject({ status: 422, code: 'TIME_OFF_PUBLIC_HOLIDAY_INVALID' });

    const updated = await repository.executeMutation(update, {
      id: 'public-holiday-tet-holiday-2026-01-29',
      expected_row_version: 1,
      values: { name: 'Tet Holiday', date_from: '2026-01-29', date_to: '2026-01-31', calendar_name: 'Standard 40 hours/week' },
    });
    expect(updated).toMatchObject({ date_to: '2026-01-31T00:00:00.000Z', row_version: 2 });
    await expect(repository.executeMutation(update, {
      id: 'public-holiday-tet-holiday-2026-01-29',
      expected_row_version: 1,
      values: { name: 'Tet Holiday', date_from: '2026-01-29', date_to: '2026-02-01', calendar_name: 'Standard 40 hours/week' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(update, {
      id: 'missing-public-holiday', expected_row_version: 1,
      values: { name: 'Missing', date_from: '2026-01-01', date_to: '2026-01-01', calendar_name: 'Standard 40 hours/week' },
    })).rejects.toMatchObject({ status: 404, code: 'TIME_OFF_PUBLIC_HOLIDAY_NOT_FOUND' });

    await expect(repository.executeMutation(remove, { id: 'public-holiday-tet-holiday-2026-01-29', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(remove, { id: 'public-holiday-tet-holiday-2026-01-29', expected_row_version: 2 });
    expect(await repository.query("SELECT id FROM public_holidays WHERE id = 'public-holiday-tet-holiday-2026-01-29'")).toEqual([]);
    await expect(repository.executeMutation(remove, { id: 'public-holiday-tet-holiday-2026-01-29', expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'TIME_OFF_PUBLIC_HOLIDAY_NOT_FOUND' });
    database.close();
  });
});

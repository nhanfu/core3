import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('POS Point of Sale configuration action parity', () => {
  test('joins the Odoo action list/detail contracts and declares all visible states', () => {
    const manifest = yaml('manifest.yaml');
    const menu = manifest.menu.groups.flatMap((group: any) => group.items);
    const listPage = yaml('pages/pos-configs.yaml');
    const listApi = yaml('api/pos-configs.yaml');
    const detailPage = yaml('pages/pos-config-detail.yaml');
    const detailApi = yaml('api/pos-config-detail.yaml');

    expect(menu).toContainEqual(expect.objectContaining({ path: '/point-of-sale/configs', label: 'Point of Sales', permission: 'pos.read' }));
    expect(listPage.page.id).toBe('pos-configs');
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailPage.page.id).toBe('pos-config-detail');
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(listPage.components[0]).toMatchObject({
      source: 'pos_configs', create_action: 'create_pos_config', row_double_click_action: 'view_pos_config',
      empty_state: { title: 'No Point of Sale configurations' }, responsive_card: true,
    });
    expect(listPage.components[0].columns.map((column: any) => column.label)).toEqual(['Point of Sale', 'Company', 'Closing', 'Balance', 'Status']);
    expect(listApi.datasources[0].error_states).toMatchObject({
      forbidden: { status: 403, code: 'POS_CONFIGURATIONS_FORBIDDEN' },
      transport_error: { status: 503, code: 'POS_CONFIGURATIONS_UNAVAILABLE' },
    });
    expect(detailApi.datasources[0].error_states).toMatchObject({
      forbidden: { status: 403 }, not_found: { status: 404 }, transport_error: { status: 503 },
    });
    const fields = detailPage.components[0].groups.flatMap((group: any) => group.fields.map((field: any) => field.field));
    expect(fields).toEqual(['name', 'login_with_employees', 'epos_printer', 'iot_box']);
    expect(detailPage.components[0].header_actions.map((entry: any) => entry.id)).toEqual(['back_to_pos_configs', 'edit_pos_config']);
  });

  test('seeds six deterministic Odoo-shaped configurations and supports default/search/empty/detail-not-found states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_configuration_action_migrations', ['schema', 'data']);
    const listSource = yaml('api/pos-configs.yaml').datasources[0];
    const detailSource = yaml('api/pos-config-detail.yaml').datasources[0];

    const rows = await repository.querySource(listSource, { q: null, fixture_state: null }, 0, 50);
    expect(rows.data).toHaveLength(6);
    expect(rows.data.map((row: any) => row.name)).toEqual(['Furniture Shop', 'Clothes Shop', 'Bakery Shop', 'Restaurant', 'Bar', 'Kiosk']);
    expect(rows.data.find((row: any) => row.name === 'Furniture Shop')).toMatchObject({ closing: 'Sep 10', balance: 2243.57, status: 'Active' });
    expect((await repository.querySource(listSource, { q: 'Restaurant', fixture_state: null }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(listSource, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect(listSource.error_states.transport_error).toMatchObject({ status: 503, code: 'POS_CONFIGURATIONS_UNAVAILABLE' });

    const detail = await repository.querySource(detailSource, { id: 'pos-config-main', fixture_state: null }, 0, 1);
    expect(detail.data).toMatchObject({ id: 'pos-config-main', name: 'Furniture Shop', login_with_employees: false, epos_printer: false, iot_box: false });
    await expect(repository.querySource(detailSource, { id: 'missing', fixture_state: 'not_found' }, 0, 1)).rejects.toMatchObject({ status: 404, code: 'POS_CONFIG_NOT_FOUND' });
    database.close();
  });

  test('guards permissioned CRUD with validation, active-session workflow, in-use, and optimistic-concurrency checks', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_configuration_action_crud_migrations', ['schema', 'data']);
    const listApi = yaml('api/pos-configs.yaml');
    const detailApi = yaml('api/pos-config-detail.yaml');
    const create = action(listApi, 'create_pos_config');
    const edit = action(detailApi, 'edit_pos_config');
    const remove = action(detailApi, 'delete_pos_config');

    expect(create.permission).toBe('pos.manage');
    expect(edit.permission).toBe('pos.manage');
    expect(remove.permission).toBe('pos.manage');
    await expect(repository.executeMutation(create.mutation, { values: { name: '   ' } })).rejects.toMatchObject({ status: 422, code: 'POS_CONFIG_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Furniture Shop' } })).rejects.toMatchObject({ status: 409, code: 'POS_CONFIG_NAME_EXISTS' });
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Garden Register', login_with_employees: true } });
    expect(created).toMatchObject({ name: 'Garden Register', login_with_employees: true, row_version: 1 });

    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Garden Register Updated', epos_printer: true } });
    expect(edited).toMatchObject({ name: 'Garden Register Updated', epos_printer: true, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale Register' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'pos-config-main', expected_row_version: 1, values: { name: 'Furniture Shop Updated' } })).rejects.toMatchObject({ status: 409, code: 'POS_CONFIG_SESSION_OPEN' });
    await expect(repository.executeMutation(remove.mutation, { id: 'pos-config-main', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'POS_CONFIG_IN_USE' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'POS_CONFIG_NOT_FOUND' });
    database.close();
  });
});

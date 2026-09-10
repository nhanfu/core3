import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPages } from '@core3/server/discovery';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);
const transition = (workflow: any, id: string) => workflow.transitions.find((candidate: any) => candidate.id === id);

describe('POS Preparation Printers configuration parity', () => {
  test('registers the list/detail page and API pair by matching page.id', () => {
    const manifest = yaml('manifest.yaml');
    const menu = manifest.menu.groups.flatMap((group: any) => group.items);
    const listPage = yaml('pages/pos-preparation-printers.yaml');
    const listApi = yaml('api/pos-preparation-printers.yaml');
    const detailPage = yaml('pages/pos-preparation-printer-detail.yaml');
    const detailApi = yaml('api/pos-preparation-printer-detail.yaml');

    expect(menu).toContainEqual(expect.objectContaining({ path: '/point-of-sale/preparation-printers', label: 'Preparation Printers', permission: 'pos.read' }));
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(listPage.components[0]).toMatchObject({
      source: 'pos_preparation_printers',
      row_open_action: 'view_pos_preparation_printer',
      row_double_click_action: 'view_pos_preparation_printer',
      empty_state: { title: 'No preparation printers' },
    });
    expect(action(listApi, 'view_pos_preparation_printer')).toMatchObject({
      permission: 'pos.read', navigate_to: '/point-of-sale/preparation-printer-detail', params: { id: '{row.id}' },
    });
    expect(detailPage.page.route).toBe('/point-of-sale/preparation-printer-detail');
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('pos-preparation-printers')).toEqual(['pos_preparation_printers']);
  });

  test('declares readable empty/error states, permissioned CRUD, and printer workflow', () => {
    const listApi = yaml('api/pos-preparation-printers.yaml');
    const detailApi = yaml('api/pos-preparation-printer-detail.yaml');
    const detailPage = yaml('pages/pos-preparation-printer-detail.yaml');
    const workflow = yaml('pages/pos-preparation-printer-workflow.yaml').workflow;
    const create = yaml('pages/pos-preparation-printers.yaml').actions.find((candidate: any) => candidate.id === 'create_pos_preparation_printer');

    expect(listApi.datasources[0]).toMatchObject({ permission: 'pos.read' });
    expect(listApi.datasources[0].query).toContain('row_version');
    expect(listApi.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'POS_PREPARATION_PRINTERS_UNAVAILABLE' });
    expect(detailApi.datasources[0].error_states.transport_error.status).toBe(503);
    expect(create).toMatchObject({ type: 'server_form', permission: 'pos.manage', operation: 'create', handler: 'yaml_mutation' });
    expect(action(detailApi, 'edit_pos_preparation_printer')).toMatchObject({ type: 'server_form', permission: 'pos.manage', operation: 'update', handler: 'yaml_mutation' });
    expect(action(detailApi, 'delete_pos_preparation_printer')).toMatchObject({ type: 'server', permission: 'pos.manage', operation: 'delete', handler: 'yaml_mutation' });
    expect(action(detailApi, 'pause_pos_preparation_printer')).toMatchObject({ type: 'server', permission: 'pos.manage', handler: 'order_transition', workflow: 'pos_preparation_printers' });
    expect(workflow.states.map((state: any) => state.id)).toEqual(['Connected', 'Paused', 'Disconnected']);
    expect(workflow.transitions.map((candidate: any) => candidate.id)).toEqual(['connect', 'pause', 'disconnect']);
    expect(detailPage.components[0].header_actions.map((candidate: any) => candidate.id)).toEqual(expect.arrayContaining([
      'edit_pos_preparation_printer', 'delete_pos_preparation_printer', 'connect_pos_preparation_printer',
      'pause_pos_preparation_printer', 'disconnect_pos_preparation_printer',
    ]));
  });

  test('returns deterministic fixtures plus explicit empty, missing, and transport-error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_preparation_printer_query', ['schema', 'data']);
    const listSource = yaml('api/pos-preparation-printers.yaml').datasources[0];
    const detailSource = yaml('api/pos-preparation-printer-detail.yaml').datasources[0];

    const rows = await repository.querySource(listSource, { q: null, fixture_state: null }, 0, 50);
    expect(rows.data).toHaveLength(3);
    expect(rows.data[0]).toMatchObject({ id: 'pos-printer-bar', name: 'Bar printer', row_version: 1, state: 'Connected' });
    expect(rows.data[0].last_seen).toContain('2026-01-15 11:35:00');
    expect((await repository.querySource(listSource, { q: 'does-not-exist', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(listSource, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(detailSource, { id: 'missing-printer', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detailSource, { id: 'pos-printer-bar', fixture_state: 'transport_error' }, 0, 1))
      .rejects.toMatchObject({ status: 503, code: 'POS_PREPARATION_PRINTER_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('guards create/update/delete and connection transitions with validation and stale versions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_preparation_printer_mutations', ['schema', 'data']);
    const listPage = yaml('pages/pos-preparation-printers.yaml');
    const detailApi = yaml('api/pos-preparation-printer-detail.yaml');
    const workflow = yaml('pages/pos-preparation-printer-workflow.yaml').workflow;
    const create = action({ actions: listPage.actions }, 'create_pos_preparation_printer');
    const edit = action(detailApi, 'edit_pos_preparation_printer');
    const remove = action(detailApi, 'delete_pos_preparation_printer');

    await expect(repository.executeMutation(create.mutation, { values: { name: '  ', printer_type: 'Epson TM-m30' } }))
      .rejects.toMatchObject({ status: 422, code: 'POS_PREPARATION_PRINTER_NAME_REQUIRED' });
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Expo printer', printer_type: 'Star TSP100' } }) as any;
    expect(created).toMatchObject({ name: 'Expo printer', printer_type: 'Star TSP100', state: 'Connected', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'expo PRINTER', printer_type: 'Network printer' } }))
      .rejects.toMatchObject({ status: 409, code: 'POS_PREPARATION_PRINTER_NAME_EXISTS' });

    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1,
      values: { name: 'Expo printer updated', printer_type: 'Star TSP100', proxy_ip: '192.168.10.40', categories: 'Seasonal, Drinks', state: 'Connected', active: true },
    }) as any;
    expect(edited).toMatchObject({ id: created.id, name: 'Expo printer updated', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, values: { name: 'Stale printer', printer_type: 'Star TSP100' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'missing-printer', expected_row_version: 1, values: { name: 'Missing', printer_type: 'Network' },
    })).rejects.toMatchObject({ status: 404, code: 'POS_PREPARATION_PRINTER_NOT_FOUND' });

    const pause = transition(workflow, 'pause');
    const disconnect = transition(workflow, 'disconnect');
    const connect = transition(workflow, 'connect');
    await repository.executeMutation(pause.mutation, { id: created.id, expected_row_version: 2 });
    await repository.executeMutation(disconnect.mutation, { id: created.id, expected_row_version: 3 });
    await expect(repository.executeMutation(pause.mutation, { id: created.id, expected_row_version: 4 }))
      .rejects.toMatchObject({ status: 409, code: 'POS_PREPARATION_PRINTER_INVALID_TRANSITION' });
    await repository.executeMutation(connect.mutation, { id: created.id, expected_row_version: 4 });
    await expect(repository.executeMutation(connect.mutation, { id: created.id, expected_row_version: 4 }))
      .rejects.toMatchObject({ status: 409, code: 'POS_PREPARATION_PRINTER_STALE' });

    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 5 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 5 }))
      .rejects.toMatchObject({ status: 404 });
    database.close();
  });
});

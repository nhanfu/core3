import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const listApi = () => yaml('api/operations.yaml');
const detailApi = () => yaml('api/operation-detail.yaml');
const action = (id: string) => [...listApi().actions, ...detailApi().actions].find((candidate: any) => candidate.id === id);

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  const migrations = join(serviceRoot, 'migrations');
  await migrateDatabase(repository, migrations, undefined, 'manufacturing_operations_test_migrations', ['schema', 'data']);
  await migrateDatabase(repository, migrations, undefined, 'manufacturing_operations_test_migrations', ['schema', 'data']);
  return { database, repository };
}

describe('Manufacturing Operations Odoo action parity', () => {
  test('keeps list/detail presentation-only and binds API fragments by page id', () => {
    const listPage = yaml('pages/operations.yaml');
    const detailPage = yaml('pages/operation-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(listPage.page).toMatchObject({ id: 'manufacturing-operations', route: '/operations' });
    expect(detailPage.page).toMatchObject({ id: 'manufacturing-operation-detail', route: '/operations/detail' });
    expect(listApi().page.id).toBe('manufacturing-operations');
    expect(detailApi().page.id).toBe('manufacturing-operation-detail');
    expect(discovered.pages.get('manufacturing-operations')?.config.page.id).toBe('manufacturing-operations');
    expect(discovered.pageDatasources.get('manufacturing-operations')).toEqual(['mrp_operations']);
    expect(discovered.pageDatasources.get('manufacturing-operation-detail')).toEqual(['mrp_operation_detail']);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/operations', page: 'manufacturing-operations', module: 'manufacturing' }),
      expect.objectContaining({ path: '/operations/detail', page: 'manufacturing-operation-detail', module: 'manufacturing' }),
    ]));
  });

  test('matches the installed action, menu, modes, fields, and visible Odoo labels', () => {
    const manifest = yaml('manifest.yaml');
    const configuration = manifest.menu.groups.find((group: any) => group.id === 'configuration');
    expect(configuration.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/operations', label: 'Operations', permission: 'manufacturing.read' }),
    ]));
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['manufacturing.read', 'manufacturing.write', 'manufacturing.manage']));

    const list = yaml('pages/operations.yaml').components[0];
    expect(list).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'mrp_operations', create_action: 'create_mrp_operation', row_open_action: 'view_mrp_operation', view_navigation: 'tabs' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban']);
    expect(list.views.find((view: any) => view.id === 'kanban')).toMatchObject({ label: 'Kanban' });
    expect(list.views.find((view: any) => view.id === 'kanban')).not.toHaveProperty('mobile', true);
    expect(list.columns.map((column: any) => column.label)).toEqual(['Operation', 'Bill of Material', 'Work Center', 'Duration (minutes)', 'Total Duration (minutes)', 'Company', 'Status', ' ']);
    expect(list.form_view.page).toBe('apps/services/manufacturing/pages/operation-detail.yaml');

    const detail = yaml('pages/operation-detail.yaml').components[0];
    expect(detail).toMatchObject({ type: 'OdooFormView', source: 'mrp_operation_detail', editable: true, title_field: 'name' });
    expect(detail.groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual(expect.arrayContaining([
      'Operation', 'Bill of Material', 'Work Center', 'Cost based on?', 'Duration Computation', 'Default Duration', 'Company',
    ]));
    expect(detailApi().datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'MRP_OPERATION_DETAIL_UNAVAILABLE' });
    expect(listApi().datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'MRP_OPERATIONS_UNAVAILABLE' });
    expect(action('view_mrp_operation')).toMatchObject({ type: 'navigate', permission: 'manufacturing.read', navigate_to: '/operations/detail' });
    expect(action('edit_mrp_operation').mutation.concurrency).toEqual({ required: true });
  });

  test('serves deterministic active, search, empty, detail, and unavailable fixtures', async () => {
    const { database, repository } = await repositoryForTest();
    const list = listApi().datasources[0];
    const params = { q: null, active: null, time_mode: null, fixture_state: null };

    expect((await repository.querySource(list, params, 0, 50)).data.map((row: any) => row.name)).toEqual([
      'Manual Assembly', 'Packing', 'Testing', 'Long time assembly', 'Assembly',
    ]);
    expect((await repository.querySource(list, { ...params, q: 'Drawer' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Packing', 'Testing', 'Long time assembly']);
    expect((await repository.querySource(list, { ...params, active: 'archived' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(list, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(list, { ...params, fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(list, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_OPERATIONS_UNAVAILABLE' });

    const detail = detailApi().datasources[0];
    expect((await repository.querySource(detail, { id: 'operation-manual-assembly', fixture_state: null }, 0, 1)).data).toMatchObject({ name: 'Manual Assembly', bom_name: '[FURN_8522] Table Top', time_cycle: 60, time_cycle_display: '60:00', time_mode_label: 'Fixed', cost_mode_label: 'Actual time' });
    expect((await repository.querySource(detail, { id: 'missing-operation', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'operation-manual-assembly', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'MRP_OPERATION_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('supports CRUD with validation, duplicate, stale, archive, in-use, and missing guards', async () => {
    const { database, repository } = await repositoryForTest();
    const create = action('create_mrp_operation');
    const edit = action('edit_mrp_operation');
    const archive = action('archive_mrp_operation');
    const unarchive = action('unarchive_mrp_operation');
    const remove = action('delete_mrp_operation');
    const values = { name: 'QA Finishing', active: true, sequence: 25, bom_id: 'bom-table-odoo', bom_name: '[FURN_9666] Table', workcenter_id: 'workcenter-assembly-1', workcenter_name: 'Assembly 1', time_mode: 'manual', time_mode_batch: 10, time_cycle_manual: 45, time_cycle: 45, time_total: 45, cost_mode: 'actual', cost: 0, apply_on_variants: '', blocked_by_operations: '', company_name: 'My Company (San Francisco)', workorder_count: 0 };

    const created = await repository.executeMutation(create.mutation, { id: 'operation-qa-finishing', values });
    expect(created).toMatchObject({ id: 'operation-qa-finishing', name: 'QA Finishing', row_version: 1, time_cycle_manual: 45 });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'qa finishing' } })).rejects.toMatchObject({ status: 409, code: 'MRP_OPERATION_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'Bad Duration', time_cycle_manual: -1 } })).rejects.toMatchObject({ status: 422, code: 'MRP_OPERATION_DURATION_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'Bad Mode', time_mode: 'unknown' } })).rejects.toMatchObject({ status: 422, code: 'MRP_OPERATION_MODE_INVALID' });

    const updated = await repository.executeMutation(edit.mutation, { id: 'operation-qa-finishing', expected_row_version: 1, values: { ...values, name: 'QA Finishing Updated', time_cycle_manual: 50 } });
    expect(updated).toMatchObject({ id: 'operation-qa-finishing', name: 'QA Finishing Updated', row_version: 2, time_cycle_manual: 50 });
    await expect(repository.executeMutation(edit.mutation, { id: 'operation-qa-finishing', expected_row_version: 1, values: { ...values, name: 'Stale Operation' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-operation', expected_row_version: 1, values })).rejects.toMatchObject({ status: 404, code: 'MRP_OPERATION_NOT_FOUND' });

    await repository.executeMutation(archive.mutation, { id: 'operation-qa-finishing', expected_row_version: 2, values: { active: false } });
    await expect(repository.executeMutation(archive.mutation, { id: 'operation-qa-finishing', expected_row_version: 3, values: { active: false } })).rejects.toMatchObject({ status: 409, code: 'MRP_OPERATION_ALREADY_ARCHIVED' });
    await repository.executeMutation(unarchive.mutation, { id: 'operation-qa-finishing', expected_row_version: 3, values: { active: true } });
    await repository.executeMutation(remove.mutation, { id: 'operation-qa-finishing', expected_row_version: 4 });
    await expect(repository.executeMutation(remove.mutation, { id: 'operation-qa-finishing', expected_row_version: 4 })).rejects.toMatchObject({ status: 404, code: 'MRP_OPERATION_NOT_FOUND' });
    await expect(repository.executeMutation(remove.mutation, { id: 'operation-manual-assembly', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'MRP_OPERATION_IN_USE' });
    database.close();
  });
});

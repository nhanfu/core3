import { describe, expect, test } from 'bun:test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const listApi = yaml('api/reordering-rules.yaml');
const detailApi = yaml('api/reordering-rule-detail.yaml');
const listPage = yaml('pages/reordering-rules.yaml');
const detailPage = yaml('pages/reordering-rule-detail.yaml');
const manifest = yaml('manifest.yaml');
const action = (id: string) => [...listApi.actions, ...detailApi.actions].find((candidate: any) => candidate.id === id);

async function repositoryForTest(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, `inventory_reordering_rules_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory Reordering Rules Odoo action parity', () => {
  test('maps stock.action_orderpoint to separate page/API contracts', () => {
    const discoveryRoot = mkdtempSync('/tmp/core3-inventory-reordering-rules-discovery-');
    mkdirSync(join(discoveryRoot, 'services'));
    cpSync(serviceRoot, join(discoveryRoot, 'services/inventory'), { recursive: true });
    const discovered = discoverPages(discoveryRoot);
    rmSync(discoveryRoot, { recursive: true, force: true });

    expect(listPage.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listApi.page).toEqual({ id: 'reordering-rules' });
    expect(detailApi.page).toEqual({ id: 'reordering-rule-detail' });
    expect(discovered.pageDatasources.get('reordering-rules')).toEqual([
      'inventory_reordering_rule_products',
      'inventory_reordering_rule_locations',
      'inventory_reordering_rule_warehouses',
      'inventory_reordering_rules',
    ]);
    expect(discovered.pageDatasources.get('reordering-rule-detail')).toEqual([
      'inventory_reordering_rule_detail',
      'inventory_reordering_rule_detail_products',
      'inventory_reordering_rule_detail_locations',
      'inventory_reordering_rule_detail_warehouses',
    ]);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/reordering-rules', page: 'reordering-rules', module: 'inventory' }),
      expect.objectContaining({ path: '/reordering-rules/detail', page: 'reordering-rule-detail', module: 'inventory' }),
    ]));
    expect(listPage.components[0]).toMatchObject({
      source: 'inventory_reordering_rules',
      create_action: 'create_inventory_reordering_rule',
      row_open_action: 'view_inventory_reordering_rule',
    });
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'inventory_reordering_rule_detail' });
    expect(manifest.menu.groups.find((group: any) => group.id === 'procurement').items)
      .toContainEqual(expect.objectContaining({ path: '/reordering-rules', label: 'Reordering Rules', permission: 'inventory.read' }));
    expect(action('edit_inventory_reordering_rule')).toMatchObject({
      type: 'server_form',
      permission: 'inventory.manage',
      handler: 'yaml_mutation',
    });
  });

  test('reads automatic rules by company and exposes archived, empty, and deterministic states', async () => {
    const { database, repository } = await repositoryForTest();
    const source = listApi.datasources.find((candidate: any) => candidate.id === 'inventory_reordering_rules');
    const params = { q: null, active: 'active', trigger: 'auto', current_company_name: 'My Company (San Francisco)', fixture_state: null };

    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['orderpoint-storage-box-auto']);
    expect((await repository.querySource(source, { ...params, active: 'archived' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['orderpoint-reorder-archived']);
    expect((await repository.querySource(source, { ...params, active: 'all', trigger: 'manual', q: 'Desk' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['orderpoint-desk-right', 'orderpoint-desk-left']);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('enforces manager CRUD, orderpoint uniqueness, min/max validation, company scope, archive, restore, and stale versions', async () => {
    const { database, repository } = await repositoryForTest();
    const create = action('create_inventory_reordering_rule');
    const values = {
      product_name: '[E-COM10] Pedal Bin',
      location_name: 'WH/Stock/Shelf 2',
      warehouse_name: 'WH',
      min_qty: 4,
      max_qty: 12,
      trigger: 'auto',
      route: 'Buy',
      company_name: 'My Company (San Francisco)',
    };

    expect([...listApi.datasources, ...detailApi.datasources].filter((source: any) => source.id.includes('reordering')).every((source: any) => source.permission === 'inventory.read')).toBe(true);
    await expect(repository.executeMutation(create.mutation, { id: 'reorder-duplicate', current_company_name: 'My Company (San Francisco)', values: { ...values, product_name: '[E-COM08] Storage Box', location_name: 'WH/Stock/Shelf 1' } })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_REORDERING_RULE_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { id: 'reorder-invalid-range', current_company_name: 'My Company (San Francisco)', values: { ...values, max_qty: 3 } })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_REORDERING_RULE_RANGE_INVALID' });
    await expect(repository.executeMutation(create.mutation, { id: 'reorder-other-company', current_company_name: 'My Company (San Francisco)', values: { ...values, company_name: 'Other Company' } })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_REORDERING_RULE_COMPANY_FORBIDDEN' });

    const created = await repository.executeMutation(create.mutation, { id: 'reorder-qa', current_company_name: 'My Company (San Francisco)', values });
    expect(created).toMatchObject({ id: 'reordering-rule-e-com10-pedal-bin-wh-stock-shelf-2', product_id: 'stock-report-pedal-bin', trigger: 'auto', row_version: 1, active: true });

    const detail = detailApi.datasources.find((candidate: any) => candidate.id === 'inventory_reordering_rule_detail');
    expect(await repository.querySource(detail, { id: created.id, current_company_name: 'My Company (San Francisco)' }, 0, 1)).toMatchObject({
      data: expect.objectContaining({ product_name: '[E-COM10] Pedal Bin', min_qty: 4, max_qty: 12 }),
    });

    const edit = action('edit_inventory_reordering_rule');
    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id,
      expected_row_version: 1,
      current_company_name: 'My Company (San Francisco)',
      values: { ...values, min_qty: 5, max_qty: 15, trigger: 'manual' },
    });
    expect(edited).toMatchObject({ id: created.id, min_qty: 5, max_qty: 15, trigger: 'manual', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, {
      id: created.id,
      expected_row_version: 1,
      current_company_name: 'My Company (San Francisco)',
      values: { ...values, min_qty: 7, max_qty: 20 },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const archived = await repository.executeMutation(action('archive_inventory_reordering_rule').mutation, {
      id: created.id,
      expected_row_version: 2,
      current_company_name: 'My Company (San Francisco)',
      values: { active: false },
    });
    expect(archived).toMatchObject({ id: created.id, active: false, row_version: 3 });
    const restored = await repository.executeMutation(action('restore_inventory_reordering_rule').mutation, {
      id: created.id,
      expected_row_version: 3,
      current_company_name: 'My Company (San Francisco)',
      values: { active: true },
    });
    expect(restored).toMatchObject({ id: created.id, active: true, row_version: 4 });
    await repository.executeMutation(action('delete_inventory_reordering_rule').mutation, {
      id: created.id,
      expected_row_version: 4,
      current_company_name: 'My Company (San Francisco)',
    });
    expect(await repository.query('SELECT id FROM inventory_orderpoints WHERE id = ?', [created.id])).toEqual([]);
    database.close();
  });

  test('persists the seeded archived rule through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-inventory-reordering-rules-${crypto.randomUUID()}.duckdb`;
    const first = await repositoryForTest(databasePath);
    expect(await first.repository.query('SELECT id, active, trigger FROM inventory_orderpoints WHERE id = ?', ['orderpoint-reorder-archived']))
      .toEqual([{ id: 'orderpoint-reorder-archived', active: false, trigger: 'auto' }]);
    first.database.close();

    const second = await repositoryForTest(databasePath);
    expect(await second.repository.query('SELECT id, active, trigger FROM inventory_orderpoints WHERE id = ?', ['orderpoint-reorder-archived']))
      .toEqual([{ id: 'orderpoint-reorder-archived', active: false, trigger: 'auto' }]);
    second.database.close();
    rmSync(databasePath, { force: true });
  });
});

import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = () => yaml('api/transfer-new.yaml').actions.find((candidate: any) => candidate.id === 'create_inventory_transfer');

async function repositoryForTest(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, `inventory_transfer_new_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory Overview New Transfer source-backed draft workflow', () => {
  test('keeps the page/API split and binds the source New action to the overview card', () => {
    const page = yaml('pages/transfer-new.yaml');
    const api = yaml('api/transfer-new.yaml');
    const overview = yaml('pages/overview.yaml');
    const overviewApi = yaml('api/overview.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_picking_views.xml', 'utf8');

    expect(page.page).toMatchObject({ id: 'transfer-new', route: '/inventory/transfer/new' });
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'inventory_transfer_new', initial_editing: true });
    expect(page.components[0].header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'create_inventory_transfer', permission: 'inventory.write' }),
    ]));
    expect(api.datasources.map((item: any) => item.id)).toEqual(expect.arrayContaining([
      'inventory_transfer_new', 'inventory_transfer_new_operation_types', 'inventory_transfer_new_locations', 'inventory_transfer_new_runs',
    ]));
    expect(overview.components[0].views[0].card.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'new_inventory_transfer', label: 'New' }),
    ]));
    expect(overviewApi.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'new_inventory_transfer', navigate_to: '/inventory/transfer/new' }),
    ]));
    expect(source).toContain('<record id="action_picking_form" model="ir.actions.act_window">');
    expect(source).toContain("'default_picking_type_id': active_id");
    expect(source).toContain('<field name="scheduled_date"');
    expect(source).toContain('<create string="Add a Product"/>');
  });

  test('loads operation-type defaults and stable options for a new draft form', async () => {
    const { database, repository } = await repositoryForTest();
    const api = yaml('api/transfer-new.yaml');
    const form = api.datasources.find((item: any) => item.id === 'inventory_transfer_new');
    const types = api.datasources.find((item: any) => item.id === 'inventory_transfer_new_operation_types');
    const locations = api.datasources.find((item: any) => item.id === 'inventory_transfer_new_locations');

    expect(await repository.querySource(form, { operation_type_id: 'operation-deliveries', current_company_name: 'My Company (San Francisco)' }, 0, 1)).toMatchObject({
      data: { operation_type_id: 'operation-deliveries', operation_type_name: 'Deliveries', source_location_id: 'location-stock', destination_location_id: 'location-customer', state: 'Draft' },
    });
    expect((await repository.querySource(types, { current_company_name: 'My Company (San Francisco)' }, 0, 20)).data.map((row: any) => row.value)).toEqual(expect.arrayContaining([
      'operation-receipts', 'operation-deliveries', 'operation-internal',
    ]));
    expect((await repository.querySource(locations, {}, 0, 20)).data.length).toBeGreaterThan(2);
    database.close();
  });

  test('creates one durable company-scoped Draft transfer and audit message', async () => {
    const { database, repository } = await repositoryForTest();
    const mutation = action().mutation;
    const created = await repository.executeMutation(mutation, {
      operation_type_id: 'operation-deliveries',
      name: 'WH/OUT/NEW-0001',
      contact_name: 'QA Partner',
      scheduled_date: '2026-01-21',
      source_document: 'SO/NEW-0001',
      company_name: 'My Company (San Francisco)',
      current_company_name: 'My Company (San Francisco)',
      source_location_id: 'location-stock',
      destination_location_id: 'location-customer',
      current_user_name: 'Inventory QA',
    }) as any;

    expect(created).toMatchObject({ id: 'transfer-new-1', name: 'WH/OUT/NEW-0001', operation_type_id: 'operation-deliveries', state: 'Draft' });
    expect(await repository.query('SELECT picking_id, created_by FROM inventory_transfer_create_runs WHERE picking_id = ?', [created.id])).toEqual([
      { picking_id: 'transfer-new-1', created_by: 'Inventory QA' },
    ]);
    expect(await repository.query('SELECT action, detail FROM inventory_transfer_messages WHERE picking_id = ?', [created.id])).toEqual([
      { action: 'inventory.transfer.created', detail: 'Draft transfer created from the Inventory Overview.' },
    ]);
    database.close();
  });

  test('rejects invalid, duplicate, wrong-company, anonymous, and same-location requests and survives restart', async () => {
    const databasePath = `/tmp/core3-inventory-transfer-new-${crypto.randomUUID()}.duckdb`;
    const first = await repositoryForTest(databasePath);
    const mutation = action().mutation;
    const base = {
      operation_type_id: 'operation-receipts', name: 'WH/IN/NEW-RESTART', scheduled_date: '2026-01-22',
      company_name: 'My Company (San Francisco)', current_company_name: 'My Company (San Francisco)',
      source_location_id: 'location-customer', destination_location_id: 'location-stock', current_user_name: 'Restart Operator',
    };
    await first.repository.executeMutation(mutation, base);
    await expect(first.repository.executeMutation(mutation, { ...base, source_location_id: 'location-customer' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_NEW_REFERENCE_EXISTS' });
    await expect(first.repository.executeMutation(mutation, { ...base, name: 'WH/IN/NEW-SAME', destination_location_id: 'location-customer' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_TRANSFER_NEW_LOCATIONS_INVALID' });
    await expect(first.repository.executeMutation(mutation, { ...base, name: 'WH/IN/NEW-WRONG-COMPANY', company_name: 'Other Company' })).rejects.toMatchObject({ status: 403 });
    await expect(first.repository.executeMutation(mutation, { ...base, name: 'WH/IN/NEW-ANON', current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_NEW_ACTOR_REQUIRED' });
    first.database.close();

    const second = await repositoryForTest(databasePath);
    expect(await second.repository.query('SELECT name, state FROM inventory_pickings WHERE id = ?', ['transfer-new-1'])).toEqual([
      { name: 'WH/IN/NEW-RESTART', state: 'Draft' },
    ]);
    expect(await second.repository.query('SELECT COUNT(*) AS count FROM inventory_transfer_create_runs')).toEqual([{ count: 1 }]);
    second.database.close();
    rmSync(databasePath, { force: true });
    rmSync(`${databasePath}.wal`, { force: true });
  });
});

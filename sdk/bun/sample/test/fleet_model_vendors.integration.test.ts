import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((entry: any) => entry.id === id);

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
}

describe('Fleet model vendor assignment parity', () => {
  test('maps the Odoo model vendors notebook and keeps the page/API seam explicit', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/models/fleet_vehicle_model.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_model_views.xml', 'utf8');
    const page = yaml('pages/model-detail.yaml');
    const api = yaml('api/model-detail.yaml');
    const form = page.components.find((entry: any) => entry.type === 'OdooFormView');
    const vendors = page.components.find((entry: any) => entry.type === 'LineItemGrid');

    expect(model).toContain("vendors = fields.Many2many('res.partner'");
    expect(view).toContain('<page string="Vendors" name="vendors">');
    expect(view).toContain('<field name="vendors">');
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.map((entry: any) => entry.id)).toEqual(expect.arrayContaining([
      'fleet_model_detail',
      'fleet_model_vendor_options',
      'fleet_model_vendor_assignments',
    ]));
    expect(api.datasources.find((entry: any) => entry.id === 'fleet_model_detail').query).toContain('fleet_vehicle_model_vendors');
    expect(action(api, 'add_fleet_model_vendor')).toMatchObject({ permission: 'fleet.manage', handler: 'line_item', operation: 'create' });
    expect(action(api, 'remove_fleet_model_vendor')).toMatchObject({ permission: 'fleet.manage', handler: 'line_item', operation: 'delete' });
    expect(form).toMatchObject({ type: 'OdooFormView', source: 'fleet_model_detail', content_slot: 'model-vendors' });
    expect(vendors).toMatchObject({ type: 'LineItemGrid', source: 'fleet_model_vendor_assignments', parent_source: 'fleet_model_detail', mount_in: 'previous-panel' });
    expect(vendors.actions).toContainEqual(expect.objectContaining({ id: 'add_fleet_model_vendor' }));
    expect(vendors.children).toContainEqual(expect.objectContaining({ id: 'fleet_model_vendor_actions' }));
  });

  test('assigns and removes vendors durably with deterministic catalog and projections', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'fleet_model_vendors_crud');
    await migrate(repository, 'fleet_model_vendors_crud');
    const api = yaml('api/model-detail.yaml');
    const detail = api.datasources.find((entry: any) => entry.id === 'fleet_model_detail');
    const assignments = api.datasources.find((entry: any) => entry.id === 'fleet_model_vendor_assignments');
    const options = api.datasources.find((entry: any) => entry.id === 'fleet_model_vendor_options');
    const add = action(api, 'add_fleet_model_vendor');
    const remove = action(api, 'remove_fleet_model_vendor');

    expect((await repository.querySource(options, { id: 'fleet-model-001' }, 0, 50)).data).toEqual([
      { value: 'fleet-vendor-003', label: 'Green Road Motors · hello@greenroad.example' },
    ]);
    expect((await repository.querySource(assignments, { id: 'fleet-model-001' }, 0, 50)).data).toEqual([
      expect.objectContaining({ vendor_id: 'fleet-vendor-001', name: 'Acme Mobility Parts' }),
      expect.objectContaining({ vendor_id: 'fleet-vendor-002', name: 'Northwind Fleet Services' }),
    ]);
    expect(await repository.querySource(detail, { id: 'fleet-model-001' }, 0, 1)).toMatchObject({
      data: { vendor_summary: 'Acme Mobility Parts, Northwind Fleet Services', row_version: 1 },
    });

    await repository.executeMutation(add.mutation, { id: 'fleet-model-001', vendor_id: 'fleet-vendor-003', parent_expected_row_version: 1, current_user_id: 'user-admin' });
    expect(await repository.querySource(detail, { id: 'fleet-model-001' }, 0, 1)).toMatchObject({
      data: { vendor_summary: 'Acme Mobility Parts, Green Road Motors, Northwind Fleet Services', row_version: 2 },
    });
    await repository.executeMutation(remove.mutation, { id: 'fleet-model-001', vendor_id: 'fleet-vendor-001', parent_expected_row_version: 2, current_user_id: 'user-admin' });
    expect((await repository.querySource(assignments, { id: 'fleet-model-001' }, 0, 50)).data).not.toContainEqual(expect.objectContaining({ vendor_id: 'fleet-vendor-001' }));
    expect(await repository.querySource(detail, { id: 'fleet-model-001' }, 0, 1)).toMatchObject({ data: { row_version: 3 } });
    await database.close();
  });

  test('rejects actor, stale, invalid, duplicate, archived, missing, and stale-removal changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'fleet_model_vendors_guards');
    const api = yaml('api/model-detail.yaml');
    const add = action(api, 'add_fleet_model_vendor');
    const remove = action(api, 'remove_fleet_model_vendor');
    const base = { id: 'fleet-model-001', vendor_id: 'fleet-vendor-003', parent_expected_row_version: 1, current_user_id: 'user-admin' };

    await expect(repository.executeMutation(add.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'FLEET_MODEL_VENDOR_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(add.mutation, { ...base, parent_expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(add.mutation, { ...base, vendor_id: 'missing-vendor' })).rejects.toMatchObject({ status: 422, code: 'FLEET_MODEL_VENDOR_INVALID' });
    await expect(repository.executeMutation(add.mutation, { ...base, vendor_id: 'fleet-vendor-001' })).rejects.toMatchObject({ status: 409, code: 'FLEET_MODEL_VENDOR_EXISTS' });
    await expect(repository.executeMutation(add.mutation, { ...base, id: 'fleet-model-006', vendor_id: 'fleet-vendor-001' })).rejects.toMatchObject({ status: 404, code: 'FLEET_MODEL_VENDOR_MODEL_NOT_FOUND' });
    await expect(repository.executeMutation(add.mutation, { ...base, id: 'missing-model', vendor_id: 'fleet-vendor-001' })).rejects.toMatchObject({ status: 404, code: 'FLEET_MODEL_VENDOR_MODEL_NOT_FOUND' });
    await expect(repository.executeMutation(remove.mutation, { ...base, vendor_id: 'fleet-vendor-003' })).rejects.toMatchObject({ status: 409, code: 'FLEET_MODEL_VENDOR_STALE' });
    expect(await repository.query("SELECT row_version FROM fleet_vehicle_models WHERE id = 'fleet-model-001'")).toEqual([{ row_version: 1 }]);
    expect(await repository.query("SELECT vendor_id FROM fleet_vehicle_model_vendors WHERE model_id = 'fleet-model-001' ORDER BY vendor_id")).toEqual([
      { vendor_id: 'fleet-vendor-001' },
      { vendor_id: 'fleet-vendor-002' },
    ]);
    await database.close();
  });

  test('preserves assignments through file-backed restart and migration replay', async () => {
    const databasePath = `/tmp/core3-fleet-model-vendors-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'fleet_model_vendors_restart');
    const add = action(yaml('api/model-detail.yaml'), 'add_fleet_model_vendor');
    await firstRepository.executeMutation(add.mutation, { id: 'fleet-model-002', vendor_id: 'fleet-vendor-001', parent_expected_row_version: 1, current_user_id: 'user-admin' });
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'fleet_model_vendors_restart');
    expect(await secondRepository.query("SELECT vendor_id FROM fleet_vehicle_model_vendors WHERE model_id = 'fleet-model-002' ORDER BY vendor_id")).toEqual([
      { vendor_id: 'fleet-vendor-001' },
      { vendor_id: 'fleet-vendor-003' },
    ]);
    const detail = yaml('api/model-detail.yaml').datasources.find((entry: any) => entry.id === 'fleet_model_detail');
    expect(await secondRepository.querySource(detail, { id: 'fleet-model-002' }, 0, 1)).toMatchObject({ data: { vendor_summary: 'Acme Mobility Parts, Green Road Motors' } });
    await second.close();
    rmSync(databasePath, { force: true });
  });
});

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

describe('Fleet vehicle tag assignment parity', () => {
  test('maps Odoo tag_ids and keeps the vehicle page/API seam explicit', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/models/fleet_vehicle.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml', 'utf8');
    const page = yaml('pages/vehicle-detail.yaml');
    const api = yaml('api/vehicle-detail.yaml');
    const form = page.components[0];
    const tags = page.components[1];

    expect(model).toContain("tag_ids = fields.Many2many('fleet.vehicle.tag'");
    expect(view).toContain('<field name="tag_ids" widget="many2many_tags"');
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.map((entry: any) => entry.id)).toEqual(expect.arrayContaining(['fleet_vehicle_detail', 'fleet_vehicle_tag_options', 'fleet_vehicle_tag_assignments']));
    expect(api.datasources.find((entry: any) => entry.id === 'fleet_vehicle_detail').query).toContain('fleet_vehicle_tag_rel');
    expect(action(api, 'add_fleet_vehicle_tag')).toMatchObject({ permission: 'fleet.write', handler: 'line_item', operation: 'create' });
    expect(action(api, 'remove_fleet_vehicle_tag')).toMatchObject({ permission: 'fleet.write', handler: 'line_item', operation: 'delete' });
    expect(form).toMatchObject({ type: 'OdooFormView', source: 'fleet_vehicle_detail', content_slot: 'vehicle-tags' });
    expect(tags).toMatchObject({ type: 'LineItemGrid', source: 'fleet_vehicle_tag_assignments', parent_source: 'fleet_vehicle_detail', mount_in: 'previous-panel' });
    expect(tags.actions).toContainEqual(expect.objectContaining({ id: 'add_fleet_vehicle_tag' }));
    expect(tags.children).toContainEqual(expect.objectContaining({ id: 'fleet_vehicle_tag_actions' }));
  });

  test('assigns and removes tags durably with deterministic options and projections', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'fleet_vehicle_tags_crud');
    await migrate(repository, 'fleet_vehicle_tags_crud');
    const api = yaml('api/vehicle-detail.yaml');
    const detail = api.datasources.find((entry: any) => entry.id === 'fleet_vehicle_detail');
    const assignments = api.datasources.find((entry: any) => entry.id === 'fleet_vehicle_tag_assignments');
    const options = api.datasources.find((entry: any) => entry.id === 'fleet_vehicle_tag_options');
    const add = action(api, 'add_fleet_vehicle_tag');
    const remove = action(api, 'remove_fleet_vehicle_tag');

    expect((await repository.querySource(options, { id: 'fleet-demo-001', current_company_name: 'Core3 Demo Company' }, 0, 50)).data).toEqual([
      { value: 'fleet-tag-001', label: 'Junior' },
      { value: 'fleet-tag-002', label: 'Senior' },
    ]);
    expect((await repository.querySource(assignments, { id: 'fleet-demo-001', current_company_name: 'Core3 Demo Company' }, 0, 50)).data).toEqual([
      expect.objectContaining({ tag_id: 'fleet-tag-003', name: 'Employee Car', color: 3 }),
      expect.objectContaining({ tag_id: 'fleet-tag-004', name: 'Purchased', color: 4 }),
    ]);
    expect(await repository.querySource(detail, { id: 'fleet-demo-001', current_company_name: 'Core3 Demo Company' }, 0, 1)).toMatchObject({ data: { tag_ids: ['fleet-tag-003', 'fleet-tag-004'], tag_names: 'Employee Car, Purchased', row_version: 1 } });

    await repository.executeMutation(add.mutation, { id: 'fleet-demo-001', tag_id: 'fleet-tag-001', parent_expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_id: 'user-admin' });
    expect(await repository.querySource(detail, { id: 'fleet-demo-001', current_company_name: 'Core3 Demo Company' }, 0, 1)).toMatchObject({ data: { tag_ids: ['fleet-tag-001', 'fleet-tag-003', 'fleet-tag-004'], tag_names: 'Employee Car, Junior, Purchased', row_version: 2 } });
    await repository.executeMutation(remove.mutation, { id: 'fleet-demo-001', tag_id: 'fleet-tag-003', parent_expected_row_version: 2, current_company_name: 'Core3 Demo Company', current_user_id: 'user-admin' });
    expect((await repository.querySource(assignments, { id: 'fleet-demo-001', current_company_name: 'Core3 Demo Company' }, 0, 50)).data).not.toContainEqual(expect.objectContaining({ tag_id: 'fleet-tag-003' }));
    await database.close();
  });

  test('rejects actor, stale, cross-company, invalid, duplicate, archived, and missing relation changes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'fleet_vehicle_tags_guards');
    const api = yaml('api/vehicle-detail.yaml');
    const add = action(api, 'add_fleet_vehicle_tag');
    const remove = action(api, 'remove_fleet_vehicle_tag');
    const base = { id: 'fleet-demo-001', tag_id: 'fleet-tag-001', parent_expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_id: 'user-admin' };

    await expect(repository.executeMutation(add.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'FLEET_VEHICLE_TAG_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(add.mutation, { ...base, parent_expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(add.mutation, { ...base, current_company_name: 'Core3 Vietnam' })).rejects.toMatchObject({ status: 404, code: 'FLEET_VEHICLE_TAG_VEHICLE_NOT_FOUND' });
    await expect(repository.executeMutation(add.mutation, { ...base, tag_id: 'missing-tag' })).rejects.toMatchObject({ status: 422, code: 'FLEET_VEHICLE_TAG_INVALID' });
    await expect(repository.executeMutation(add.mutation, { ...base, tag_id: 'fleet-tag-003' })).rejects.toMatchObject({ status: 409, code: 'FLEET_VEHICLE_TAG_EXISTS' });
    await expect(repository.executeMutation(remove.mutation, { ...base, tag_id: 'fleet-tag-001' })).rejects.toMatchObject({ status: 409, code: 'FLEET_VEHICLE_TAG_STALE' });
    await expect(repository.executeMutation(add.mutation, { ...base, id: 'fleet-demo-004' })).rejects.toMatchObject({ status: 404, code: 'FLEET_VEHICLE_TAG_VEHICLE_NOT_FOUND' });
    expect(await repository.query("SELECT row_version FROM fleet_vehicles WHERE id = 'fleet-demo-001'")).toEqual([{ row_version: 1 }]);
    expect(await repository.query("SELECT tag_id FROM fleet_vehicle_tag_rel WHERE vehicle_id = 'fleet-demo-001' ORDER BY tag_id")).toEqual([{ tag_id: 'fleet-tag-003' }, { tag_id: 'fleet-tag-004' }]);
    await database.close();
  });

  test('preserves assignments through file-backed restart and migration replay', async () => {
    const databasePath = `/tmp/core3-fleet-vehicle-tags-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'fleet_vehicle_tags_restart');
    const add = action(yaml('api/vehicle-detail.yaml'), 'add_fleet_vehicle_tag');
    await firstRepository.executeMutation(add.mutation, { id: 'fleet-demo-002', tag_id: 'fleet-tag-001', parent_expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_id: 'user-admin' });
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'fleet_vehicle_tags_restart');
    expect(await secondRepository.query("SELECT tag_id FROM fleet_vehicle_tag_rel WHERE vehicle_id = 'fleet-demo-002' ORDER BY tag_id")).toEqual([{ tag_id: 'fleet-tag-001' }, { tag_id: 'fleet-tag-003' }]);
    expect(await secondRepository.querySource(yaml('api/vehicle-detail.yaml').datasources[0], { id: 'fleet-demo-002', current_company_name: 'Core3 Demo Company' }, 0, 1)).toMatchObject({ data: { tag_names: 'Employee Car, Junior', row_version: 2 } });
    await second.close();
    rmSync(databasePath, { force: true });
  });
});

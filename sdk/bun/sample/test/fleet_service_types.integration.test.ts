import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

describe('Fleet Service Types configuration parity', () => {
  test('maps Odoo action 759 and keeps list/form page/API joins explicit', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml', 'utf8');
    const access = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/security/ir.model.access.csv', 'utf8');
    expect(source).toContain("id='fleet_vehicle_service_types_action'");
    expect(source).toContain('<field name="res_model">fleet.service.type</field>');
    expect(source).toContain('<field name="view_mode">list,form</field>');
    expect(source).toContain('search_default_groupby_category');
    expect(source).toContain('<list string="Service Types" editable="bottom">');
    expect(source).toContain('<field name="category"/>');
    expect(access).toContain('model_fleet_service_type,fleet_group_user,1,0,0,0');
    expect(access).toContain('model_fleet_service_type,fleet_group_manager,1,1,1,1');

    const page = yaml('pages/service-types.yaml');
    const detail = yaml('pages/service-type-detail.yaml');
    const api = yaml('api/service-types.yaml');
    const detailApi = yaml('api/service-type-detail.yaml');
    const configuration = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration');
    expect(configuration.items).toContainEqual({ path: '/fleet/config/service-types', label: 'Types', icon: 'tools', permission: 'fleet.manage' });
    expect(page.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'fleet-service-types', route: '/fleet/config/service-types', auth: { require: ['fleet.read'] } });
    expect(detail.page).toMatchObject({ id: 'fleet-service-type-detail', route: '/fleet/config/service-types/detail' });
    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detail.page.id);
    expect(page.components[0]).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'fleet_config_service_types', default_group_by: 'category' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form']);
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual(['Name', 'Category']);
    expect(detail.components[0]).toMatchObject({ type: 'OdooFormView', source: 'fleet_service_type_detail', editable: true });
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('fleet-service-types')).toEqual(['fleet_config_service_types']);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('fleet-service-type-detail')).toEqual(['fleet_service_type_detail']);
    expect(discoverPageRoutes(discoverPages(join(import.meta.dir, '..')))).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/fleet/config/service-types', page: 'fleet-service-types', module: 'fleet' }),
      expect.objectContaining({ path: '/fleet/config/service-types/detail', page: 'fleet-service-type-detail', module: 'fleet' }),
    ]));
    expect(api.datasources[0].permission).toBe('fleet.read');
    expect(detailApi.datasources[0].permission).toBe('fleet.read');
    expect([action(api, 'create_fleet_service_type_inline'), action(api, 'update_fleet_service_type_inline'), action(api, 'delete_fleet_service_type'), action(detailApi, 'edit_fleet_service_type_detail'), action(detailApi, 'delete_fleet_service_type_detail')].every((entry: any) => entry.permission === 'fleet.manage')).toBe(true);
  });

  test('seeds the live 3 Contract / 71 Service rows idempotently and supports grouping, filters, and errors', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'fleet_service_type_state_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'fleet_service_type_state_migrations', ['schema', 'data']);
    const source = yaml('api/service-types.yaml').datasources[0];
    const all = await repository.querySource(source, { q: null, category: null, fixture_state: null }, 0, 100);
    expect(all.data).toHaveLength(74);
    expect(all.data.filter((row: any) => row.category === 'contract')).toHaveLength(3);
    expect(all.data.filter((row: any) => row.category === 'service')).toHaveLength(71);
    expect(all.data.slice(0, 3).map((row: any) => [row.name, row.category_label])).toEqual([
      ['Leasing', 'Contract'], ['Omnium', 'Contract'], ['Repairing', 'Contract'],
    ]);
    expect(all.data.every((row: any) => row.row_version === 1 && row.active === true)).toBe(true);
    expect((await repository.querySource(source, { q: 'wheel', category: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Wheel Alignment', 'Wheel Bearing Replacement']);
    expect((await repository.querySource(source, { q: null, category: 'contract', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Leasing', 'Omnium', 'Repairing']);
    expect((await repository.querySource(source, { q: null, category: 'service', fixture_state: null }, 0, 100)).data).toHaveLength(71);
    expect((await repository.querySource(source, { q: null, category: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, category: null, fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, category: null, fixture_state: 'unauthorized' }, 0, 50)).rejects.toMatchObject({ status: 401, code: 'FLEET_SERVICE_TYPES_UNAUTHORIZED' });
    await expect(repository.querySource(source, { q: null, category: null, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'FLEET_SERVICE_TYPES_FORBIDDEN' });
    await expect(repository.querySource(source, { q: null, category: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'FLEET_SERVICE_TYPES_UNAVAILABLE' });
    database.close();
  });

  test('enforces manager CRUD, category/name validation, stale writes, and in-use deletion guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_service_type_mutation_migrations', ['schema', 'data']);
    const api = yaml('api/service-types.yaml');
    const detailApi = yaml('api/service-type-detail.yaml');
    const create = action(api, 'create_fleet_service_type_inline');
    const update = action(api, 'update_fleet_service_type_inline');
    const remove = action(api, 'delete_fleet_service_type');
    expect(create.permission).toBe('fleet.manage');
    expect(update.mutation.concurrency.required).toBe(true);
    expect(remove.mutation.concurrency.required).toBe(true);

    const created = await repository.executeMutation(create.mutation, { values: { name: 'Core3 Dispatch', category: 'service' } });
    expect(created).toMatchObject({ id: 'fleet-service-type-custom-core3-dispatch', row_version: 1, name: 'Core3 Dispatch', category: 'service' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'refueling', category: 'service' } })).rejects.toMatchObject({ status: 409, code: 'FLEET_SERVICE_TYPE_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' ', category: 'service' } })).rejects.toMatchObject({ status: 422, code: 'FLEET_SERVICE_TYPE_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Bad category', category: 'other' } })).rejects.toMatchObject({ status: 422, code: 'FLEET_SERVICE_TYPE_CATEGORY_INVALID' });

    const edited = await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Core3 Dispatch Updated', category: 'contract' } });
    expect(edited).toMatchObject({ row_version: 2, name: 'Core3 Dispatch Updated', category: 'contract' });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale type', category: 'service' } })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 2, values: { name: 'Omnium', category: 'contract' } })).rejects.toMatchObject({ status: 409, code: 'FLEET_SERVICE_TYPE_EXISTS' });
    await expect(repository.executeMutation(update.mutation, { id: 'missing-service-type', expected_row_version: 1, values: { name: 'Missing', category: 'service' } })).rejects.toMatchObject({ status: 404, code: 'FLEET_SERVICE_TYPE_NOT_FOUND' });

    await expect(repository.executeMutation(remove.mutation, { id: 'fleet-service-type-repair', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'FLEET_SERVICE_TYPE_IN_USE' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'FLEET_SERVICE_TYPE_NOT_FOUND' });
    expect(action(detailApi, 'edit_fleet_service_type_detail').mutation.concurrency.required).toBe(true);
    database.close();
  });

  test('keeps service type fixtures fixed and avoids current-time or generated UUID values', () => {
    const schema = readFileSync(join(root, 'migrations/20260911270000-027-fleet-service-types-schema.yaml'), 'utf8');
    const data = readFileSync(join(root, 'migrations/20260911271000-028-fleet-service-types-data.yaml'), 'utf8');
    expect(schema).toContain('fleet_service_types_category_name_idx');
    expect(data).toContain("'fleet-service-type-repairing'");
    expect(`${schema}\n${data}\n${readFileSync(join(root, 'api/service-types.yaml'), 'utf8')}`).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(`${schema}\n${data}\n${readFileSync(join(root, 'api/service-types.yaml'), 'utf8')}`).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});

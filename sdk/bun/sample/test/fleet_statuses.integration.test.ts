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

describe('Fleet Vehicle Status configuration parity', () => {
  test('maps Odoo fleet_vehicle_state_action and keeps list/detail page/API joins explicit', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml', 'utf8');
    const access = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/security/ir.model.access.csv', 'utf8');
    expect(source).toContain("id='fleet_vehicle_state_action'");
    expect(source).toContain('<field name="name">Status</field>');
    expect(source).toContain('<field name="view_mode">list,form</field>');
    expect(source).toContain('<field name="name" />');
    expect(source).toContain('<field name="fold"/>');
    expect(access).toContain('model_fleet_vehicle_state,fleet_group_user,1,0,0,0');
    expect(access).toContain('model_fleet_vehicle_state,fleet_group_manager,1,1,1,1');

    const page = yaml('pages/statuses.yaml');
    const detail = yaml('pages/fleet-status-detail.yaml');
    const api = yaml('api/statuses.yaml');
    const detailApi = yaml('api/status-detail.yaml');
    const configuration = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration');
    expect(configuration.items).toContainEqual({ path: '/fleet/config/statuses', label: 'Status', icon: 'workflow', permission: 'fleet.manage' });
    expect(page.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'fleet-statuses', route: '/fleet/config/statuses', auth: { require: ['fleet.read'] } });
    expect(detail.page).toMatchObject({ id: 'fleet-status-detail', route: '/fleet/config/statuses/detail' });
    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detail.page.id);
    expect(page.components[0]).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'fleet_vehicle_statuses', row_open_action: 'edit_fleet_vehicle_status', form_view: { side_panel: false } });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form']);
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual([' ', 'Name', 'Folded in Kanban']);
    expect(page.components[0].inline_edit.fields.map((field: any) => field.field)).toEqual(['sequence', 'name', 'fold']);
    expect(detail.components[0]).toMatchObject({ type: 'OdooFormView', source: 'fleet_vehicle_status_detail', editable: true });
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('fleet-statuses')).toEqual(['fleet_vehicle_statuses']);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('fleet-status-detail')).toEqual(['fleet_vehicle_status_detail']);
    expect(discoverPageRoutes(discoverPages(join(import.meta.dir, '..')))).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/fleet/config/statuses', page: 'fleet-statuses', module: 'fleet' }),
      expect.objectContaining({ path: '/fleet/config/statuses/detail', page: 'fleet-status-detail', module: 'fleet' }),
    ]));
    expect(api.datasources[0].permission).toBe('fleet.read');
    expect(detailApi.datasources[0].permission).toBe('fleet.read');
    expect([action(api, 'create_fleet_vehicle_status_inline'), action(api, 'update_fleet_vehicle_status_inline'), action(api, 'delete_fleet_vehicle_status'), action(detailApi, 'edit_fleet_vehicle_status_detail'), action(detailApi, 'delete_fleet_vehicle_status_detail')].every((entry: any) => entry.permission === 'fleet.manage')).toBe(true);
  });

  test('seeds seven Odoo statuses idempotently and supports search, empty, not-found, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'fleet_status_state_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'fleet_status_state_migrations', ['schema', 'data']);
    const source = yaml('api/statuses.yaml').datasources[0];
    const all = await repository.querySource(source, { q: null, fixture_state: null }, 0, 50);
    expect(all.data.map((row: any) => row.name)).toEqual(['New Request', 'To Order', 'Ordered', 'Registered', 'Downgraded', 'Reserve', 'Waiting List']);
    expect(all.data.every((row: any) => row.fold === false && row.row_version === 1)).toBe(true);
    expect((await repository.querySource(source, { q: 'order', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['To Order', 'Ordered']);
    expect((await repository.querySource(source, { q: 'missing', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, fixture_state: 'unauthorized' }, 0, 50)).rejects.toMatchObject({ status: 401, code: 'FLEET_STATUS_UNAUTHORIZED' });
    await expect(repository.querySource(source, { q: null, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'FLEET_STATUS_FORBIDDEN' });
    await expect(repository.querySource(source, { q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'FLEET_STATUS_DATA_UNAVAILABLE' });
    database.close();
  });

  test('supports manager create/update/delete with validation and stale-write guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_status_mutation_migrations', ['schema', 'data']);
    const api = yaml('api/statuses.yaml');
    const create = action(api, 'create_fleet_vehicle_status_inline');
    const update = action(api, 'update_fleet_vehicle_status_inline');
    const remove = action(api, 'delete_fleet_vehicle_status');
    const detailUpdate = action(yaml('api/status-detail.yaml'), 'edit_fleet_vehicle_status_detail');
    expect(create.permission).toBe('fleet.manage');
    expect(update.mutation.concurrency.required).toBe(true);
    expect(remove.mutation.concurrency.required).toBe(true);
    expect(detailUpdate.mutation.fields).toEqual(['sequence', 'name', 'fold']);
    const created = await repository.executeMutation(create.mutation, { values: { sequence: 2, name: 'Core3 Dispatch', fold: true } });
    expect(created).toMatchObject({ id: 'fleet-status-custom-core3-dispatch', row_version: 1, sequence: 2, name: 'Core3 Dispatch', fold: true });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'registered' } })).rejects.toMatchObject({ status: 409, code: 'FLEET_STATUS_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' ' } })).rejects.toMatchObject({ status: 422, code: 'FLEET_STATUS_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Bad sequence', sequence: -1 } })).rejects.toMatchObject({ status: 422, code: 'FLEET_STATUS_SEQUENCE_INVALID' });
    const edited = await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { sequence: 3, name: 'Core3 Dispatch Updated', fold: false } });
    expect(edited).toMatchObject({ row_version: 2, sequence: 3, name: 'Core3 Dispatch Updated', fold: false });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale status' } })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(update.mutation, { id: 'missing-status', expected_row_version: 1, values: { name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'FLEET_STATUS_NOT_FOUND' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'FLEET_STATUS_NOT_FOUND' });
    database.close();
  });

  test('keeps the status fixtures fixed and independent from current time or generated UUIDs', () => {
    const schema = readFileSync(join(root, 'migrations/20260911240000-021-fleet-statuses-schema.yaml'), 'utf8');
    const data = readFileSync(join(root, 'migrations/20260911241000-022-fleet-statuses-data.yaml'), 'utf8');
    expect(schema).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(data).toContain("'fleet-status-001'");
    expect(`${schema}\n${data}\n${readFileSync(join(root, 'api/statuses.yaml'), 'utf8')}`).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});

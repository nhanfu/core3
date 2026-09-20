import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const source = (file: string, id: string) => yaml(`api/${file}`).datasources.find((item: any) => item.id === id);

describe('Fleet Odometers parity batch', () => {
  test('keeps Odometers pages presentation-only and API-owned by page id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    for (const [pageFile, pageId, apiFile, dataSourceId] of [
      ['pages/odometers.yaml', 'fleet-odometers', 'odometers.yaml', 'fleet_odometers'],
      ['pages/fleet-odometer-detail.yaml', 'fleet-odometer-detail', 'fleet-odometer-detail.yaml', 'fleet_odometer_detail'],
    ] as const) {
      const page = yaml(pageFile);
      expect(page.datasources, pageFile).toBeUndefined();
      expect(page.actions, pageFile).toBeUndefined();
      expect(page.page.id, pageFile).toBe(pageId);
      expect(page.page.auth.require, pageFile).toEqual(['fleet.read']);
      expect(discovered.pages.get(pageId)?.config.page.id, pageFile).toBe(pageId);
      expect(discovered.pageDatasources.get(pageId), pageFile).toContain(dataSourceId);
      expect(readdirSync(join(serviceRoot, 'api'))).toContain(apiFile);
    }
  });

  test('maps the Odoo odometer model and keeps the related unit read-only', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/models/fleet_vehicle_odometer.py', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml', 'utf8');
    expect(model).toContain("_name = 'fleet.vehicle.odometer'");
    expect(model).toContain("vehicle_id = fields.Many2one('fleet.vehicle', 'Vehicle', required=True)");
    expect(model).toContain("unit = fields.Selection(related='vehicle_id.odometer_unit'");
    expect(views).toContain("<field name=\"view_mode\">list,form,graph</field>");
    expect(views).toContain('<list string="Odometer Logs" editable="top">');
    const api = yaml('api/odometers.yaml');
    const detailApi = yaml('api/fleet-odometer-detail.yaml');
    const create = api.actions.find((action: any) => action.id === 'create_fleet_odometer');
    const update = detailApi.actions.find((action: any) => action.id === 'edit_fleet_odometer');
    const remove = detailApi.actions.find((action: any) => action.id === 'delete_fleet_odometer');
    expect(create).toMatchObject({ permission: 'fleet.write', operation: 'create', handler: 'yaml_mutation' });
    expect(create.mutation.fields).toEqual(['vehicle_id', 'driver_name', 'date', 'value']);
    expect(update.mutation).toMatchObject({ fields: ['vehicle_id', 'driver_name', 'date', 'value'], concurrency: { required: true } });
    expect(remove).toMatchObject({ type: 'delete', table: 'fleet_vehicle_odometers' });
    expect(remove.mutation).toMatchObject({ operation: 'delete', table: 'fleet_vehicle_odometers', concurrency: { required: true } });
    expect(update.fields.find((field: any) => field.field === 'unit')).toBeUndefined();
  });

  test('matches Odoo Odometers list, form, graph, grouping, and labels', () => {
    const page = yaml('pages/odometers.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    expect(list.view_navigation).toBe('tabs');
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'form', 'graph']);
    expect(list.views.map((view: any) => view.label)).toEqual(['List', 'Form', 'Graph']);
    expect(list.columns.map((column: any) => column.label)).toEqual(['Date', 'Vehicle', 'Driver', 'Odometer Value', 'Unit']);
    expect(list.group_by).toEqual([{ field: 'vehicle_name', label: 'Vehicle' }, { field: 'date', label: 'Date' }]);
    expect(list.form_view.page).toBe('apps/services/fleet/pages/fleet-odometer-detail.yaml');
    expect(yaml('pages/fleet-odometer-detail.yaml').components[0].groups[0].title).toBe('Odometer Logs');
    expect(yaml('pages/fleet-odometer-detail.yaml').components[0].groups[0].fields.map((field: any) => field.label))
      .toEqual(['Vehicle', 'Odometer Value', 'Unit', 'Date']);
  });

  test('seeds deterministic logs and supports search, vehicle filter, and empty fixture', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'fleet_odometer_test_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'fleet_odometer_test_schema_migrations', ['schema', 'data']);
    const odometers = source('odometers.yaml', 'fleet_odometers');
    const defaults = await repository.querySource(odometers, { q: null, vehicle_id: null, fixture_state: null }, 0, 50);
    expect(defaults.data).toHaveLength(8);
    expect(defaults.data.map((row: any) => row.id)).toEqual([
      'fleet-odometer-001', 'fleet-odometer-002', 'fleet-odometer-003', 'fleet-odometer-004',
      'fleet-odometer-005', 'fleet-odometer-006', 'fleet-odometer-007', 'fleet-odometer-008',
    ]);
    expect(defaults.data.every((row: any) => String(row.date).startsWith('2026-'))).toBe(true);
    expect((await repository.querySource(odometers, { q: 'Pool Vehicle', vehicle_id: null, fixture_state: null }, 0, 50)).data).toHaveLength(4);
    expect((await repository.querySource(odometers, { q: null, vehicle_id: 'fleet-demo-002', fixture_state: null }, 0, 50)).data).toHaveLength(4);
    expect((await repository.querySource(odometers, { q: null, vehicle_id: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const detail = source('fleet-odometer-detail.yaml', 'fleet_odometer_detail');
    expect(await repository.querySource(detail, { id: 'fleet-odometer-001' }, 0, 1)).toMatchObject({ data: expect.objectContaining({ vehicle_name: 'Pool Vehicle 01', value: 7981 }) });
  });

  test('keeps CRUD relation and validation error contracts explicit', () => {
    const list = yaml('api/odometers.yaml');
    const create = list.actions.find((action: any) => action.id === 'create_fleet_odometer');
    expect(create.permission).toBe('fleet.write');
    expect(create.mutation.required).toEqual(['vehicle_id', 'date', 'value']);
    expect(create.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 404 }),
      expect.objectContaining({ status: 422 }),
    ]));
    const detail = yaml('api/fleet-odometer-detail.yaml');
    const update = detail.actions.find((action: any) => action.id === 'edit_fleet_odometer');
    expect(update.operation).toBe('update');
    expect(update.refresh).toEqual(['fleet_odometer_detail', 'fleet_odometers']);
    expect(update.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 404 }),
      expect.objectContaining({ status: 422 }),
    ]));
    expect(source('odometers.yaml', 'fleet_odometers').error_states.transport_error.status).toBe(503);
    expect(source('fleet-odometer-detail.yaml', 'fleet_odometer_detail').error_states).toMatchObject({
      unauthorized: { status: 401 },
      forbidden: { status: 403 },
      transport_error: { status: 503 },
    });
  });

  test('persists create, edit, stale rejection, and delete across a file-backed reload', async () => {
    const databasePath = `/tmp/core3-fleet-odometer-crud-${crypto.randomUUID()}.duckdb`;
    const migrationName = `fleet_odometer_crud_${crypto.randomUUID().replaceAll('-', '_')}`;
    const create = yaml('api/odometers.yaml').actions.find((action: any) => action.id === 'create_fleet_odometer');
    const update = yaml('api/fleet-odometer-detail.yaml').actions.find((action: any) => action.id === 'edit_fleet_odometer');
    const remove = yaml('api/fleet-odometer-detail.yaml').actions.find((action: any) => action.id === 'delete_fleet_odometer');
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);

    const created = await firstRepository.executeMutation(create.mutation, {
      values: { vehicle_id: 'fleet-demo-001', driver_name: 'Odometer QA', date: '2026-09-20', value: 13125.5 },
    }) as any;
    expect(created).toMatchObject({ vehicle_id: 'fleet-demo-001', driver_name: 'Odometer QA', date: expect.anything(), value: 13125.5, unit: 'km', row_version: 1 });
    const createdId = created.id;
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const detail = source('fleet-odometer-detail.yaml', 'fleet_odometer_detail');
    expect(await secondRepository.querySource(detail, { id: createdId, fixture_state: null }, 0, 1)).toMatchObject({
      data: expect.objectContaining({ id: createdId, vehicle_name: 'Pool Vehicle 01', driver_name: 'Odometer QA', value: 13125.5, unit: 'km' }),
    });

    const edited = await secondRepository.executeMutation(update.mutation, {
      id: createdId,
      expected_row_version: 1,
      values: { vehicle_id: 'fleet-demo-001', driver_name: 'Odometer QA Updated', date: '2026-09-21', value: 13142 },
    }) as any;
    expect(edited).toMatchObject({ id: createdId, driver_name: 'Odometer QA Updated', value: 13142, row_version: 2 });
    await expect(secondRepository.executeMutation(update.mutation, {
      id: createdId,
      expected_row_version: 1,
      values: { vehicle_id: 'fleet-demo-001', driver_name: 'Stale', date: '2026-09-21', value: 13143 },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    await secondRepository.executeMutation(remove.mutation, { id: createdId, expected_row_version: 2 });
    expect((await secondRepository.query('SELECT id FROM fleet_vehicle_odometers WHERE id = ?', [createdId]))).toEqual([]);
    await expect(secondRepository.executeMutation(remove.mutation, { id: createdId, expected_row_version: 2 }))
      .rejects.toMatchObject({ status: 404, code: 'FLEET_ODOMETER_NOT_FOUND' });
    second.close();
  });

  test('rejects archived or missing vehicles and invalid values without inserting a row', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'fleet_odometer_crud_guards', ['schema', 'data']);
    const create = yaml('api/odometers.yaml').actions.find((action: any) => action.id === 'create_fleet_odometer');
    const before = (await repository.query('SELECT COUNT(*) AS count FROM fleet_vehicle_odometers'))[0].count;
    const values = { vehicle_id: 'fleet-demo-001', date: '2026-09-20', value: 12000 };
    await expect(repository.executeMutation(create.mutation, { values: { ...values, vehicle_id: 'missing-vehicle' } }))
      .rejects.toMatchObject({ status: 404, code: 'FLEET_ODOMETER_VEHICLE_NOT_FOUND' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, vehicle_id: 'fleet-demo-003' } }))
      .rejects.toMatchObject({ status: 404, code: 'FLEET_ODOMETER_VEHICLE_NOT_FOUND' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, date: 'not-a-date' } }))
      .rejects.toMatchObject({ status: 422, code: 'FLEET_ODOMETER_VALUE_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, value: -1 } }))
      .rejects.toMatchObject({ status: 422, code: 'FLEET_ODOMETER_VALUE_INVALID' });
    expect((await repository.query('SELECT COUNT(*) AS count FROM fleet_vehicle_odometers'))[0].count).toBe(before);
    database.close();
  });
});

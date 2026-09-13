import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);
const source = (file: string, id: string) => yaml(`api/${file}`).datasources.find((entry: any) => entry.id === id);
const params = (extra: Record<string, unknown> = {}) => ({ q: null, active: null, service_type_id: null, vehicle_id: null, state: null, fixture_state: null, current_company_name: null, ...extra });

describe('Fleet Services parity checkpoint', () => {
  test('propagates switched authenticated company through query, prefetch, selector, and detail authorization', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_services_http_scope_test', ['schema', 'data']);
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const authUser: any = {
      sub: 'fleet-manager', email: 'fleet@workspace.example', name: 'Fleet Manager',
      roles: ['fleet_manager'], permissions: ['fleet.read', 'fleet.manage'],
      company: { name: 'Core3 Demo Company' },
    };
    const api = createYamlApi({
      repository,
      authProvider: {
        async getCurrentUser() { return authUser; },
        hasPermission(user: any, permission: string) { return user.permissions.includes(permission); },
      },
      sources: new Map([...discovered.datasources].filter(([id]) => id.startsWith('fleet_'))),
      pageSources: new Map([...discovered.pageDatasources].filter(([pageId]) => discovered.pages.get(pageId)?.module === 'fleet')),
      pages: new Map([...discovered.pages].filter(([, page]) => page.module === 'fleet').map(([id, page]) => [id, page.config])),
      catalogs: discovered.catalogs,
      menus: discovered.menus,
      workflows: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'fleet').map(([id, workflow]) => [id, workflow.config])),
      workflowFiles: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'fleet').map(([id, workflow]) => [id, workflow.file])),
      permissions: discovered.permissions.get('fleet')?.config || {},
      uploadRoot: '/tmp/core3-fleet-http-scope-test', eventStore: {}, topics: {},
    });
    const request = (path: string, init: RequestInit = {}) => api(
      new Request(`http://fleet.test${path}`, {
        ...init,
        headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json', ...(init.headers || {}) },
      }),
      new URL(`http://fleet.test${path}`),
    );
    const query = async (sourceId: string, params: Record<string, unknown> = {}) => {
      const response = await request('/api/query', { method: 'POST', body: JSON.stringify({ sourceId, params, top: 50 }) });
      expect(response?.status).toBe(200);
      return response!.json() as Promise<any>;
    };

    expect((await query('fleet_services')).data).toHaveLength(6);
    expect((await query('fleet_service_vehicles')).data).toHaveLength(2);

    // This mutable identity represents the company switch completing before
    // the next authenticated browser request is made.
    authUser.company = { name: 'Core3 Vietnam Branch' };
    expect((await query('fleet_services')).data).toEqual([]);
    expect((await query('fleet_service_vehicles')).data).toEqual([]);

    const listPage = await request('/api/pages/fleet-services');
    expect(listPage?.status).toBe(200);
    const listConfig = await listPage!.json() as any;
    expect(listConfig.datasources.find((entry: any) => entry.id === 'fleet_services').data).toEqual([]);
    expect(listConfig.datasources.find((entry: any) => entry.id === 'fleet_service_vehicles').data).toEqual([]);

    const detailPage = await request('/api/pages/service-detail?id=fleet-service-001');
    expect(detailPage?.status).toBe(200);
    const detailConfig = await detailPage!.json() as any;
    expect(detailConfig.datasources.find((entry: any) => entry.id === 'fleet_service_detail').data).toEqual({});
    database.close();
  });

  test('derives service scope from the switched session claim shape', async () => {
    const list = source('services.yaml', 'fleet_services');
    const vehicles = source('services.yaml', 'fleet_service_vehicles');
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_services_session_scope_test', ['schema', 'data']);
    const demoUser = { sub: 'fleet-manager', roles: ['fleet_manager'], permissions: ['fleet.read'], current_company_name: 'Core3 Demo Company' };
    const vietnamUser = { ...demoUser, current_company_name: 'Core3 Vietnam Branch' };
    expect((await repository.querySource(list, params({ current_company_name: demoUser.current_company_name }), 0, 50)).data).toHaveLength(6);
    expect((await repository.querySource(vehicles, { current_company_name: vietnamUser.current_company_name }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(list, params({ current_company_name: vietnamUser.current_company_name }), 0, 50)).data).toEqual([]);
    database.close();
  });

  test('matches the installed Odoo action, menu, modes, labels, and page/API joins', () => {
    const manifest = yaml('manifest.yaml');
    expect(manifest.menu.groups.find((group: any) => group.id === 'vehicles').items)
      .toContainEqual({ path: '/fleet/services', label: 'Services', icon: 'tools', permission: 'fleet.read' });

    const page = yaml('pages/services.yaml');
    const api = yaml('api/services.yaml');
    const detailPage = yaml('pages/service-detail.yaml');
    const detailApi = yaml('api/service-detail.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page.id).toBe('fleet-services');
    expect(api.page.id).toBe(page.page.id);
    expect(detailPage.page.id).toBe('service-detail');
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(page.page.route).toBe('/fleet/services');
    expect(page.components[0]).toMatchObject({ source: 'fleet_services', default_group_by: 'service_type_name', create_action: 'create_fleet_service' });
    expect(page.components[0].views.filter((view: any) => view.mobile !== true).map((view: any) => view.id))
      .toEqual(['list', 'kanban', 'form', 'graph', 'pivot', 'activity']);
    expect(page.components[0].views.filter((view: any) => view.mobile !== true).map((view: any) => view.label))
      .toEqual(['List', 'Kanban', 'Form', 'Graph', 'Pivot', 'Activity']);
    expect(page.components[0].columns.map((column: any) => column.label))
      .toEqual(['Date', 'Description', 'Service Type', 'Vehicle', 'Driver', 'Vendor', 'Notes', 'Cost', 'Stage', '']);
    expect(page.components[0].group_by.map((group: any) => group.label))
      .toEqual(['Service Type', 'Fleet Manager', 'Model', 'Manufacturer']);
    expect(page.components[0].form_view).toEqual({ page: 'apps/services/fleet/pages/service-detail.yaml', side_panel: false });
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'fleet_service_detail', title_field: 'service_type_name', status_field: 'state' });
    expect(detailPage.components[0].statusbar.map((entry: any) => entry.label)).toEqual(['New', 'Running', 'Done', 'Cancelled']);
    expect(detailPage.components[0].groups.map((group: any) => group.title)).toEqual(['Services Logs', 'Vehicle']);

    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pages.get('fleet-services')?.config.page.id).toBe('fleet-services');
    expect(discovered.pageDatasources.get('fleet-services')).toContain('fleet_services');
    expect(discovered.pageDatasources.get('service-detail')).toContain('fleet_service_detail');
    expect(readdirSync(join(root, 'api'))).toEqual(expect.arrayContaining(['services.yaml', 'service-detail.yaml']));

    expect(action(api, 'view_fleet_service')).toMatchObject({ permission: 'fleet.read', navigate_to: '/fleet/services/detail' });
    expect(action(api, 'create_fleet_service')).toMatchObject({ permission: 'fleet.manage', operation: 'create', handler: 'yaml_mutation' });
    for (const definition of [api, detailApi]) {
      for (const entry of definition.actions.filter((candidate: any) => !['view_fleet_service', 'back_to_fleet_services'].includes(candidate.id))) {
        expect(entry.permission, entry.id).toBe('fleet.manage');
      }
    }
  });

  test('seeds the Odoo-shaped grouped logs and supports search, filters, empty, detail, and transport errors', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_services_state_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_services_state_migrations', ['schema', 'data']);
    const list = source('services.yaml', 'fleet_services');
    const defaults = await repository.querySource(list, params(), 0, 50);
    expect(defaults.data).toHaveLength(6);
    expect(defaults.data.map((row: any) => row.id)).toEqual([
      'fleet-service-001', 'fleet-service-002', 'fleet-service-003', 'fleet-service-004', 'fleet-service-005', 'fleet-service-006',
    ]);
    expect(defaults.data.every((row: any) => row.state === 'Done')).toBe(true);
    expect(defaults.data.every((row: any) => row.service_type_name === 'Repair and maintenance')).toBe(true);
    expect((await repository.querySource(list, params({ q: 'crash' }), 0, 50)).data).toMatchObject([{ id: 'fleet-service-002', notes: 'After crash repairing' }]);
    expect((await repository.querySource(list, params({ vehicle_id: 'fleet-demo-002' }), 0, 50)).data).toHaveLength(2);
    const detail = source('service-detail.yaml', 'fleet_service_detail');
    await repository.query("INSERT INTO fleet_vehicles (id, name, license_plate, vehicle_type, company_name) VALUES (?, ?, ?, ?, ?)", ['fleet-other-service-vehicle', 'Other Company Service Vehicle', 'OTHER-SERVICE-001', 'Car', 'Other Company']);
    await repository.query("INSERT INTO fleet_vehicle_services (id, vehicle_id, service_type_id, date, amount, state, active) VALUES (?, ?, ?, ?, ?, ?, ?)", ['fleet-other-service-001', 'fleet-other-service-vehicle', 'fleet-service-type-repair', '2026-01-15', 25, 'New', true]);
    expect((await repository.querySource(list, params({ current_company_name: 'Core3 Demo Company' }), 0, 50)).data.map((row: any) => row.id)).not.toContain('fleet-other-service-001');
    expect((await repository.querySource(detail, { id: 'fleet-other-service-001', current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(list, params({ current_company_name: 'Core3 Vietnam Branch' }), 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source('services.yaml', 'fleet_service_vehicles'), { current_company_name: 'Core3 Vietnam Branch' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(detail, { id: 'fleet-service-001', current_company_name: 'Core3 Vietnam Branch', fixture_state: null }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(list, params({ state: 'Done' }), 0, 50)).data).toHaveLength(6);
    expect((await repository.querySource(list, params({ fixture_state: 'empty' }), 0, 50)).data).toEqual([]);
    await expect(repository.querySource(list, params({ fixture_state: 'transport_error' }), 0, 50))
      .rejects.toMatchObject({ status: 503, code: 'FLEET_SERVICE_DATA_UNAVAILABLE' });

    expect(await repository.querySource(detail, { id: 'fleet-service-001', current_company_name: null, fixture_state: null }, 0, 1))
      .toMatchObject({ data: { service_type_name: 'Repair and maintenance', vehicle_name: 'Pool Vehicle 01', state: 'Done', amount: 650 } });
    expect((await repository.querySource(detail, { id: 'missing-service', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'fleet-service-001', fixture_state: 'transport_error' }, 0, 1))
      .rejects.toMatchObject({ status: 503, code: 'FLEET_SERVICE_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('keeps manager CRUD, relation/validation, workflow, archive, delete, and stale guards explicit', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_services_crud_migrations', ['schema', 'data']);
    await repository.query("INSERT INTO fleet_vehicles (id, name, license_plate, vehicle_type, company_name) VALUES (?, ?, ?, ?, ?)", ['fleet-other-service-vehicle', 'Other Company Service Vehicle', 'OTHER-SERVICE-001', 'Car', 'Other Company']);
    await repository.query("INSERT INTO fleet_vehicle_services (id, vehicle_id, service_type_id, date, amount, state, active) VALUES (?, ?, ?, ?, ?, ?, ?)", ['fleet-other-service-001', 'fleet-other-service-vehicle', 'fleet-service-type-repair', '2026-01-15', 25, 'New', true]);
    const listApi = yaml('api/services.yaml');
    const detailApi = yaml('api/service-detail.yaml');
    const create = action(listApi, 'create_fleet_service');
    const edit = action(detailApi, 'edit_fleet_service');
    const start = action(detailApi, 'start_fleet_service');
    const complete = action(detailApi, 'complete_fleet_service');
    const cancel = action(detailApi, 'cancel_fleet_service');
    const archive = action(detailApi, 'archive_fleet_service');
    const remove = action(detailApi, 'delete_fleet_service');
    expect(edit.mutation.concurrency.required).toBe(true);
    expect([start, complete, cancel].every((entry: any) => entry.mutation.guards.some((guard: any) => guard.status === 409))).toBe(true);

    const created = await repository.executeMutation(create.mutation, { values: {
      vehicle_id: 'fleet-demo-001', service_type_id: 'fleet-service-type-refueling', date: '2026-01-15', amount: 90, odometer: 13000,
    } });
    expect(created).toMatchObject({ vehicle_id: 'fleet-demo-001', service_type_id: 'fleet-service-type-refueling', state: 'New', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: {
      vehicle_id: 'fleet-demo-001', service_type_id: 'fleet-service-type-refueling', date: '2026-01-15', amount: 90, odometer: 13000,
    } })).rejects.toMatchObject({ status: 409, code: 'FLEET_SERVICE_DUPLICATE' });
    const createdCount = (await repository.query('SELECT COUNT(*) AS count FROM fleet_vehicle_services'))[0]?.count;
    expect(Number(createdCount)).toBe(8);
    await expect(repository.executeMutation(create.mutation, { values: { vehicle_id: 'missing', service_type_id: 'fleet-service-type-repair', date: '2026-01-15' } }))
      .rejects.toMatchObject({ status: 404, code: 'FLEET_SERVICE_VEHICLE_NOT_FOUND' });
    await expect(repository.executeMutation(create.mutation, { values: { vehicle_id: 'fleet-demo-001', service_type_id: 'fleet-service-type-repair', date: 'bad', amount: -1 } }))
      .rejects.toMatchObject({ status: 422, code: 'FLEET_SERVICE_VALUES_INVALID' });
    expect((await repository.query('SELECT COUNT(*) AS count FROM fleet_vehicle_services'))[0]?.count).toBe(createdCount);

    const running = await repository.executeMutation(start.mutation, { id: created.id, expected_row_version: 1, values: { state: 'Running' } });
    expect(running).toMatchObject({ state: 'Running', row_version: 2 });
    const done = await repository.executeMutation(complete.mutation, { id: created.id, expected_row_version: 2, values: { state: 'Done' } });
    expect(done).toMatchObject({ state: 'Done', row_version: 3 });
    await expect(repository.executeMutation(cancel.mutation, { id: created.id, expected_row_version: 3, values: { state: 'Cancelled' } }))
      .rejects.toMatchObject({ status: 409, code: 'FLEET_SERVICE_CANCEL_NOT_ALLOWED' });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { vehicle_id: 'fleet-demo-001', service_type_id: 'fleet-service-type-refueling', date: '2026-01-15', amount: 95 } }))
      .rejects.toMatchObject({ status: 409 });
    expect(await repository.query('SELECT amount, state, row_version FROM fleet_vehicle_services WHERE id = ?', [created.id]))
      .toEqual([{ amount: 90, state: 'Done', row_version: 3 }]);

    await expect(repository.executeMutation(start.mutation, { id: 'fleet-other-service-001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { state: 'Running' } }))
      .rejects.toMatchObject({ status: 403, code: 'FLEET_SERVICE_COMPANY_SCOPE_REQUIRED' });
    expect(await repository.query('SELECT state, row_version FROM fleet_vehicle_services WHERE id = ?', ['fleet-other-service-001']))
      .toEqual([{ state: 'New', row_version: 1 }]);

    const archived = await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 3, values: { active: false } });
    expect(archived).toMatchObject({ active: false, row_version: 4 });
    await expect(repository.executeMutation(remove.mutation, { id: 'fleet-service-001', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'FLEET_SERVICE_ACTIVE_DELETE' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 }))
      .rejects.toMatchObject({ status: 404, code: 'FLEET_SERVICE_NOT_FOUND' });
    database.close();
  });
});

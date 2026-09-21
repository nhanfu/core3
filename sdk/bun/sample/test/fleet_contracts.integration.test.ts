import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/fleet');
const odooRoot = '/home/nhanjs/projects/odoo/addons/fleet';
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const source = (file: string, id: string) => yaml(`api/${file}`).datasources.find((item: any) => item.id === id);

describe('Fleet Contracts parity batch', () => {
  test('keeps list and detail presentation-only with page-owned API fragments', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    for (const [pageFile, pageId, apiFile, dataSourceId] of [
      ['pages/contracts.yaml', 'fleet-contracts', 'contracts.yaml', 'fleet_contracts'],
      ['pages/contract-detail.yaml', 'contract-detail', 'contract-detail.yaml', 'fleet_contract_detail'],
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

  test('matches Odoo Contracts action modes, labels, filters, and notebook tabs', () => {
    const list = yaml('pages/contracts.yaml').components[0];
    expect(list.view_navigation).toBe('tabs');
    expect(list.views.filter((view: any) => view.mobile !== true).map((view: any) => view.id)).toEqual(['list', 'kanban', 'form', 'graph', 'pivot', 'activity']);
    expect(list.views.filter((view: any) => view.mobile !== true).map((view: any) => view.label)).toEqual(['List', 'Kanban', 'Form', 'Graph', 'Pivot', 'Activity']);
    expect(list.views.find((view: any) => view.id === 'card')).toMatchObject({ label: 'Kanban', mobile: true });
    expect(list.columns.map((column: any) => column.label)).toEqual(['Name', 'Contract Start Date', 'Contract Expiration Date', 'Vehicle', 'Vendor', 'Driver', 'Recurring Cost', 'Recurring Cost Frequency', 'Status']);
    expect(list.filters.map((filter: any) => filter.label)).toEqual(['Status', 'Vehicle', 'Contract Type', 'Archived']);
    expect(list.form_view).toEqual({ page: 'apps/services/fleet/pages/contract-detail.yaml', side_panel: true });
    const form = yaml('pages/contract-detail.yaml').components[0];
    expect(form.notebook.tabs.map((tab: any) => tab.label)).toEqual(['Information', 'Costs & Recurrence', 'Notes']);
    expect(source('contracts.yaml', 'fleet_contracts').error_states.transport_error).toMatchObject({ status: 503, code: 'FLEET_CONTRACT_DATA_UNAVAILABLE' });
  });

  test('seeds deterministic open, renewal, expired, search, filter, and empty fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'fleet_contract_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'fleet_contract_test_migrations', ['schema', 'data']);
    const contracts = source('contracts.yaml', 'fleet_contracts');
    const open = await repository.querySource(contracts, { q: null, status: null, vehicle_id: null, contract_type: null, fixture_state: null }, 0, 50);
    expect(open.data).toHaveLength(5);
    expect(open.data.map((row: any) => row.id)).toEqual(['fleet-contract-002', 'fleet-contract-003', 'fleet-contract-001', 'fleet-contract-004', 'fleet-contract-005']);
    expect(open.data.every((row: any) => row.status === 'Running')).toBe(true);
    expect(open.data.map((row: any) => row.renewal_status)).toEqual(['Due soon', 'Renewal required', 'On track', 'On track', 'Due soon']);
    expect((await repository.querySource(contracts, { q: 'City Bike', status: null, vehicle_id: null, contract_type: null, fixture_state: null }, 0, 50)).data).toHaveLength(2);
    expect((await repository.querySource(contracts, { q: null, status: 'Expired', vehicle_id: null, contract_type: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['fleet-contract-006']);
    expect((await repository.querySource(contracts, { q: null, status: null, vehicle_id: null, contract_type: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const detail = source('contract-detail.yaml', 'fleet_contract_detail');
    expect(await repository.querySource(detail, { id: 'fleet-contract-002' }, 0, 1)).toMatchObject({ data: expect.objectContaining({ name: 'Weekly leasing contract', recurring_cost: 150, renewal_status: 'Due soon' }) });
    expect((await repository.querySource(detail, { id: 'missing-contract', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
  });

  test('keeps create, edit, renew permissions and relation/date/workflow guards explicit', () => {
    const listActions = yaml('api/contracts.yaml').actions;
    const create = listActions.find((action: any) => action.id === 'create_fleet_contract');
    expect(create.permission).toBe('fleet.write');
    expect(create.mutation.required).toEqual(['name', 'vehicle_id', 'start_date', 'expiration_date']);
    expect(create.mutation.guards).toEqual(expect.arrayContaining([expect.objectContaining({ status: 404 }), expect.objectContaining({ status: 422 })]));
    const detailActions = yaml('api/contract-detail.yaml').actions;
    const update = detailActions.find((action: any) => action.id === 'edit_fleet_contract');
    const renew = detailActions.find((action: any) => action.id === 'renew_fleet_contract');
    expect(update.permission).toBe('fleet.write');
    expect(update.refresh).toEqual(['fleet_contract_detail', 'fleet_contracts']);
    expect(update.mutation.guards).toEqual(expect.arrayContaining([expect.objectContaining({ status: 404 }), expect.objectContaining({ status: 422 })]));
    expect(renew.permission).toBe('fleet.write');
    expect(renew.mutation.guards).toEqual(expect.arrayContaining([expect.objectContaining({ status: 409 }), expect.objectContaining({ status: 422 })]));
    expect(renew.mutation.guards.find((guard: any) => guard.status === 422).query).toContain("DATE '2026-01-15'");
    expect(yaml('migrations/20260910130000-005-fleet-contracts-schema.yaml').type.postgres.up).not.toContain('CURRENT_TIMESTAMP');
  });

  test('persists contract CRUD, lifecycle, archive, restore, and stale guards across reload', async () => {
    const databasePath = `/tmp/core3-fleet-contract-crud-${crypto.randomUUID()}.duckdb`;
    const migrationName = `fleet_contract_crud_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);

    const listApi = yaml('api/contracts.yaml');
    const detailApi = yaml('api/contract-detail.yaml');
    const create = listApi.actions.find((action: any) => action.id === 'create_fleet_contract');
    const edit = detailApi.actions.find((action: any) => action.id === 'edit_fleet_contract');
    const archive = detailApi.actions.find((action: any) => action.id === 'archive_fleet_contract');
    const restore = detailApi.actions.find((action: any) => action.id === 'restore_fleet_contract');
    const close = detailApi.actions.find((action: any) => action.id === 'close_fleet_contract');
    const reopen = detailApi.actions.find((action: any) => action.id === 'set_fleet_contract_running');
    const remove = detailApi.actions.find((action: any) => action.id === 'delete_fleet_contract');
    const values = {
      name: 'CRUD contract', vehicle_id: 'fleet-demo-001', vendor: 'Contract QA', driver_name: 'Admin User',
      contract_type: 'Leasing', start_date: '2026-09-21', expiration_date: '2027-09-21', recurring_cost: 225,
      recurring_cost_frequency: 'Monthly', status: 'Running', renewal_status: 'On track', notes: 'Persistent contract test',
    };
    const beforeCreate = (await firstRepository.query('SELECT COUNT(*) AS count FROM fleet_vehicle_contracts'))[0].count;
    await expect(firstRepository.executeMutation(create.mutation, { values: { ...values, vehicle_id: 'missing-vehicle' } }))
      .rejects.toMatchObject({ status: 404, code: 'FLEET_CONTRACT_VEHICLE_NOT_FOUND' });
    await expect(firstRepository.executeMutation(create.mutation, { values: { ...values, expiration_date: 'not-a-date' } }))
      .rejects.toMatchObject({ status: 422, code: 'FLEET_CONTRACT_VALUES_INVALID' });
    expect((await firstRepository.query('SELECT COUNT(*) AS count FROM fleet_vehicle_contracts'))[0].count).toBe(beforeCreate);
    const created = await firstRepository.executeMutation(create.mutation, { values }) as any;
    expect(created).toMatchObject({ name: values.name, vehicle_id: values.vehicle_id, status: 'Running', active: true, row_version: 1 });
    const createdId = created.id;
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const detail = source('contract-detail.yaml', 'fleet_contract_detail');
    expect(await secondRepository.querySource(detail, { id: createdId, fixture_state: null }, 0, 1)).toMatchObject({
      data: expect.objectContaining({ id: createdId, name: values.name, active: true, active_label: 'Active' }),
    });

    const edited = await secondRepository.executeMutation(edit.mutation, {
      id: createdId, expected_row_version: 1,
      values: { ...values, name: 'CRUD contract updated', recurring_cost: 250 },
    }) as any;
    expect(edited).toMatchObject({ id: createdId, name: 'CRUD contract updated', recurring_cost: 250, row_version: 2 });
    await expect(secondRepository.executeMutation(edit.mutation, {
      id: createdId, expected_row_version: 1, values: { ...values, name: 'Stale contract' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const archived = await secondRepository.executeMutation(archive.mutation, { id: createdId, expected_row_version: 2, values: { active: false } }) as any;
    expect(archived).toMatchObject({ id: createdId, active: false, row_version: 3 });
    expect((await secondRepository.querySource(listApi.datasources.find((item: any) => item.id === 'fleet_contracts'), { q: null, status: 'Running', vehicle_id: null, contract_type: null, include_archived: null, fixture_state: null }, 0, 50)).data).not.toContainEqual(expect.objectContaining({ id: createdId }));
    expect((await secondRepository.querySource(listApi.datasources.find((item: any) => item.id === 'fleet_contracts'), { q: null, status: 'Running', vehicle_id: null, contract_type: null, include_archived: true, fixture_state: null }, 0, 50)).data).toContainEqual(expect.objectContaining({ id: createdId, active: false }));
    const restored = await secondRepository.executeMutation(restore.mutation, { id: createdId, expected_row_version: 3, values: { active: true } }) as any;
    expect(restored).toMatchObject({ id: createdId, active: true, row_version: 4 });

    const closed = await secondRepository.executeMutation(close.mutation, { id: createdId, expected_row_version: 4, values: { status: 'Closed' } }) as any;
    expect(closed).toMatchObject({ id: createdId, status: 'Closed', row_version: 5 });
    await expect(secondRepository.executeMutation(reopen.mutation, { id: createdId, expected_row_version: 5, values: { status: 'Running' } }))
      .rejects.toMatchObject({ status: 409, code: 'FLEET_CONTRACT_STATUS_TRANSITION_INVALID' });
    await secondRepository.executeMutation(remove.mutation, { id: createdId, expected_row_version: 5 });
    await expect(secondRepository.executeMutation(remove.mutation, { id: createdId, expected_row_version: 5 }))
      .rejects.toMatchObject({ status: 404, code: 'FLEET_CONTRACT_NOT_FOUND' });
    second.close();
  });

  test('records the Odoo contract model, clickable status, archive, and full CRUD access contract', () => {
    const model = readFileSync(join(odooRoot, 'models/fleet_vehicle_log_contract.py'), 'utf8');
    const views = readFileSync(join(odooRoot, 'views/fleet_vehicle_cost_views.xml'), 'utf8');
    const access = readFileSync(join(odooRoot, 'security/ir.model.access.csv'), 'utf8');
    expect(model).toContain("_name = 'fleet.vehicle.log.contract'");
    expect(model).toContain("state = fields.Selection(");
    expect(model).toContain('def action_close(self):');
    expect(model).toContain('def action_draft(self):');
    expect(model).toContain('def action_open(self):');
    expect(model).toContain('def action_expire(self):');
    expect(views).toContain("<field name=\"view_mode\">list,kanban,form,graph,pivot,activity</field>");
    expect(views).toContain('widget="statusbar" options="{\'clickable\': \'1\'}"');
    expect(views).toContain('<field name="active" invisible="1"/>');
    expect(access).toContain('fleet_vehicle_log_contract_access_right_user,fleet_vehicle_log_contract_access_right,model_fleet_vehicle_log_contract,fleet_group_user,1,1,1,1');
    const detail = yaml('api/contract-detail.yaml');
    expect(detail.actions.find((action: any) => action.id === 'edit_fleet_contract').mutation.concurrency).toEqual({ required: true });
    expect(detail.actions.find((action: any) => action.id === 'archive_fleet_contract')).toMatchObject({ permission: 'fleet.write', operation: 'update' });
    expect(detail.actions.find((action: any) => action.id === 'delete_fleet_contract')).toMatchObject({ permission: 'fleet.write', type: 'delete', table: 'fleet_vehicle_contracts' });
  });
});

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
    expect(list.filters.map((filter: any) => filter.label)).toEqual(['Status', 'Vehicle', 'Contract Type']);
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
});

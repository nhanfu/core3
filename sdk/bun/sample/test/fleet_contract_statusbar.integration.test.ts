import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/fleet');
const odooRoot = '/home/nhanjs/projects/odoo/addons/fleet';
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Fleet contract clickable statusbar parity', () => {
  test('binds the Odoo clickable state field to page-owned transition actions', () => {
    const sourceModel = readFileSync(join(odooRoot, 'models/fleet_vehicle_log_contract.py'), 'utf8');
    const sourceView = readFileSync(join(odooRoot, 'views/fleet_vehicle_cost_views.xml'), 'utf8');
    const page = yaml('pages/contract-detail.yaml');
    const form = page.components[0];
    const api = yaml('api/contract-detail.yaml');
    const actions = new Map(api.actions.map((action: any) => [action.id, action]));

    expect(sourceModel).toContain('def action_close(self):');
    expect(sourceModel).toContain('def action_draft(self):');
    expect(sourceModel).toContain('def action_open(self):');
    expect(sourceModel).toContain('def action_expire(self):');
    expect(sourceView).toContain('widget="statusbar" options="{\'clickable\': \'1\'}"');
    expect(form.statusbar_actions).toEqual({
      New: 'set_fleet_contract_new',
      Running: 'set_fleet_contract_running',
      Expired: 'expire_fleet_contract',
      Closed: 'close_fleet_contract',
    });
    expect(form.statusbar_actions['To Renew']).toBeUndefined();

    for (const [status, actionId] of Object.entries(form.statusbar_actions)) {
      const action = actions.get(actionId);
      expect(action, actionId).toMatchObject({ type: 'server', permission: 'fleet.write', operation: 'update' });
      expect(action.mutation).toMatchObject({ table: 'fleet_vehicle_contracts', fields: ['status'], concurrency: { required: true } });
      expect(action.params.values.status, `${status} status`).toBe(status);
      expect(action.refresh).toEqual(['fleet_contract_detail', 'fleet_contracts']);
    }
  });

  test('persists each mapped status transition with optimistic concurrency', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'fleet_contract_statusbar', ['schema', 'data']);

    const api = yaml('api/contract-detail.yaml');
    const actions = new Map(api.actions.map((action: any) => [action.id, action]));
    const transitions = [
      ['set_fleet_contract_new', 'New'],
      ['set_fleet_contract_running', 'Running'],
      ['expire_fleet_contract', 'Expired'],
      ['close_fleet_contract', 'Closed'],
    ] as const;
    let rowVersion = 1;

    for (const [actionId, status] of transitions) {
      const action = actions.get(actionId);
      const result = await repository.executeMutation(action.mutation, {
        id: 'fleet-contract-001',
        expected_row_version: rowVersion,
        values: { status },
      }) as any;
      rowVersion += 1;
      expect(result).toMatchObject({ id: 'fleet-contract-001', status, row_version: rowVersion });
    }

    await expect(repository.executeMutation(actions.get('set_fleet_contract_running').mutation, {
      id: 'fleet-contract-001',
      expected_row_version: rowVersion,
      values: { status: 'Running' },
    })).rejects.toMatchObject({ status: 409, code: 'FLEET_CONTRACT_STATUS_TRANSITION_INVALID' });

    const detail = yaml('api/contract-detail.yaml').datasources.find((source: any) => source.id === 'fleet_contract_detail');
    expect(await repository.querySource(detail, { id: 'fleet-contract-001', fixture_state: null }, 0, 1)).toMatchObject({
      data: expect.objectContaining({ status: 'Closed', row_version: rowVersion }),
    });
    database.close();
  });

  test('keeps the contract detail API joined to its presentation page', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/contract-detail.yaml');
    const api = yaml('api/contract-detail.yaml');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page.id).toBe('contract-detail');
    expect(api.page.id).toBe('contract-detail');
    expect(discovered.pages.get('contract-detail')?.config.page.id).toBe('contract-detail');
    expect(discovered.pageDatasources.get('contract-detail')).toContain('fleet_contract_detail');
  });
});

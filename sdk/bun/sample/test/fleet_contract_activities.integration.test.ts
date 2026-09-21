import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/fleet');
const odooRoot = '/home/nhanjs/projects/odoo/addons/fleet';
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((entry: any) => entry.id === id);

describe('Fleet contract renewal activities parity', () => {
  test('maps the Odoo mail activity contract and keeps page/API ownership explicit', () => {
    const page = yaml('pages/contract-detail.yaml');
    const api = yaml('api/contract-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page.id).toBe('contract-detail');
    expect(page.components[0]).toMatchObject({
      source: 'fleet_contract_detail',
      message_source: 'fleet_contract_activities',
      activity_action: 'schedule_fleet_contract_activity',
      activity_complete_action: 'complete_fleet_contract_activity',
    });
    expect(discovered.pages.get('contract-detail')?.config.page.id).toBe('contract-detail');
    expect(discovered.pageDatasources.get('contract-detail')).toContain('fleet_contract_activities');
    expect(api.datasources.find((entry: any) => entry.id === 'fleet_contract_activities')).toMatchObject({ permission: 'fleet.read' });
    expect(action(api, 'schedule_fleet_contract_activity')).toMatchObject({ permission: 'fleet.write', operation: 'activity' });
    expect(action(api, 'complete_fleet_contract_activity')).toMatchObject({ permission: 'fleet.write', operation: 'complete_activity' });

    const model = readFileSync(join(odooRoot, 'models/fleet_vehicle_log_contract.py'), 'utf8');
    const activityType = readFileSync(join(odooRoot, 'data/mail_activity_type_data.xml'), 'utf8');
    expect(model).toContain("_inherit = ['mail.thread', 'mail.activity.mixin']");
    expect(model).toContain("self.activity_reschedule(['fleet.mail_act_fleet_contract_to_renew'");
    expect(model).toContain('def scheduler_manage_contract_expiration(self):');
    expect(activityType).toContain('id="mail_act_fleet_contract_to_renew"');
    expect(activityType).toContain('<field name="res_model">fleet.vehicle.log.contract</field>');
  });

  test('seeds the renewal activity, scopes it to the contract, and exposes explicit empty/error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'fleet_contract_activity_seed', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'fleet_contract_activity_seed', ['schema', 'data']);
    const api = yaml('api/contract-detail.yaml');
    const source = api.datasources.find((entry: any) => entry.id === 'fleet_contract_activities');
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'FLEET_CONTRACT_ACTIVITIES_UNAVAILABLE' });
    expect(source.query).toContain('a.contract_id = :id');
    expect(source.query).toContain('v.company_name = :current_company_name');
    expect((await repository.querySource(source, { id: 'fleet-contract-002', current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 20)).data).toMatchObject([
      expect.objectContaining({ id: 'fleet-contract-activity-002-001', activity_type: 'Contract to Renew', state: 'Planned', due_date: '2026-09-30' }),
    ]);
    expect((await repository.querySource(source, { id: 'fleet-contract-002', current_company_name: 'Core3 Demo Company', fixture_state: 'empty' }, 0, 20)).data).toEqual([]);
    expect((await repository.querySource(source, { id: 'missing-contract', current_company_name: 'Core3 Demo Company', fixture_state: 'not_found' }, 0, 20)).data).toEqual([]);
    database.close();
  });

  test('schedules, completes, rejects stale/invalid/unauthorized actions, and survives file-backed restart', async () => {
    const databasePath = `/tmp/core3-fleet-contract-activities-${crypto.randomUUID()}.duckdb`;
    const migrationName = `fleet_contract_activities_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const api = yaml('api/contract-detail.yaml');
    const schedule = action(api, 'schedule_fleet_contract_activity');
    const complete = action(api, 'complete_fleet_contract_activity');
    expect(schedule.mutation.concurrency).toEqual({ required: true });
    expect(complete.mutation.concurrency).toEqual({ required: true });

    await expect(firstRepository.executeMutation(schedule.mutation, {
      id: 'fleet-contract-001', expected_row_version: 1, current_user_name: 'Fleet QA',
      values: { content: 'Confirm insurance renewal' },
    })).resolves.toMatchObject({ contract_id: 'fleet-contract-001', state: 'Planned', assigned_user: 'Fleet QA', row_version: 1 });
    await expect(firstRepository.executeMutation(schedule.mutation, {
      id: 'fleet-contract-001', expected_row_version: 1, current_user_name: 'Fleet QA',
      values: { content: 'Duplicate stale activity' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(firstRepository.executeMutation(schedule.mutation, {
      id: 'fleet-contract-001', expected_row_version: 2, current_user_name: '',
      values: { content: 'No actor' },
    })).rejects.toMatchObject({ status: 403, code: 'FLEET_CONTRACT_ACTIVITY_ACTOR_REQUIRED' });
    await expect(firstRepository.executeMutation(schedule.mutation, {
      id: 'fleet-contract-001', expected_row_version: 2, current_user_name: 'Fleet QA',
      values: { content: ' ' },
    })).rejects.toMatchObject({ status: 422, code: 'FLEET_CONTRACT_ACTIVITY_SUMMARY_INVALID' });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const activities = api.datasources.find((entry: any) => entry.id === 'fleet_contract_activities');
    const scheduled = (await secondRepository.querySource(activities, { id: 'fleet-contract-001', current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 20)).data
      .find((row: any) => row.summary === 'Confirm insurance renewal');
    expect(scheduled).toMatchObject({ state: 'Planned', row_version: 1, due_date: '2026-12-31' });
    await expect(secondRepository.executeMutation(complete.mutation, {
      id: scheduled.id, expected_row_version: scheduled.row_version, current_user_name: 'Fleet QA',
    })).resolves.toMatchObject({ id: scheduled.id, state: 'Done', completed_by: 'Fleet QA', row_version: 2 });
    await expect(secondRepository.executeMutation(complete.mutation, {
      id: scheduled.id, expected_row_version: 1, current_user_name: 'Fleet QA',
    })).rejects.toMatchObject({ status: 409, code: 'FLEET_CONTRACT_ACTIVITY_STALE' });
    expect((await secondRepository.query('SELECT state, completed_by, row_version FROM fleet_contract_activities WHERE id = ?', [scheduled.id]))).toEqual([
      { state: 'Done', completed_by: 'Fleet QA', row_version: 2 },
    ]);
    expect((await secondRepository.query('SELECT row_version FROM fleet_vehicle_contracts WHERE id = ?', ['fleet-contract-001']))).toEqual([{ row_version: 2 }]);
    second.close();
    rmSync(databasePath, { force: true });
  });
});

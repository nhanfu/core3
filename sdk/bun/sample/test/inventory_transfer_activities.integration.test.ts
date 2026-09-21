import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const page = yaml('pages/transfer-detail.yaml');
const api = yaml('api/transfer-detail.yaml');
const schedule = api.actions.find((candidate: any) => candidate.id === 'schedule_inventory_transfer_activity');
const complete = api.actions.find((candidate: any) => candidate.id === 'complete_inventory_transfer_activity');
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const result = new YamlRepository(database);
  await migrateDatabase(result, serviceRoot + '/migrations', undefined, name, ['schema', 'data']);
  return result;
}

const values = {
  picking_id: 'delivery-00008',
  expected_row_version: 1,
  current_company_name: 'My Company',
  current_user_name: 'Inventory Operator',
  activity_type: 'call',
  summary: 'Confirm carrier handoff',
  due_date: '2026-02-02',
  assigned_user: 'Dispatch Lead',
  note: 'Call before the delivery window.',
};

describe('Inventory transfer activity parity', () => {
  test('maps Odoo stock-picking activities into separate page/API contracts', () => {
    const detail = page.components.find((component: any) => component.type === 'OdooFormView');
    const activityList = page.components.find((component: any) => component.type === 'ListView' && component.source === 'inventory_transfer_activities');
    const stockSource = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/stock_picking.py', 'utf8');
    const stockView = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/stock_picking_views.xml', 'utf8');
    const activityView = readFileSync('/home/nhanjs/projects/odoo/addons/mail/views/mail_activity_views.xml', 'utf8');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(detail.activity_action).toBe('schedule_inventory_transfer_activity');
    expect(activityList).toMatchObject({ source: 'inventory_transfer_activities', create_action: 'schedule_inventory_transfer_activity' });
    expect(activityList.actions).toContainEqual(expect.objectContaining({ id: 'complete_inventory_transfer_activity', label: 'Mark done', permission: 'inventory.write' }));
    expect(schedule).toMatchObject({ type: 'server_form', permission: 'inventory.write', action: 'stock.picking.activity.schedule', operation: 'schedule_activity', handler: 'yaml_mutation' });
    expect(complete).toMatchObject({ type: 'server', permission: 'inventory.write', action: 'stock.picking.activity.done', operation: 'complete_activity' });
    expect(source('inventory_transfer_activities')).toMatchObject({ single: false, permission: 'inventory.read' });
    expect(stockSource).toContain("_inherit = ['mail.thread', 'mail.activity.mixin']");
    expect(stockView).toContain('field name="activity_ids" widget="kanban_activity"');
    expect(activityView).toContain('id="mail_activity_schedule"');
    expect(activityView).toContain('name="action_done"');
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
  });

  test('schedules and completes a durable activity with deterministic history', async () => {
    const db = await repository('inventory_transfer_activities_lifecycle_test');
    const initial = await db.querySource(source('inventory_transfer_activities'), { id: values.picking_id, current_company_name: values.current_company_name, fixture_state: null }, 0, 10);
    expect(initial.data).toMatchObject([
      expect.objectContaining({ id: 'inventory-transfer-activity-delivery-00008-0001', activity_type: 'todo', summary: 'Confirm delivery contact', state: 'Planned', assigned_user: 'Mitchell Admin' }),
    ]);
    const created = await db.executeMutation(schedule.mutation, values) as any;
    expect(created).toMatchObject({ id: 'inventory-transfer-activity-delivery-00008-2', picking_id: 'delivery-00008', company_name: 'My Company', activity_type: 'call', summary: 'Confirm carrier handoff', assigned_user: 'Dispatch Lead', state: 'Planned', created_by: 'Inventory Operator', row_version: 1 });
    const completed = await db.executeMutation(complete.mutation, { id: created.id, expected_row_version: 1, current_company_name: values.current_company_name, current_user_name: 'Dispatch Lead' }) as any;
    expect(completed).toMatchObject({ id: created.id, state: 'Done', completed_by: 'Dispatch Lead', row_version: 2 });
    expect(await db.query('SELECT state, completed_by, row_version FROM inventory_transfer_activities WHERE id = ?', [created.id])).toEqual([{ state: 'Done', completed_by: 'Dispatch Lead', row_version: 2 }]);
  });

  test('enforces missing, company, actor, field, and stale guards', async () => {
    const db = await repository('inventory_transfer_activities_guards_test');
    await expect(db.executeMutation(schedule.mutation, { ...values, picking_id: 'missing-transfer' })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_TRANSFER_ACTIVITY_TRANSFER_NOT_FOUND' });
    await expect(db.executeMutation(schedule.mutation, { ...values, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_ACTIVITY_COMPANY' });
    await expect(db.executeMutation(schedule.mutation, { ...values, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_ACTIVITY_ACTOR_REQUIRED' });
    await expect(db.executeMutation(schedule.mutation, { ...values, activity_type: 'sms' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_TRANSFER_ACTIVITY_TYPE_INVALID' });
    await expect(db.executeMutation(schedule.mutation, { ...values, summary: '' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_TRANSFER_ACTIVITY_SUMMARY_INVALID' });
    await expect(db.executeMutation(schedule.mutation, { ...values, due_date: 'not-a-date' })).rejects.toMatchObject({ status: 422, code: 'INVENTORY_TRANSFER_ACTIVITY_DATE_INVALID' });
    await expect(db.executeMutation(schedule.mutation, { ...values, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_ACTIVITY_STALE_TRANSFER' });
    const created = await db.executeMutation(schedule.mutation, values) as any;
    await expect(db.executeMutation(complete.mutation, { id: created.id, expected_row_version: 99, current_company_name: values.current_company_name, current_user_name: 'Inventory Operator' })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_ACTIVITY_STALE' });
    await expect(db.executeMutation(complete.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'Other Company', current_user_name: 'Inventory Operator' })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_ACTIVITY_COMPANY' });
    expect(await db.query('SELECT COUNT(*) AS count FROM inventory_transfer_activities WHERE state = \'Done\'')).toEqual([{ count: 0 }]);
  });

  test('survives restart and enforces inventory.write', async () => {
    const databasePath = `/tmp/core3-inventory-transfer-activities-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_transfer_activities_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    const created = await firstRepository.executeMutation(schedule.mutation, values) as any;
    await firstRepository.executeMutation(complete.mutation, { id: created.id, expected_row_version: 1, current_company_name: values.current_company_name, current_user_name: 'Restart Operator' });
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, serviceRoot + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT state, completed_by FROM inventory_transfer_activities WHERE id = ?', [created.id])).toEqual([{ state: 'Done', completed_by: 'Restart Operator' }]);
    second.close();
    rmSync(databasePath, { force: true });

    const permissionDb = await repository('inventory_transfer_activities_permission_test');
    const user = { sub: 'inventory-reader', email: 'reader@core3.local', roles: ['user'], permissions: ['inventory.read'] };
    const handler = createYamlApi({
      repository: permissionDb,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(api.datasources.map((candidate: any) => [candidate.id, candidate])), pageSources: new Map([['transfer-detail', api.datasources.map((candidate: any) => candidate.id)]]),
      pages: new Map([['transfer-detail', { ...page, actions: api.actions }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write', 'inventory.manage'], tables: {}, endpoints: {} }, uploadRoot: '/tmp/core3-inventory-transfer-activities-test', eventStore: {}, topics: {},
    });
    await expect(handler(new Request('http://inventory.test/api/actions/stock.picking.activity.schedule', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values }) }), new URL('http://inventory.test/api/actions/stock.picking.activity.schedule'))).rejects.toMatchObject({ status: 403, message: 'Requires permission: inventory.write' });
  });
});

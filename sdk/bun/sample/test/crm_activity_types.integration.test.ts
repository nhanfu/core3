import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('CRM Activity Types Odoo action parity', () => {
  test('joins standalone page/API and places the action under Configuration > Activities', () => {
    const page = yaml('pages/activity-types.yaml');
    const api = yaml('api/activity-types.yaml');
    const manifest = yaml('manifest.yaml');
    const config = manifest.menu.groups.find((group: any) => group.id === 'configuration');
    const activities = config.items.find((item: any) => item.label === 'Activities');
    expect(page.page).toMatchObject({ id: 'crm-activity-types', route: '/crm/activity-types' });
    expect(api.page.id).toBe(page.page.id);
    expect(activities.children).toContainEqual(expect.objectContaining({ label: 'Activity Types', path: '/crm/activity-types' }));
    expect(page.components[0]).toMatchObject({ source: 'crm_activity_types_action', view_navigation: 'tabs' });
    expect(page.components[0].views.map((view: any) => view.label)).toEqual(['List', 'Kanban']);
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('crm-activity-types')).toEqual(['crm_activity_types_action']);
    expect(discoverPageRoutes(discovered)).toContainEqual(expect.objectContaining({ path: '/crm/activity-types', page: 'crm-activity-types', module: 'crm' }));
  });

  test('seeds deterministic Odoo-shaped rows and enforces CRUD boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_activity_types_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_activity_types_test', ['schema', 'data']);
    const api = yaml('api/activity-types.yaml');
    const source = api.datasources[0];
    const rows = (await repository.querySource(source, { q: null, active: null }, 0, 50)).data;
    expect(rows.map((row: any) => row.name)).toEqual(['Call', 'Meeting', 'Email', 'To-Do']);
    expect(rows.every((row: any) => row.active && (row.res_model === null || row.res_model === 'res.partner'))).toBe(true);
    expect(rows.map((row: any) => row.default_user_id)).toEqual(['Salesperson', 'Salesperson', 'Salesperson', 'Salesperson']);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: 'meeting', active: null }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(source, { q: 'missing', active: null }, 0, 50)).data).toEqual([]);
    const create = api.actions.find((action: any) => action.id === 'create_crm_activity_type_action');
    const edit = api.actions.find((action: any) => action.id === 'edit_crm_activity_type_action');
    expect(create.permission).toBe('crm.manage');
    expect(edit.mutation.concurrency.required).toBe(true);
    await expect(repository.executeMutation(create.mutation, { values: { name: '  ' } })).rejects.toMatchObject({ status: 422, code: 'CRM_ACTIVITY_TYPE_NAME_REQUIRED' });
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Demo Review', summary: 'Review proposal' } });
    expect(created).toMatchObject({ name: 'Demo Review', active: true });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'demo review' } })).rejects.toMatchObject({ status: 409, code: 'CRM_ACTIVITY_TYPE_EXISTS' });
    const editValues = { name: 'Updated Review', sequence: 10, summary: 'Review proposal', delay_count: 0, delay_unit: 'days', delay_from: 'current_date', res_model: 'res.partner', category: 'default' };
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: editValues });
    expect(edited).toBeDefined();
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...editValues, name: 'Stale' } })).rejects.toMatchObject({ status: 409 });
    database.close();
  });
});

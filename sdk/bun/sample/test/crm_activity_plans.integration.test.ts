import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('CRM Activity Plans Odoo action parity', () => {
  test('joins the dedicated list/detail contracts and exposes the configuration route', () => {
    const page = yaml('pages/activity-plans.yaml');
    const detail = yaml('pages/activity-plan-detail.yaml');
    const api = yaml('api/activity-plans.yaml');
    const detailApi = yaml('api/activity-plan-detail.yaml');
    const configuration = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration');
    expect(page.page).toMatchObject({ id: 'crm-activity-plans', route: '/crm/activity-plans' });
    expect(detail.page).toMatchObject({ id: 'crm-activity-plan-detail', route: '/crm/activity-plans/detail' });
    expect(api.page).toEqual({ id: 'crm-activity-plans' });
    expect(detailApi.page).toEqual({ id: 'crm-activity-plan-detail' });
    expect(configuration.items.find((item: any) => item.label === 'Activities').children)
      .toContainEqual(expect.objectContaining({ path: '/crm/activity-plans', label: 'Activity Plans', permission: 'crm.manage' }));
    expect(page.components[0]).toMatchObject({ source: 'crm_activity_plans_action', view_navigation: 'tabs' });
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('crm-activity-plans')).toEqual(['crm_activity_plans_action']);
    expect(discovered.pageDatasources.get('crm-activity-plan-detail')).toEqual(['crm_activity_plan_detail', 'crm_activity_plan_steps_detail']);
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/crm/activity-plans', page: 'crm-activity-plans', module: 'crm' }),
      expect.objectContaining({ path: '/crm/activity-plans/detail', page: 'crm-activity-plan-detail', module: 'crm' }),
    ]));
  });

  test('persists plans and ordered steps with manager-only guarded lifecycle', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_activity_plans_test', ['schema', 'data']);
    const api = yaml('api/activity-plans.yaml');
    const detailApi = yaml('api/activity-plan-detail.yaml');
    const source = api.datasources[0];
    const initial = (await repository.querySource(source, { q: null, active: null }, 0, 50)).data;
    expect(initial.map((row: any) => row.name)).toEqual(['New opportunity follow-up']);
    const create = api.actions.find((action: any) => action.id === 'create_crm_activity_plan_action');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Enterprise nurture' } });
    expect(created).toMatchObject({ name: 'Enterprise nurture', active: true, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' enterprise NURTURE ' } })).rejects.toMatchObject({ status: 409, code: 'CRM_ACTIVITY_PLAN_EXISTS' });
    const step = detailApi.actions.find((action: any) => action.id === 'create_crm_activity_plan_step_detail');
    const createdStep = await repository.executeMutation(step.mutation, { values: { plan_id: created.id, sequence: 20, activity_type: 'Call', summary: 'Call the account', delay_days: 3 } });
    expect(createdStep).toMatchObject({ plan_id: created.id, sequence: 20, activity_type: 'Call' });
    expect((await repository.querySource(source, { q: 'Enterprise', active: null }, 0, 50)).data[0].step_count).toBe(1);
    await expect(repository.executeMutation(api.actions.find((action: any) => action.id === 'delete_selected_crm_activity_plans').mutation, { ids: [created.id] })).rejects.toMatchObject({ status: 409, code: 'CRM_ACTIVITY_PLAN_IN_USE' });
    expect(create.permission).toBe('crm.manage');
    database.close();
  });
});

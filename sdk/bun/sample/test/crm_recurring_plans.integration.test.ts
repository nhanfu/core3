import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/recurring-plans.yaml').actions.find((entry: any) => entry.id === id);

describe('CRM Recurring Plans bounded parity', () => {
  test('maps Odoo action 402 and keeps the list-only page/API contract joined by page.id', () => {
    const odooMenu = readFileSync('/home/nhanjs/projects/odoo/addons/crm/views/crm_menu_views.xml', 'utf8');
    const odooViews = readFileSync('/home/nhanjs/projects/odoo/addons/crm/views/crm_recurring_plan_views.xml', 'utf8');
    const page = yaml('pages/recurring-plans.yaml');
    const api = yaml('api/recurring-plans.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(odooMenu).toContain('name="Recurring Plans"');
    expect(odooMenu).toContain('action="crm.crm_recurring_plan_action"');
    expect(odooViews).toContain('<field name="res_model">crm.recurring.plan</field>');
    expect(odooViews).toContain('<field name="view_mode">list</field>');
    expect(odooViews).toContain('<list editable="bottom">');
    expect(odooViews).toContain('<field name="name"/>');
    expect(odooViews).toContain('<field name="number_of_months"/>');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'recurring-plans', route: '/recurring-plans', auth: { require: ['crm.manage'] } });
    expect(api.page).toEqual({ id: page.page.id });
    expect(discovered.pageDatasources.get('recurring-plans')).toContain('crm_recurring_plans');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/recurring-plans', page: 'recurring-plans', module: 'crm' }),
    ]));
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'crm_recurring_plans', create_label: 'New' });
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual([' ', 'Plan Name', '# Months']);
    expect(page.components[0].filters).toEqual([{ field: 'active', label: 'Archived', options: [{ id: 'archived', label: 'Archived' }] }]);
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items)
      .toContainEqual({ path: '/recurring-plans', label: 'Recurring Plans', icon: 'list', permission: 'crm.manage' });
  });

  test('seeds the four Odoo plans, supports search/archived/empty/error/forbidden states, and is idempotent', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'crm_recurring_plans_acceptance_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'crm_recurring_plans_acceptance_migrations', ['schema', 'data']);
    const source = yaml('api/recurring-plans.yaml').datasources[0];

    expect((await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50)).data.map((row: any) => ({ id: row.id, name: row.name, number_of_months: row.number_of_months, row_version: row.row_version }))).toEqual([
      { id: 'crm-recurring-plan-monthly', name: 'Monthly', number_of_months: 1, row_version: 1 },
      { id: 'crm-recurring-plan-yearly', name: 'Yearly', number_of_months: 12, row_version: 1 },
      { id: 'crm-recurring-plan-over-3-years', name: 'Over 3 years', number_of_months: 36, row_version: 1 },
      { id: 'crm-recurring-plan-over-5-years', name: 'Over 5 years', number_of_months: 60, row_version: 1 },
    ]);
    expect((await repository.querySource(source, { q: 'year', active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Yearly', 'Over 3 years', 'Over 5 years']);
    expect((await repository.querySource(source, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Legacy quarterly']);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: 'missing', active: null, fixture_state: 'no_results' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: null, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'CRM_RECURRING_PLANS_FORBIDDEN' });
    await expect(repository.querySource(source, { q: null, active: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'CRM_RECURRING_PLANS_UNAVAILABLE' });
    await database.close();
  });

  test('enforces manager-only create/update/archive boundaries, validation, and stale writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'crm_recurring_plans_mutation_migrations', ['schema', 'data']);
    const create = action('create_crm_recurring_plan');
    const update = action('update_crm_recurring_plan');
    const archive = action('archive_crm_recurring_plan');
    const unarchive = action('unarchive_crm_recurring_plan');
    expect([create, update, archive, unarchive].every((entry: any) => entry.permission === 'crm.manage')).toBe(true);
    expect([create, update, archive, unarchive].every((entry: any) => entry.handler === 'yaml_mutation')).toBe(true);
    expect(update.mutation.concurrency).toEqual({ required: true });
    expect(archive.mutation.concurrency).toEqual({ required: true });

    const created = await repository.executeMutation(create.mutation, { values: { name: 'Biannual', number_of_months: 6, sequence: 50 } });
    expect(created).toMatchObject({ id: 'crm-recurring-plan-biannual', name: 'Biannual', number_of_months: 6, active: true, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' biannual ', number_of_months: 6 } })).rejects.toMatchObject({ status: 409, code: 'CRM_RECURRING_PLAN_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'No months', number_of_months: 0 } })).rejects.toMatchObject({ status: 422, code: 'CRM_RECURRING_PLAN_MONTHS_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { name: '   ', number_of_months: 1 } })).rejects.toMatchObject({ status: 422, code: 'CRM_RECURRING_PLAN_NAME_REQUIRED' });

    const edited = await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Biannual Updated', number_of_months: 6, sequence: 51 } });
    expect(edited).toMatchObject({ id: created.id, name: 'Biannual Updated', row_version: 2 });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale Plan', number_of_months: 6 } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(update.mutation, { id: 'missing-recurring-plan', expected_row_version: 1, values: { name: 'Missing', number_of_months: 1 } })).rejects.toMatchObject({ status: 404, code: 'CRM_RECURRING_PLAN_NOT_FOUND' });

    const archived = await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect(archived).toMatchObject({ id: created.id, active: false, row_version: 3 });
    await expect(repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 3, values: { active: false } })).rejects.toMatchObject({ status: 404, code: 'CRM_RECURRING_PLAN_NOT_FOUND' });
    const restored = await repository.executeMutation(unarchive.mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    expect(restored).toMatchObject({ id: created.id, active: true, row_version: 4 });
    await database.close();
  });
});

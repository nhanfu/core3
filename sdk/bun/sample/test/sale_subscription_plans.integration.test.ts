import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/sale_subscription');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (id: string) => yaml('api/subscription-plans.yaml').actions.find((entry: any) => entry.id === id);

describe('Subscriptions plan configuration contract', () => {
  test('joins the page and API by page.id and keeps manager actions off the page YAML', () => {
    const page = yaml('pages/subscription-plans.yaml');
    const api = yaml('api/subscription-plans.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page).toEqual({ id: page.page.id });
    expect(discovered.pages.get('subscription-plans')?.config.page.id).toBe('subscription-plans');
    expect(discovered.pageDatasources.get('subscription-plans')).toContain('subscription_plans');
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'subscription_plans', create_action: 'create_subscription_plan' });
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['subscriptions.read', 'subscriptions.write', 'subscriptions.manage']));
  });

  test('seeds stable plans, is idempotent, and exercises create and archive mutations', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'sale_subscription_plans_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'sale_subscription_plans_test', ['schema', 'data']);

    const source = yaml('api/subscription-plans.yaml').datasources[0];
    expect((await repository.querySource(source, {}, 0, 50)).data.map((row: any) => ({ id: row.id, name: row.name }))).toEqual([
      { id: 'plan-demo-yearly', name: 'Enterprise Platform' },
      { id: 'plan-demo-monthly', name: 'Premium Support' },
    ]);

    const create = action('create_subscription_plan');
    const archive = action('archive_subscription_plan');
    expect(create.permission).toBe('subscriptions.manage');
    expect(archive.permission).toBe('subscriptions.manage');
    expect(create.handler).toBe('yaml_mutation');
    expect(archive.handler).toBe('yaml_mutation');

    const created = await repository.executeMutation(create.mutation, { values: { name: 'Starter', recurring_period: 'Monthly', recurring_price: 99, trial_days: 7 } });
    expect(created).toMatchObject({ name: 'Starter', active: true });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' starter ' } })).rejects.toMatchObject({ status: 409, code: 'SUBSCRIPTION_PLAN_EXISTS' });
    await expect(repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 99, values: { active: false } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    const archived = await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 1, values: { active: false } });
    expect(archived).toMatchObject({ id: created.id, active: false, row_version: 2 });
    await expect(repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false } })).rejects.toMatchObject({ status: 409, code: 'SUBSCRIPTION_PLAN_ACTIVE_REQUIRED' });
    await database.close();
  });
});

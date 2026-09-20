import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/sale_subscription');

describe('Sale Subscription authenticated actor boundaries', () => {
  test('guards reads, direct lifecycle mutations, and plan management by actor permission', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'sale_subscription_actor_test', ['schema', 'data']);

    const discovered = discoverPages(join(import.meta.dir, '..'));
    const modulePages = new Map([...discovered.pages]
      .filter(([, page]) => page.module === 'sale-subscription')
      .map(([id, page]) => [id, page.config]));
    const moduleWorkflows = new Map([...discovered.workflows]
      .filter(([, workflow]) => workflow.module === 'sale-subscription')
      .map(([id, workflow]) => [id, workflow.config]));
    const moduleWorkflowFiles = new Map([...discovered.workflows]
      .filter(([, workflow]) => workflow.module === 'sale-subscription')
      .map(([id, workflow]) => [id, workflow.file]));
    let currentUser: any = null;
    const api = createYamlApi({
      repository,
      authProvider: {
        async getCurrentUser() { return currentUser; },
        hasPermission(user: any, permission: string) { return user.permissions.includes(permission); },
      },
      sources: new Map([...discovered.datasources].filter(([id]) => id.startsWith('subscription_') || id.startsWith('sale_subscription'))),
      pageSources: new Map([...discovered.pageDatasources].filter(([pageId]) => modulePages.has(pageId))),
      pages: modulePages,
      catalogs: discovered.catalogs,
      menus: new Map([...discovered.menus].filter(([, menu]) => menu.module === 'sale-subscription')),
      workflows: moduleWorkflows,
      workflowFiles: moduleWorkflowFiles,
      permissions: discovered.permissions.get('sale-subscription')?.config || {},
      uploadRoot: '/tmp/core3-sale-subscription-actor-uploads', eventStore: {}, topics: {},
    });
    const request = async (user: any, path: string, method = 'GET', body?: Record<string, unknown>) => {
      currentUser = user;
      try {
        return await api(new Request(`http://sale-subscription.test${path}`, {
          method,
          headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
          ...(body ? { body: JSON.stringify(body) } : {}),
        }), new URL(`http://sale-subscription.test${path}`));
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: error.status || 500 });
      }
    };
    const reader = { sub: 'subscription-reader', permissions: ['subscriptions.read'] };
    const writer = { sub: 'subscription-writer', permissions: ['subscriptions.read', 'subscriptions.write'] };
    const manager = { sub: 'subscription-manager', permissions: ['subscriptions.read', 'subscriptions.write', 'subscriptions.manage'] };

    const moduleActions = [...modulePages.values()]
      .flatMap((page: any) => page.actions || [])
      .filter((action: any) => action.type === 'server' || action.type === 'server_form');
    const actionNames = [...new Set(moduleActions.map((action: any) => action.action).filter(Boolean))].sort();
    expect(actionNames).toEqual([
      'subscriptions.activate',
      'subscriptions.churn',
      'subscriptions.close',
      'subscriptions.create',
      'subscriptions.invoices.generate',
      'subscriptions.invoices.post',
      'subscriptions.pause',
      'subscriptions.plans.archive',
      'subscriptions.plans.create',
      'subscriptions.update',
    ]);
    for (const action of moduleActions) {
      expect(['subscriptions.read', 'subscriptions.write', 'subscriptions.manage']).toContain(action.permission);
    }

    expect((await request(reader, '/api/pages/subscriptions')).status).toBe(200);

    for (const actionName of actionNames) {
      expect((await request(reader, `/api/actions/${actionName}`, 'POST', {})).status).toBe(403);
    }
    expect((await repository.query('SELECT state, row_version FROM sale_subscriptions WHERE id = ?', ['subscription-demo-002']))[0])
      .toEqual({ state: 'Quotation', row_version: 1 });

    const writerPlan = await request(writer, '/api/actions/subscriptions.plans.create', 'POST', {
      values: { name: 'Writer cannot create plans' },
    });
    expect(writerPlan.status).toBe(403);

    const managerPlan = await request(manager, '/api/actions/subscriptions.plans.create', 'POST', {
      values: { name: 'Managed actor plan', recurring_period: 'Monthly', recurring_price: 250, trial_days: 14 },
    });
    expect(managerPlan.status).toBe(200);
    expect(await managerPlan.json()).toMatchObject({ name: 'Managed actor plan', active: true });

    const writerLifecycle = await request(writer, '/api/actions/subscriptions.activate', 'POST', {
      id: 'subscription-demo-002', expected_row_version: 1,
    });
    expect(writerLifecycle.status).toBe(200);
    expect(await writerLifecycle.json()).toMatchObject({ id: 'subscription-demo-002', state: 'In Progress', row_version: 2 });
    expect((await repository.query('SELECT COUNT(*) AS count FROM sale_subscription_invoices WHERE subscription_id = ?', ['subscription-demo-002']))[0].count).toBe(1);

    await database.close();
  });
});

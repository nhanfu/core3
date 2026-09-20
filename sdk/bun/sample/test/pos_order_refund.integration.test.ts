import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/point_of_sale');
const sampleRoot = join(import.meta.dir, '..');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

const apiFor = (repository: YamlRepository, currentUser: { value: any }) => {
  const discovered = discoverPages(sampleRoot);
  const modulePages = [...discovered.pages].filter(([, page]) => page.module === 'point-of-sale');
  return createYamlApi({
    repository,
    authProvider: {
      async getCurrentUser() {
        if (!currentUser.value) throw { status: 401, code: 'UNAUTHENTICATED', message: 'Sign in before using POS.' };
        return currentUser.value;
      },
      hasPermission(user: any, permission: string) { return user.permissions.includes(permission); },
    },
    sources: new Map([...discovered.datasources].filter(([id]) => id.startsWith('pos_'))),
    pageSources: new Map([...discovered.pageDatasources].filter(([pageId]) => modulePages.some(([id]) => id === pageId))),
    pages: new Map(modulePages.map(([id, page]) => [id, page.config])),
    catalogs: discovered.catalogs,
    menus: discovered.menus,
    workflows: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'point-of-sale').map(([id, workflow]) => [id, workflow.config])),
    workflowFiles: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'point-of-sale').map(([id, workflow]) => [id, workflow.file])),
    permissions: discovered.permissions.get('point-of-sale')?.config || {},
    uploadRoot: '/tmp/core3-pos-refund-test-uploads', eventStore: {}, topics: {},
  });
};

const request = (api: ReturnType<typeof createYamlApi>, body: Record<string, unknown>) => {
  const url = new URL('http://pos.test/api/actions/pos.orders.refund');
  return api(new Request(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }), url);
};

describe('POS Return Products action', () => {
  test('joins the Odoo order action through separate page and API contracts', () => {
    const page = yaml('pages/pos-order-detail.yaml');
    const api = yaml('api/pos-order-detail.yaml');
    const header = page.components.find((component: any) => component.type === 'OdooFormView').header_actions;
    const action = api.actions.find((candidate: any) => candidate.id === 'return_pos_order_detail');
    expect(page.page.id).toBe('pos-order-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(header).toContainEqual(expect.objectContaining({ id: 'return_pos_order_detail', label: 'Return Products', permission: 'pos.write' }));
    expect(action).toMatchObject({ type: 'server', action: 'pos.orders.refund', permission: 'pos.write', operation: 'refund' });
    expect(action.mutation.generated).toEqual(['refund_order_id']);
    expect(action.refresh).toEqual(expect.arrayContaining(['pos_order_detail', 'pos_orders']));
    expect(api.datasources[0].query).toContain('is_refund');
    expect(yaml('migrations/20260920100000-046-pos-order-refund.yaml').type.postgres.up).toContain('pos-order-refund-source-001');
  });

  test('creates a durable full-line return and rejects replay, stale, wrong-company, and read-only mutations', async () => {
    const workDir = mkdtempSync(join(tmpdir(), 'core3-pos-refund-'));
    const databasePath = join(workDir, 'pos.duckdb');
    const migrationName = `pos_order_refund_${crypto.randomUUID().replaceAll('-', '_')}`;
    const user = { value: { sub: 'pos-manager', name: 'POS Manager', company: { name: 'Core3 Demo Company' }, permissions: ['pos.read', 'pos.write'] } };
    const action = yaml('api/pos-order-detail.yaml').actions.find((candidate: any) => candidate.id === 'return_pos_order_detail');
    const first = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(first);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);

    const base = { id: 'pos-order-refund-source-001', expected_row_version: 1, current_user_id: 'pos-manager', current_company_name: 'Core3 Demo Company' };
    await expect(repository.executeMutation(action.mutation, { ...base, expected_row_version: 9 })).rejects.toMatchObject({ status: 409, code: 'POS_ORDER_STALE' });
    await expect(repository.executeMutation(action.mutation, { ...base, current_company_name: 'Core3 Vietnam Branch' })).rejects.toMatchObject({ status: 403, code: 'POS_ORDER_COMPANY_FORBIDDEN' });
    user.value = { ...user.value, permissions: ['pos.read'] };
    await expect(request(apiFor(repository, user), base)).rejects.toMatchObject({ status: 403 });
    user.value = { ...user.value, permissions: ['pos.read', 'pos.write'] };

    const returned = await request(apiFor(repository, user), base);
    expect(returned?.status).toBe(200);
    const returnedBody = await returned!.json();
    expect(returnedBody).toMatchObject({ state: 'New', is_refund: true, original_order_id: base.id, amount_total: -12.1, amount_paid: 0 });
    const sourceAfter = (await repository.query('SELECT row_version, actor_id FROM pos_orders WHERE id = ?', [base.id]))[0];
    expect(sourceAfter).toMatchObject({ row_version: 2, actor_id: 'pos-manager' });
    expect(await repository.query('SELECT product_name, quantity, price_total FROM pos_order_lines WHERE order_id = ?', [returnedBody.id]))
      .toEqual([{ product_name: 'Refund fixture product', quantity: -2, price_total: -12.1 }]);
    await expect(repository.executeMutation(action.mutation, { ...base, expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'POS_ORDER_ALREADY_REFUNDED' });
    first.close();

    const reopened = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopened);
    await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await reopenedRepository.query('SELECT is_refund, original_order_id, amount_total FROM pos_orders WHERE id = ?', [returnedBody.id]))
      .toEqual([{ is_refund: true, original_order_id: base.id, amount_total: -12.1 }]);
    expect((await reopenedRepository.query('SELECT COUNT(*) AS count FROM pos_order_lines WHERE order_id = ?', [returnedBody.id]))[0].count).toBe(1);
    reopened.close();
    rmSync(workDir, { recursive: true, force: true });
  });

  test('requires an active same-configuration session and leaves source state unchanged on rejection', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, `pos_order_refund_guards_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
    const action = yaml('api/pos-order-detail.yaml').actions.find((candidate: any) => candidate.id === 'return_pos_order_detail');
    const base = { id: 'pos-order-refund-source-001', expected_row_version: 1, current_user_id: 'pos-manager', current_company_name: 'Core3 Demo Company' };
    await repository.run("UPDATE pos_sessions SET state = 'Closed & Posted' WHERE id = 'pos-session-demo-001'");
    const before = (await repository.query('SELECT state, row_version, original_order_id FROM pos_orders WHERE id = ?', [base.id]))[0];
    await expect(repository.executeMutation(action.mutation, base)).rejects.toMatchObject({ status: 409, code: 'POS_ORDER_REFUND_SESSION_REQUIRED' });
    expect((await repository.query('SELECT state, row_version, original_order_id FROM pos_orders WHERE id = ?', [base.id]))[0]).toEqual(before);
    database.close();
  });
});

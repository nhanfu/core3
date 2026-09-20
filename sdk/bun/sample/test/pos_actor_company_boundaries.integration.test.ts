import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/point_of_sale');
const sampleRoot = join(import.meta.dir, '..');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

const posApi = (repository: YamlRepository, currentUser: { value: any }) => {
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
    uploadRoot: '/tmp/core3-pos-boundary-test-uploads', eventStore: {}, topics: {},
  });
};

const request = (api: ReturnType<typeof createYamlApi>, path: string, body: Record<string, unknown>) => {
  const url = new URL(`http://pos.test${path}`);
  return api(new Request(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }), url);
};

const get = (api: ReturnType<typeof createYamlApi>, path: string) => {
  const url = new URL(`http://pos.test${path}`);
  return api(new Request(url), url);
};

const snapshot = async (repository: YamlRepository, id: string) => (await repository.query(
  'SELECT state, row_version, amount_paid, actor_id, company FROM pos_orders WHERE id = ?', [id],
))[0];

describe('POS R2 actor and company boundaries', () => {
  test('isolates session, order, and payment detail routes by the authenticated company', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_actor_company_boundaries', ['schema', 'data']);

    const session = yaml('api/pos-session-detail.yaml').datasources[0];
    const order = yaml('api/pos-order-detail.yaml').datasources[0];
    const payment = yaml('api/pos-payment-detail.yaml').datasources[0];
    const demo = { id: 'pos-session-demo-001', current_company_name: 'Core3 Demo Company' };
    const vietnam = { id: 'pos-session-r2-vietnam', current_company_name: 'Core3 Vietnam Branch' };

    expect((await repository.querySource(session, demo, 0, 1)).data).toMatchObject({ id: demo.id, company: demo.current_company_name });
    expect((await repository.querySource(session, { ...vietnam, current_company_name: demo.current_company_name }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(session, vietnam, 0, 1)).data).toMatchObject({ id: vietnam.id, company: vietnam.current_company_name });
    expect((await repository.querySource(order, { id: 'pos-order-r2-vietnam', current_company_name: 'Core3 Demo Company' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(payment, { id: 'pos-payment-r2-vietnam', current_company_name: 'Core3 Vietnam Branch' }, 0, 1)).data)
      .toMatchObject({ id: 'pos-payment-r2-vietnam', company: 'Core3 Vietnam Branch' });
  });

  test('requires an authenticated actor, company ownership, and the current order version before payment', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_actor_payment_mutation', ['schema', 'data']);
    await repository.run("INSERT INTO pos_orders(id, name, session_id, state, amount_total, amount_paid, company) VALUES ('pos-order-r2-payment-test', 'POS/R2/TEST', 'pos-session-demo-001', 'New', 20, 0, 'Core3 Demo Company')");
    const action = yaml('pages/pos-order-detail.yaml').actions.find((candidate: any) => candidate.id === 'pay_pos_order_detail');
    const base = { id: 'pos-order-r2-payment-test', payment_amount: 20, payment_method: 'Cash', expected_row_version: 1 };

    await expect(repository.executeMutation(action.mutation, base)).rejects.toMatchObject({ status: 401, code: 'POS_ORDER_UNAUTHENTICATED' });
    await expect(repository.executeMutation(action.mutation, { ...base, current_user_id: 'user-admin', current_company_name: 'Core3 Vietnam Branch' }))
      .rejects.toMatchObject({ status: 403, code: 'POS_ORDER_COMPANY_FORBIDDEN' });
    await expect(repository.executeMutation(action.mutation, { ...base, current_user_id: 'user-admin', current_company_name: 'Core3 Demo Company', expected_row_version: 9 }))
      .rejects.toMatchObject({ status: 409, code: 'POS_ORDER_STALE' });

    const paid = await repository.executeMutation(action.mutation, { ...base, current_user_id: 'user-admin', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company' }) as any;
    expect(paid).toMatchObject({ id: base.id, state: 'Paid', amount_paid: 20, actor_id: 'user-admin' });
    expect(await repository.query('SELECT COUNT(*) AS count FROM pos_payments WHERE order_id = ?', [base.id])).toEqual([{ count: 1 }]);
    expect(await repository.query('SELECT COUNT(*) AS count FROM pos_payments WHERE order_id = ?', ['missing-order'])).toEqual([{ count: 0 }]);
  });

  test('declares refusal states and actor/company guards on the three R2 surfaces', () => {
    const session = yaml('api/pos-session-detail.yaml');
    const order = yaml('api/pos-order-detail.yaml');
    const payment = yaml('api/pos-payment-detail.yaml');
    for (const source of [session.datasources[0], order.datasources[0], payment.datasources[0]]) {
      expect(source.error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, not_found: { status: 404 }, transport_error: { status: 503 } });
      expect(source.query).toContain(':current_company_name');
    }
    const workflow = yaml('pages/pos-order-workflow.yaml').workflow;
    expect(workflow.transitions[0].mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 401, code: 'POS_ORDER_UNAUTHENTICATED' }),
      expect.objectContaining({ status: 403, code: 'POS_ORDER_COMPANY_FORBIDDEN' }),
      expect.objectContaining({ status: 409, code: 'POS_ORDER_STALE' }),
    ]));
  });

  test('exercises list/detail datasource refusal contracts through the POS query route', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_actor_query_routes', ['schema', 'data']);
    const currentUser = { value: { sub: 'cashier-demo', name: 'Demo Cashier', company: { name: 'Core3 Demo Company' }, permissions: ['pos.read'] } };
    const api = posApi(repository, currentUser);
    const sources = [
      ['pos_sessions', yaml('api/sessions.yaml').datasources.find((source: any) => source.id === 'pos_sessions')],
      ['pos_orders', yaml('api/pos-orders.yaml').datasources.find((source: any) => source.id === 'pos_orders')],
      ['pos_payments', yaml('api/pos-payments.yaml').datasources.find((source: any) => source.id === 'pos_payments')],
      ['pos_session_detail', yaml('api/pos-session-detail.yaml').datasources.find((source: any) => source.id === 'pos_session_detail')],
      ['pos_order_detail', yaml('api/pos-order-detail.yaml').datasources.find((source: any) => source.id === 'pos_order_detail')],
      ['pos_payment_detail', yaml('api/pos-payment-detail.yaml').datasources.find((source: any) => source.id === 'pos_payment_detail')],
    ] as const;

    for (const [sourceId, source] of sources) {
      expect(source.error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
      const query = (fixture_state: string, params: Record<string, unknown> = {}) => request(api, '/api/query', {
        sourceId, params: { ...params, fixture_state },
      });
      await expect(query('unauthorized')).rejects.toMatchObject({ status: 401 });
      currentUser.value = { ...currentUser.value, permissions: [] };
      await expect(query('forbidden')).rejects.toMatchObject({ status: 403 });
      currentUser.value = { ...currentUser.value, permissions: ['pos.read'] };
      if (source.error_states?.not_found) await expect(query('not_found', { id: 'missing-pos-record' })).rejects.toMatchObject({ status: 404 });
      await expect(query('transport_error')).rejects.toMatchObject({ status: 503 });
    }

    currentUser.value = null;
    await expect(request(api, '/api/query', { sourceId: 'pos_orders', params: {} })).rejects.toMatchObject({ status: 401 });
    database.close();
  });

  test('injects the authenticated company into the discovered POS page route', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_actor_page_routes', ['schema', 'data']);
    const currentUser = { value: { sub: 'cashier-demo', name: 'Demo Cashier', company: { name: 'Core3 Demo Company' }, permissions: ['pos.read'] } };
    const api = posApi(repository, currentUser);
    const demoPage = await get(api, '/api/pages/pos-orders');
    expect(demoPage?.status).toBe(200);
    expect((await demoPage!.json()).datasources.find((source: any) => source.id === 'pos_orders').data.map((row: any) => row.company))
      .toEqual(expect.arrayContaining(['Core3 Demo Company']));

    currentUser.value = { ...currentUser.value, company: { name: 'Core3 Vietnam Branch' } };
    const vietnamPage = await get(api, '/api/pages/pos-orders?company_name=Core3%20Demo%20Company');
    expect(vietnamPage?.status).toBe(200);
    const vietnamRows = (await vietnamPage!.json()).datasources.find((source: any) => source.id === 'pos_orders').data;
    expect(vietnamRows.map((row: any) => row.id)).toEqual(['pos-order-r2-vietnam']);
    database.close();
  });

  test('keeps list routes company-scoped and exercises session/order action paths', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_actor_action_routes', ['schema', 'data']);
    const currentUser = { value: { sub: 'cashier-demo', name: 'Demo Cashier', company: { name: 'Core3 Demo Company' }, permissions: ['pos.read', 'pos.write', 'pos.manage'] } };
    const api = posApi(repository, currentUser);
    const orders = yaml('api/pos-orders.yaml').datasources.find((source: any) => source.id === 'pos_orders');
    const sessions = yaml('api/sessions.yaml').datasources.find((source: any) => source.id === 'pos_sessions');
    expect((await repository.querySource(orders, { current_company_name: 'Core3 Demo Company', q: null, state: null }, 0, 50)).data.map((row: any) => row.id))
      .not.toContain('pos-order-r2-vietnam');
    expect((await repository.querySource(orders, { current_company_name: 'Core3 Vietnam Branch', q: null, state: null }, 0, 50)).data.map((row: any) => row.id))
      .toContain('pos-order-r2-vietnam');
    expect((await repository.querySource(sessions, { current_company_name: 'Core3 Demo Company' }, 0, 50)).data.map((row: any) => row.id))
      .not.toContain('pos-session-r2-vietnam');

    const open = (id: string, expected_row_version: number) => request(api, '/api/actions/pos.sessions.open', { id, expected_row_version, values: {} });
    const cancel = (id: string, expected_row_version: number) => request(api, '/api/actions/pos.orders.cancel', { id, expected_row_version, values: {} });

    const sessionBefore = (await repository.query('SELECT state, row_version, actor_id FROM pos_sessions WHERE id = ?', ['pos-session-demo-opening']))[0];
    await expect(open('pos-session-r2-vietnam', 1)).rejects.toMatchObject({ status: 403, code: 'POS_SESSION_COMPANY_FORBIDDEN' });
    expect((await repository.query('SELECT state, row_version, actor_id FROM pos_sessions WHERE id = ?', ['pos-session-r2-vietnam']))[0])
      .toMatchObject({ state: 'In Progress', row_version: 1, actor_id: null });
    await expect(open('missing-pos-session', 1)).rejects.toMatchObject({ status: 404, code: 'POS_SESSION_NOT_FOUND' });
    await expect(open('pos-session-demo-opening', 9)).rejects.toMatchObject({ status: 409, code: 'POS_SESSION_STALE' });
    expect((await repository.query('SELECT state, row_version, actor_id FROM pos_sessions WHERE id = ?', ['pos-session-demo-opening']))[0])
      .toEqual(sessionBefore);
    await expect(open('pos-session-demo-opening', 1)).resolves.toMatchObject({ status: 200 });
    expect((await repository.query('SELECT state, row_version, actor_id FROM pos_sessions WHERE id = ?', ['pos-session-demo-opening']))[0])
      .toMatchObject({ state: 'In Progress', row_version: 2, actor_id: 'cashier-demo' });

    await expect(cancel('pos-order-r2-vietnam', 1)).rejects.toMatchObject({ status: 403, code: 'POS_ORDER_COMPANY_FORBIDDEN' });
    expect(await snapshot(repository, 'pos-order-r2-vietnam')).toMatchObject({ state: 'Paid', row_version: 1, actor_id: null, company: 'Core3 Vietnam Branch' });
    await expect(cancel('missing-pos-order', 1)).rejects.toMatchObject({ status: 404, code: 'POS_ORDER_NOT_FOUND' });
    const orderBefore = await snapshot(repository, 'pos-order-demo-001');
    await expect(cancel('pos-order-demo-001', 9)).rejects.toMatchObject({ status: 409, code: 'POS_ORDER_STALE' });
    expect(await snapshot(repository, 'pos-order-demo-001')).toEqual(orderBefore);

    await repository.run("INSERT INTO pos_orders(id, name, session_id, state, amount_total, amount_paid, company) VALUES ('pos-order-r2-http-pay', 'POS/R2/HTTP-PAY', 'pos-session-demo-001', 'New', 20, 0, 'Core3 Demo Company')");
    const paymentResponse = await request(api, '/api/actions/pos.orders.pay', {
      id: 'pos-order-r2-http-pay', expected_row_version: 1,
      values: { payment_amount: 20, payment_method: 'Cash' },
    });
    expect(paymentResponse?.status).toBe(200);
    expect(await paymentResponse!.json()).toMatchObject({ id: 'pos-order-r2-http-pay', state: 'Paid', amount_paid: 20, actor_id: 'cashier-demo' });
    expect((await repository.query('SELECT company, actor_id FROM pos_payments WHERE order_id = ?', ['pos-order-r2-http-pay']))[0])
      .toEqual({ company: 'Core3 Demo Company', actor_id: 'cashier-demo' });

    await repository.run("INSERT INTO pos_orders(id, name, session_id, state, amount_total, amount_paid, company) VALUES ('pos-order-r2-http-reject', 'POS/R2/HTTP-REJECT', 'pos-session-demo-001', 'New', 20, 0, 'Core3 Demo Company')");
    const rejectedBefore = await snapshot(repository, 'pos-order-r2-http-reject');
    const rejectedPayments = async () => (await repository.query('SELECT COUNT(*) AS count FROM pos_payments WHERE order_id = ?', ['pos-order-r2-http-reject']))[0].count;
    currentUser.value = { ...currentUser.value, company: { name: 'Core3 Vietnam Branch' } };
    await expect(request(api, '/api/actions/pos.orders.pay', { id: 'pos-order-r2-http-reject', expected_row_version: 1, values: { payment_amount: 20, payment_method: 'Cash' } }))
      .rejects.toMatchObject({ status: 403, code: 'POS_ORDER_COMPANY_FORBIDDEN' });
    expect(await snapshot(repository, 'pos-order-r2-http-reject')).toEqual(rejectedBefore);
    expect(await rejectedPayments()).toBe(0);
    currentUser.value = { ...currentUser.value, company: { name: 'Core3 Demo Company' } };
    await expect(request(api, '/api/actions/pos.orders.pay', { id: 'pos-order-r2-http-reject', expected_row_version: 9, values: { payment_amount: 20, payment_method: 'Cash' } }))
      .rejects.toMatchObject({ status: 409, code: 'POS_ORDER_STALE' });
    expect(await snapshot(repository, 'pos-order-r2-http-reject')).toEqual(rejectedBefore);
    expect(await rejectedPayments()).toBe(0);
    currentUser.value = { ...currentUser.value, permissions: ['pos.read'] };
    await expect(request(api, '/api/actions/pos.orders.pay', { id: 'pos-order-r2-http-reject', expected_row_version: 1, values: { payment_amount: 20, payment_method: 'Cash' } }))
      .rejects.toMatchObject({ status: 403 });
    expect(await snapshot(repository, 'pos-order-r2-http-reject')).toEqual(rejectedBefore);
    currentUser.value = null;
    await expect(request(api, '/api/actions/pos.orders.pay', { id: 'pos-order-r2-http-reject', expected_row_version: 1, values: { payment_amount: 20, payment_method: 'Cash' } }))
      .rejects.toMatchObject({ status: 401 });
    expect(await snapshot(repository, 'pos-order-r2-http-reject')).toEqual(rejectedBefore);
    currentUser.value = { sub: 'cashier-demo', name: 'Demo Cashier', company: { name: 'Core3 Demo Company' }, permissions: ['pos.read', 'pos.write', 'pos.manage'] };
    await expect(request(api, '/api/actions/pos.orders.pay', { id: 'missing-pos-order', expected_row_version: 1, values: { payment_amount: 20, payment_method: 'Cash' } }))
      .rejects.toMatchObject({ status: 404, code: 'POS_ORDER_NOT_FOUND' });
    expect(await rejectedPayments()).toBe(0);

    const closingBefore = (await repository.query('SELECT state, row_version, actor_id, balance_end FROM pos_sessions WHERE id = ?', ['pos-session-demo-closing']))[0];
    currentUser.value = { ...currentUser.value, permissions: ['pos.read', 'pos.write'] };
    await expect(request(api, '/api/actions/pos.sessions.close', { id: 'pos-session-demo-closing', expected_row_version: 1, values: { balance_end: 418.5 } }))
      .rejects.toMatchObject({ status: 403 });
    expect((await repository.query('SELECT state, row_version, actor_id, balance_end FROM pos_sessions WHERE id = ?', ['pos-session-demo-closing']))[0]).toEqual(closingBefore);
    currentUser.value = { ...currentUser.value, permissions: ['pos.read', 'pos.write', 'pos.manage'] };
    await expect(request(api, '/api/actions/pos.sessions.close', { id: 'pos-session-demo-closing', expected_row_version: 9, values: { balance_end: 418.5 } }))
      .rejects.toMatchObject({ status: 409, code: 'POS_SESSION_STALE' });
    expect((await repository.query('SELECT state, row_version, actor_id, balance_end FROM pos_sessions WHERE id = ?', ['pos-session-demo-closing']))[0]).toEqual(closingBefore);
    await expect(request(api, '/api/actions/pos.sessions.close', { id: 'pos-session-demo-closing', expected_row_version: 1, values: { balance_end: 418.5 } }))
      .resolves.toMatchObject({ status: 200 });
    expect((await repository.query('SELECT state, row_version, actor_id, company FROM pos_sessions WHERE id = ?', ['pos-session-demo-closing']))[0])
      .toMatchObject({ state: 'Closed & Posted', row_version: 2, actor_id: 'cashier-demo', company: 'Core3 Demo Company' });
    database.close();
  });

  test('leaves order and payment rows unchanged for every rejected payment path', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_actor_payment_rejections', ['schema', 'data']);
    await repository.run("INSERT INTO pos_orders(id, name, session_id, state, amount_total, amount_paid, company) VALUES ('pos-order-r2-reject', 'POS/R2/REJECT', 'pos-session-demo-001', 'New', 20, 0, 'Core3 Demo Company')");
    const action = yaml('pages/pos-order-detail.yaml').actions.find((candidate: any) => candidate.id === 'pay_pos_order_detail');
    const base = { id: 'pos-order-r2-reject', payment_amount: 20, payment_method: 'Cash', expected_row_version: 1 };
    const before = await snapshot(repository, base.id);
    const paymentCount = async () => (await repository.query('SELECT COUNT(*) AS count FROM pos_payments WHERE order_id = ?', [base.id]))[0].count;

    await expect(repository.executeMutation(action.mutation, base)).rejects.toMatchObject({ status: 401, code: 'POS_ORDER_UNAUTHENTICATED' });
    await expect(repository.executeMutation(action.mutation, { ...base, current_user_id: 'cashier-demo', current_company_name: 'Core3 Vietnam Branch' }))
      .rejects.toMatchObject({ status: 403, code: 'POS_ORDER_COMPANY_FORBIDDEN' });
    await expect(repository.executeMutation(action.mutation, { ...base, current_user_id: 'cashier-demo', current_company_name: 'Core3 Demo Company', expected_row_version: 9 }))
      .rejects.toMatchObject({ status: 409, code: 'POS_ORDER_STALE' });
    await expect(repository.executeMutation(action.mutation, { ...base, current_user_id: 'cashier-demo', current_company_name: 'Core3 Demo Company', payment_amount: 21 }))
      .rejects.toMatchObject({ status: 400 });
    expect(await snapshot(repository, base.id)).toEqual(before);
    expect(await paymentCount()).toBe(0);
    database.close();
  });
});

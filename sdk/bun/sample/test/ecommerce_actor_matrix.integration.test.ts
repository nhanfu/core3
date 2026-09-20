import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { bindNamedParams } from '@core3/server/database/sql';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { EcommerceSalesHandoffConsumer } from '../services/order/sales-handoff-consumer';

const ecommerceRoot = join(import.meta.dir, '../services/ecommerce');
const orderRoot = join(import.meta.dir, '../services/order');
const yaml = (root: string, file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

const authHeader = { Authorization: 'Bearer ecommerce-actor-matrix-test' };

type Actor = {
  sub: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  company?: { name: string };
  company_name?: string;
};

const manager: Actor = {
  sub: 'ecommerce-manager',
  email: 'manager@workspace.example',
  name: 'Ecommerce Manager',
  roles: ['manager'],
  permissions: ['ecommerce.read', 'ecommerce.write'],
  company: { name: 'My Company' },
};

const editor: Actor = {
  sub: 'ecommerce-editor',
  email: 'editor@workspace.example',
  name: 'Catalog Editor',
  roles: ['editor'],
  permissions: ['ecommerce.read', 'ecommerce.write'],
  company: { name: 'My Company' },
};

const customer: Actor = {
  sub: 'ecommerce-customer-user',
  email: 'hello@workspace.example',
  name: 'Workspace Buyer',
  roles: ['customer'],
  permissions: ['ecommerce.read', 'ecommerce.write'],
  company: { name: 'My Company' },
};

const otherCompanyCustomer: Actor = {
  sub: 'ecommerce-other-company-user',
  email: 'buyer@acme.example',
  name: 'Other Company Buyer',
  roles: ['customer'],
  permissions: ['ecommerce.read', 'ecommerce.write'],
  company: { name: 'Other Company' },
};

const admin: Actor = {
  sub: 'ecommerce-admin',
  email: 'admin@workspace.example',
  name: 'Ecommerce Administrator',
  roles: ['admin'],
  permissions: ['ecommerce.read', 'ecommerce.write'],
};

function createActorApi(repository: YamlRepository, actorRef: { current: Actor | null }) {
  const documents = [
    yaml(ecommerceRoot, 'api/cart.yaml'),
    yaml(ecommerceRoot, 'api/checkout.yaml'),
    yaml(ecommerceRoot, 'api/customers.yaml'),
    yaml(ecommerceRoot, 'api/orders.yaml'),
  ];
  const sources = new Map(documents.flatMap((document: any) =>
    (document.datasources || []).map((source: any) => [source.id, source] as const)));
  const pages = new Map(documents.map((document: any) => [
    document.page.id,
    { actions: document.actions || [] },
  ]));
  return createYamlApi({
    repository,
    authProvider: {
      async getCurrentUser() {
        if (!actorRef.current) throw { status: 401, code: 'UNAUTHORIZED' };
        return actorRef.current;
      },
      hasPermission(user: Actor, permission: string) {
        return user.permissions.includes(permission);
      },
    },
    sources,
    pageSources: new Map(),
    pages,
    catalogs: new Map(),
    menus: new Map(),
    workflows: new Map(),
    workflowFiles: new Map(),
    permissions: { permissions: ['ecommerce.read', 'ecommerce.write'], tables: {}, endpoints: {} },
    uploadRoot: `/tmp/core3-ecommerce-actor-matrix-${crypto.randomUUID()}`,
    eventStore: {},
    topics: {},
  });
}

async function query(api: ReturnType<typeof createYamlApi>, sourceId: string, params: Record<string, unknown> = {}) {
  const response = await api(new Request('http://ecommerce.test/api/query', {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId, params, top: 50 }),
  }), new URL('http://ecommerce.test/api/query'));
  return response.json() as Promise<{ data: any[] }>;
}

async function action(api: ReturnType<typeof createYamlApi>, name: string, body: Record<string, unknown>) {
  return api(new Request(`http://ecommerce.test/api/actions/${name}`, {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }), new URL(`http://ecommerce.test/api/actions/${name}`));
}

describe('eCommerce authenticated actor and restart boundaries', () => {
  test('enforces actor role, company, permission, and ownership boundaries over HTTP', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(ecommerceRoot, 'migrations'), undefined, 'ecommerce_actor_matrix_test', ['schema', 'data']);
    await repository.run("INSERT INTO ecommerce_customers (id, name, email, company_name) VALUES ('ecommerce-customer-other-001', 'Other Buyer', 'other@other-company.example', 'Other Company')");
    await repository.run("INSERT INTO ecommerce_orders (id, order_number, customer_id, customer_name, customer_email, amount_total, currency, state, date_order, company_name) VALUES ('ecommerce-order-other-001', 'WEB/2026/0090', 'ecommerce-customer-other-001', 'Other Buyer', 'other@other-company.example', 19, 'USD', 'Quotation', TIMESTAMP '2026-09-10 09:00:00', 'Other Company')");

    const actorRef = { current: manager as Actor | null };
    const api = createActorApi(repository, actorRef);
    expect((await query(api, 'ecommerce_orders')).data).toHaveLength(3);

    actorRef.current = editor;
    expect((await query(api, 'ecommerce_orders', { company_name: 'Other Company' })).data).toHaveLength(3);

    actorRef.current = customer;
    expect((await query(api, 'ecommerce_orders')).data.map((row) => row.customer_email)).toEqual(['hello@workspace.example']);
    expect((await query(api, 'ecommerce_orders', { customer_id: 'ecommerce-customer-001' })).data).toEqual([]);

    actorRef.current = otherCompanyCustomer;
    expect((await query(api, 'ecommerce_orders')).data).toEqual([]);
    await expect(action(api, 'ecommerce.checkout.confirm', {
      values: {
        cart_id: 'ecommerce-cart-open-001',
        customer_name: 'Other Company Buyer',
        customer_email: 'buyer@acme.example',
        shipping_address: '1 Other Company Street',
        delivery_method: 'Standard Delivery',
        payment_method: 'Wire Transfer',
      },
    })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_CHECKOUT_OWNERSHIP_REQUIRED' });

    actorRef.current = admin;
    expect((await query(api, 'ecommerce_orders', { company_name: 'Other Company' })).data.map((row) => row.order_number)).toEqual(['WEB/2026/0090']);

    actorRef.current = { ...customer, permissions: ['ecommerce.read'] };
    await expect(action(api, 'ecommerce.checkout.confirm', {
      values: {
        cart_id: 'ecommerce-cart-open-001',
        customer_name: 'Workspace Buyer',
        customer_email: 'hello@workspace.example',
        shipping_address: '1 Workspace Street',
        delivery_method: 'Standard Delivery',
        payment_method: 'Wire Transfer',
      },
    })).rejects.toMatchObject({ status: 403 });

    actorRef.current = null;
    await expect(query(api, 'ecommerce_orders')).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    database.close();
  });

  test('does not let a company-less actor widen scope with a submitted company filter', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(ecommerceRoot, 'migrations'), undefined, 'ecommerce_company_filter_test', ['schema', 'data']);
    await repository.run("INSERT INTO ecommerce_orders (id, order_number, customer_name, customer_email, amount_total, currency, state, date_order, company_name) VALUES ('ecommerce-order-other-002', 'WEB/2026/0091', 'Other Buyer', 'other@other-company.example', 19, 'USD', 'Quotation', TIMESTAMP '2026-09-10 09:00:00', 'Other Company')");
    const actorRef = { current: { ...manager, company: undefined, company_name: undefined } as Actor | null };
    const api = createActorApi(repository, actorRef);
    expect((await query(api, 'ecommerce_orders', { company_name: 'Other Company' })).data).toEqual([]);
    database.close();
  });

  test('persists checkout and retries the Sales handoff across an eCommerce restart', async () => {
    const ecommercePath = `/tmp/core3-ecommerce-checkout-restart-${crypto.randomUUID()}.duckdb`;
    const salesPath = `/tmp/core3-sales-handoff-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_checkout_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const migrationRoot = join(ecommerceRoot, 'migrations');
    const checkout = yaml(ecommerceRoot, 'api/checkout.yaml').actions.find((candidate: any) => candidate.id === 'confirm_ecommerce_checkout');
    let ecommerce = await DuckDbDatabase.open(ecommercePath);
    let ecommerceRepository = new YamlRepository(ecommerce);
    await migrateDatabase(ecommerceRepository, migrationRoot, undefined, migrationName, ['schema', 'data']);
    const created = await ecommerceRepository.executeMutation(checkout.mutation, {
      values: {
        cart_id: 'ecommerce-cart-open-001',
        customer_name: 'Acme Corporation',
        customer_email: 'buyer@acme.example',
        shipping_address: '1 Main Street',
        delivery_method: 'Standard Delivery',
        payment_method: 'Wire Transfer',
      },
    }) as any;
    expect((await ecommerceRepository.query('SELECT state FROM ecommerce_sales_handoffs WHERE ecommerce_order_id = ?', [created.id]))[0].state).toBe('Pending');
    ecommerce.close();

    ecommerce = await DuckDbDatabase.open(ecommercePath);
    ecommerceRepository = new YamlRepository(ecommerce);
    await migrateDatabase(ecommerceRepository, migrationRoot, undefined, migrationName, ['schema', 'data']);
    const persisted = (await ecommerceRepository.query('SELECT id, state, attempt_count, row_version FROM ecommerce_sales_handoffs WHERE ecommerce_order_id = ?', [created.id]))[0];
    expect(persisted).toMatchObject({ state: 'Pending', attempt_count: 0, row_version: 1 });
    expect((await ecommerceRepository.query('SELECT state, cart_id FROM ecommerce_orders WHERE id = ?', [created.id]))[0]).toEqual({ state: 'Quotation', cart_id: 'ecommerce-cart-open-001' });

    const sales = await DuckDbDatabase.open(salesPath);
    const salesRepository = new YamlRepository(sales);
    await migrateDatabase(salesRepository, join(orderRoot, 'migrations'), undefined, `sales_handoff_restart_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
    const ecommerceOperations = yaml(ecommerceRoot, 'operations.yaml').operations;
    const salesOrders = yaml(orderRoot, 'api/orders.yaml');
    const salesLines = yaml(orderRoot, 'api/order-detail.yaml');
    const salesOperation = yaml(orderRoot, 'operations.yaml').operations;
    let failAfterOrderImport = true;
    const ecommerceService = {
      async call(name: string, request: any = {}) {
        if (ecommerceOperations[name]) {
          const bound = bindNamedParams(ecommerceOperations[name].query, request);
          return { [ecommerceOperations[name].result_key]: await ecommerceRepository.query(bound.statement, bound.values) };
        }
        if (name === 'ecommerce.sales.handoff.claim') return ecommerceRepository.executeMutation(checkoutApiAction('claim_ecommerce_sales_handoff').mutation, request);
        if (name === 'ecommerce.sales.handoff.acknowledge') return ecommerceRepository.executeMutation(checkoutApiAction('acknowledge_ecommerce_sales_handoff').mutation, request);
        throw new Error(`Unexpected eCommerce operation ${name}`);
      },
    };
    const salesService = {
      async call(name: string, request: any = {}) {
        if (name === 'orders.ecommerce.handoff.order_by_source' || name === 'orders.ecommerce.handoff.line_by_source') {
          const bound = bindNamedParams(salesOperation[name].query, request);
          const key = name.endsWith('.order_by_source') ? 'order' : 'line';
          return { [key]: await salesRepository.query(bound.statement, bound.values) };
        }
        if (name === 'orders.ecommerce.handoff.import_order') {
          const imported = await salesRepository.executeMutation(salesOrders.actions.find((candidate: any) => candidate.id === 'import_ecommerce_sales_order').mutation, request);
          if (failAfterOrderImport) {
            failAfterOrderImport = false;
            throw new Error('temporary Sales line-import outage after order persistence');
          }
          return imported;
        }
        if (name === 'orders.ecommerce.handoff.import_line') return salesRepository.executeMutation(salesLines.actions.find((candidate: any) => candidate.id === 'import_ecommerce_sales_line').mutation, request);
        throw new Error(`Unexpected Sales operation ${name}`);
      },
    };
    const consumer = new EcommerceSalesHandoffConsumer(ecommerceService, salesService);
    expect(await consumer.pollOnce()).toEqual({ processed: 1, succeeded: 0, failed: 1 });
    expect((await ecommerceRepository.query('SELECT state, attempt_count, row_version, sales_order_id FROM ecommerce_sales_handoffs WHERE id = ?', [persisted.id]))[0]).toMatchObject({ state: 'Failed', attempt_count: 1, row_version: 3, sales_order_id: null });
    expect(await salesRepository.query('SELECT source_id FROM orders WHERE source_id = ?', [created.id])).toHaveLength(1);
    expect(await salesRepository.query('SELECT source_line_id FROM order_lines WHERE order_id = (SELECT id FROM orders WHERE source_id = ?)', [created.id])).toHaveLength(0);
    expect(await consumer.pollOnce()).toEqual({ processed: 1, succeeded: 1, failed: 0 });
    expect((await ecommerceRepository.query('SELECT state, attempt_count, row_version, sales_order_id FROM ecommerce_sales_handoffs WHERE id = ?', [persisted.id]))[0]).toMatchObject({ state: 'Succeeded', attempt_count: 2, row_version: 5 });
    expect(await consumer.pollOnce()).toEqual({ processed: 0, succeeded: 0, failed: 0 });
    expect(await salesRepository.query('SELECT source_service, source_id FROM orders WHERE source_id = ?', [created.id])).toHaveLength(1);
    expect(await salesRepository.query('SELECT source_line_id FROM order_lines WHERE order_id = (SELECT id FROM orders WHERE source_id = ?)', [created.id])).toHaveLength(2);
    ecommerce.close();
    sales.close();
    rmSync(ecommercePath, { force: true });
    rmSync(salesPath, { force: true });
  });
});

function checkoutApiAction(id: string) {
  return yaml(ecommerceRoot, 'api/checkout.yaml').actions.find((candidate: any) => candidate.id === id);
}

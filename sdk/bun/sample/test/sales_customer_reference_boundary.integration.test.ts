import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/order');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'sales_customer_reference_boundary', ['schema', 'data']);
  await repository.run(`INSERT INTO customers(id, code, name, owner_name, visibility, status, row_version, company_name)
    VALUES ('customer-company-a', 'CA', 'Company A Customer', 'Dispatcher User', 'Public', 'Active', 1, 'Company A'),
           ('customer-company-b', 'CB', 'Company B Customer', 'Dispatcher User', 'Public', 'Active', 1, 'Company B'),
           ('customer-private', 'CP', 'Private Customer', 'Other User', 'Private', 'Active', 1, 'Company A')`);
  return { database, repository };
}

const actor = {
  view_scope: 'branch',
  current_branch_id: 'branch-hcm',
  current_user_id: 'user-disp',
  current_user_name: 'Dispatcher User',
  company_name: 'Company A',
};

describe('Sales customer reference boundary', () => {
  test('keeps page/API joins and permissioned guards explicit', () => {
    const page = yaml('pages/sale-quotation-template-detail.yaml');
    const templateApi = yaml('api/sale-quotation-template-detail.yaml');
    const quotationApi = yaml('api/sale-quotations.yaml');
    const orderApi = yaml('api/orders.yaml');
    const detailApi = yaml('api/sale-order-detail.yaml');

    expect(page.page.id).toBe('sale-quotation-template-detail');
    expect(templateApi.page).toEqual({ id: 'sale-quotation-template-detail' });
    for (const definition of [quotationApi, orderApi, detailApi, templateApi]) {
      const mutationActions = definition.actions.filter((entry: any) => entry.mutation?.table === 'orders' && ['insert', 'update'].includes(entry.mutation.operation));
      expect(mutationActions.length).toBeGreaterThan(0);
      for (const entry of mutationActions) {
        expect(entry.permission).toBe('orders.write');
        expect(entry.mutation.guards.map((guard: any) => guard.code)).toEqual(expect.arrayContaining([
          'SALES_CUSTOMER_COMPANY_FORBIDDEN', 'SALES_CUSTOMER_FORBIDDEN', 'STALE_CUSTOMER_REFERENCE',
        ]));
      }
    }
    expect(String(orderApi.datasources.find((source: any) => source.id === 'order_customer_lookup').query)).toContain('company_name');
    expect(String(templateApi.datasources.find((source: any) => source.id === 'template_order_customer_lookup').query)).toContain('company_name');
  });

  test('resolves the active customer reference and rejects missing, company, permission, and stale inputs atomically', async () => {
    const { database, repository } = await repositoryForTest();
    const orderApi = yaml('api/orders.yaml');
    const create = action(orderApi, 'add_order');
    const values = { order_number: 'SO/BOUNDARY/001', customer_name: 'Company A Customer', order_date: '2026-09-20' };

    const created = await repository.executeMutation(create.mutation, {
      ...actor,
      customer_expected_row_version: 1,
      values,
    });
    expect(created).toMatchObject({ customer_name: 'Company A Customer', customer_id: 'customer-company-a', customer_row_version: 1 });

    const rejected = async (orderNumber: string, customerName: string, expected: number | null, expectedError: any) => {
      await expect(repository.executeMutation(create.mutation, {
        ...actor,
        customer_expected_row_version: expected,
        values: { ...values, order_number: orderNumber, customer_name: customerName },
      })).rejects.toMatchObject(expectedError);
      expect(await repository.query('SELECT COUNT(*) AS count FROM orders WHERE order_number = ?', [orderNumber])).toEqual([{ count: 0 }]);
    };

    await rejected('SO/BOUNDARY/MISSING', 'Missing Customer', null, { status: 404, code: 'SALES_CUSTOMER_NOT_FOUND' });
    await rejected('SO/BOUNDARY/COMPANY', 'Company B Customer', null, { status: 403, code: 'SALES_CUSTOMER_COMPANY_FORBIDDEN' });
    await rejected('SO/BOUNDARY/PRIVATE', 'Private Customer', null, { status: 403, code: 'SALES_CUSTOMER_FORBIDDEN' });

    await repository.run("UPDATE customers SET row_version = 2 WHERE id = 'customer-company-a'");
    await rejected('SO/BOUNDARY/STALE', 'Company A Customer', 1, { status: 409, code: 'STALE_CUSTOMER_REFERENCE' });

    expect(await repository.query("SELECT customer_id, customer_row_version FROM orders WHERE order_number = 'SO/BOUNDARY/001'")).toEqual([
      { customer_id: 'customer-company-a', customer_row_version: 1 },
    ]);
    await database.close();
  }, 30000);

  test('template quotation keeps customer guards ahead of line writes and rolls back the whole order', async () => {
    const { database, repository } = await repositoryForTest();
    const templateApi = yaml('api/sale-quotation-template-detail.yaml');
    const create = action(templateApi, 'create_sale_order_from_template');
    const line = action(templateApi, 'add_sale_quotation_template_line');
    const base = {
      template_id: 'sale-quotation-template-office-furnitures',
      template_expected_row_version: 1,
      ...actor,
      values: { order_number: 'SO/BOUNDARY/TEMPLATE', customer_name: 'Company A Customer', order_date: '2026-09-20' },
    };

    await repository.executeMutation(line.mutation, { values: { template_id: base.template_id, product_name: 'Unavailable Product', quantity: 1 } });
    await expect(repository.executeMutation(create.mutation, base)).rejects.toMatchObject({ status: 422, code: 'SALES_QUOTATION_TEMPLATE_LINE_INVALID' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM orders WHERE order_number = 'SO/BOUNDARY/TEMPLATE'")).toEqual([{ count: 0 }]);
    expect(await repository.query("SELECT COUNT(*) AS count FROM order_lines WHERE order_id LIKE 'sale-order-so-boundary-template%'")).toEqual([{ count: 0 }]);

    await database.close();
  }, 30000);
});

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { bindNamedParams } from '@core3/server/database/sql';
import { EcommerceSalesHandoffConsumer } from '../services/order/sales-handoff-consumer';

const orderRoot = join(import.meta.dir, '../services/order');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(orderRoot, file), 'utf8')) as any;

describe('Sales eCommerce handoff consumer', () => {
  test('claims, imports idempotently, and acknowledges the declared payload', async () => {
    const calls: Array<[string, any]> = [];
    const ecommerce = { call: async (operation: string, request: any = {}) => {
      calls.push([operation, request]);
      if (operation === 'ecommerce.sales.handoffs.pending') return { handoffs: [{ id: 'handoff-1', row_version: 1 }] };
      if (operation === 'ecommerce.sales.handoff.claim') return { row_version: 2 };
      if (operation === 'ecommerce.sales.handoff.order') return { order: [{ id: 'web-order-1', order_number: 'WEB/2026/0001', customer_name: 'Buyer', customer_email: 'buyer@example.com', amount_total: 36, date_order: '2026-09-13', shipping_address: '1 Main', delivery_method: 'Standard Delivery', payment_method: 'Wire Transfer' }] };
      if (operation === 'ecommerce.sales.handoff.lines') return { lines: [{ id: 'web-line-1', product_name: 'Mug', quantity: 2, unit_price: 18, line_total: 36 }] };
      return {};
    } };
    const sales = { call: async (operation: string, request: any = {}) => {
      calls.push([operation, request]);
      if (operation === 'orders.ecommerce.handoff.order_by_source') return { order: [] };
      if (operation === 'orders.ecommerce.handoff.line_by_source') return { line: [] };
      if (operation === 'orders.ecommerce.handoff.import_order') return { id: 'sales-order-1' };
      if (operation === 'orders.ecommerce.handoff.import_line') return { id: 'sales-line-1' };
      return {};
    } };
    const result = await new EcommerceSalesHandoffConsumer(ecommerce, sales).pollOnce();
    expect(result).toEqual({ processed: 1, succeeded: 1, failed: 0 });
    expect(calls.map(([operation]) => operation)).toEqual([
      'ecommerce.sales.handoffs.pending', 'ecommerce.sales.handoff.claim', 'ecommerce.sales.handoff.order', 'ecommerce.sales.handoff.lines',
      'orders.ecommerce.handoff.order_by_source', 'orders.ecommerce.handoff.import_order', 'orders.ecommerce.handoff.line_by_source', 'orders.ecommerce.handoff.import_line',
      'ecommerce.sales.handoff.acknowledge',
    ]);
    expect(calls.at(-1)?.[1]).toMatchObject({ values: { id: 'handoff-1', expected_row_version: 2, state: 'Succeeded', sales_order_id: 'sales-order-1' } });
  });

  test('does not retry a stale claim and records failure only after a successful claim', async () => {
    const acknowledged: any[] = [];
    const ecommerce = { call: async (operation: string) => {
      if (operation === 'ecommerce.sales.handoffs.pending') return { handoffs: [{ id: 'handoff-stale', row_version: 4 }] };
      if (operation === 'ecommerce.sales.handoff.claim') throw { status: 409, code: 'ECOMMERCE_SALES_HANDOFF_STALE' };
      if (operation === 'ecommerce.sales.handoff.acknowledge') acknowledged.push(operation);
      return {};
    } };
    const sales = { call: async () => { throw new Error('must not reach Sales after stale claim'); } };
    expect(await new EcommerceSalesHandoffConsumer(ecommerce, sales).pollOnce()).toEqual({ processed: 1, succeeded: 0, failed: 1 });
    expect(acknowledged).toHaveLength(0);
  });

  test('uses the Sales migration and declared YAML mutations for a real local import', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(orderRoot, 'migrations'), undefined, 'ecommerce_sales_consumer_order_test', ['schema', 'data']);
    const orderAction = yaml('api/orders.yaml').actions.find((action: any) => action.id === 'import_ecommerce_sales_order');
    const lineAction = yaml('api/order-detail.yaml').actions.find((action: any) => action.id === 'import_ecommerce_sales_line');
    const operation = (name: string) => yaml('operations.yaml').operations[name];
    const sales = { call: async (name: string, request: any = {}) => {
      if (name === 'orders.ecommerce.handoff.order_by_source') { const bound = bindNamedParams(operation(name).query, request); return { order: await repository.query(bound.statement, bound.values) }; }
      if (name === 'orders.ecommerce.handoff.line_by_source') { const bound = bindNamedParams(operation(name).query, request); return { line: await repository.query(bound.statement, bound.values) }; }
      if (name === 'orders.ecommerce.handoff.import_order') return repository.executeMutation(orderAction.mutation, request);
      if (name === 'orders.ecommerce.handoff.import_line') return repository.executeMutation(lineAction.mutation, request);
      throw new Error(`Unexpected Sales operation ${name}`);
    } };
    const ecommerce = { call: async (name: string, request: any = {}) => {
      if (name === 'ecommerce.sales.handoffs.pending') return { handoffs: [{ id: 'handoff-real-1', row_version: 1 }] };
      if (name === 'ecommerce.sales.handoff.claim') return { row_version: 2 };
      if (name === 'ecommerce.sales.handoff.order') return { order: [{ id: 'web-real-1', order_number: 'WEB/2026/0099', customer_name: 'Real Buyer', amount_total: 36, date_order: '2026-09-13', shipping_address: '1 Main' }] };
      if (name === 'ecommerce.sales.handoff.lines') return { lines: [{ id: 'web-real-line-1', product_name: 'Mug', quantity: 2, unit_price: 18, line_total: 36 }] };
      if (name === 'ecommerce.sales.handoff.acknowledge') return request;
      throw new Error(`Unexpected eCommerce operation ${name}`);
    } };
    expect(await new EcommerceSalesHandoffConsumer(ecommerce, sales).pollOnce()).toEqual({ processed: 1, succeeded: 1, failed: 0 });
    expect(await repository.query('SELECT order_number, source_service, source_id, total_amount FROM orders WHERE source_id = ?', ['web-real-1'])).toMatchObject([{ order_number: 'WEB/2026/0099', source_service: 'ecommerce', total_amount: 36 }]);
    expect(await repository.query('SELECT source_line_id, line_total FROM order_lines WHERE source_line_id = ?', ['web-real-line-1'])).toMatchObject([{ source_line_id: 'web-real-line-1', line_total: 36 }]);
    expect(await new EcommerceSalesHandoffConsumer(ecommerce, sales).pollOnce()).toEqual({ processed: 1, succeeded: 1, failed: 0 });
    expect(await repository.query('SELECT COUNT(*) AS count FROM orders WHERE source_id = ?', ['web-real-1'])).toMatchObject([{ count: 1 }]);
    database.close();
  });
});

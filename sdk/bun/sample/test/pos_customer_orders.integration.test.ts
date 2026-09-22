import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(file).actions.find((candidate: any) => candidate.id === id);

describe('POS customer PoS Orders stat action parity', () => {
  test('keeps the customer detail action and customer-orders page/API contracts separate', () => {
    const detailPage = yaml('pages/pos-customer-detail.yaml');
    const detailApi = yaml('api/pos-customer-detail.yaml');
    const listPage = yaml('pages/pos-customer-orders.yaml');
    const listApi = yaml('api/pos-customer-orders.yaml');
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailPage.components[0].stat_buttons).toContainEqual(expect.objectContaining({
      id: 'open_pos_customer_orders', label: 'PoS Orders', value_field: 'order_count', permission: 'pos.read',
    }));
    expect(action('api/pos-customer-detail.yaml', 'open_pos_customer_orders')).toMatchObject({
      permission: 'pos.read', navigate_to: '/point-of-sale/customer-orders', params: { customer_id: '{state.id}' },
    });
    expect(listPage.components[0]).toMatchObject({
      type: 'ListView', source: 'pos_customer_scoped_orders', row_open_action: 'view_pos_customer_order',
      row_double_click_action: 'view_pos_customer_order',
    });
    expect(action('api/pos-customer-orders.yaml', 'view_pos_customer_order')).toMatchObject({
      permission: 'pos.read', navigate_to: '/point-of-sale/order-detail', params: { id: '{row.id}' },
    });
  });

  test('projects only current-company orders for the selected customer and preserves search/status/empty boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_customer_orders_scope', ['schema', 'data']);
    const source = yaml('api/pos-customer-orders.yaml').datasources.find((candidate: any) => candidate.id === 'pos_customer_scoped_orders');
    const demo = { customer_id: 'pos-customer-wayne', current_company_name: 'Core3 Demo Company', q: null, state: null };
    expect((await repository.querySource(source, demo, 0, 50)).data).toMatchObject([
      expect.objectContaining({ partner_name: 'Wayne Industries', amount_total: 45.25 }),
    ]);
    expect((await repository.querySource(source, { ...demo, q: 'missing' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...demo, state: 'Cancelled' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...demo, current_company_name: 'Core3 Vietnam Branch' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...demo, customer_id: 'missing-customer' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('keeps the customer detail order count company-scoped', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_customer_orders_detail_scope', ['schema', 'data']);
    const detail = yaml('api/pos-customer-detail.yaml').datasources.find((candidate: any) => candidate.id === 'pos_customer_detail');
    expect(await repository.querySource(detail, { id: 'pos-customer-wayne', current_company_name: 'Core3 Demo Company' }, 0, 1)).toMatchObject({ data: { order_count: 1, total_sales: 45.25 } });
    expect(await repository.querySource(detail, { id: 'pos-customer-wayne', current_company_name: 'Core3 Vietnam Branch' }, 0, 1)).toMatchObject({ data: { order_count: 0, total_sales: 0 } });
    database.close();
  });
});

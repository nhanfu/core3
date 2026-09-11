import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Events linked Sales Orders parity action', () => {
  test('binds the event Sales stat action to a separate page/API pair', () => {
    const eventPage = yaml('pages/event-detail.yaml');
    const eventApi = yaml('api/event-detail.yaml');
    const page = yaml('pages/event-sales-orders.yaml');
    const api = yaml('api/event-sales-orders.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(eventPage.components[0].stat_buttons).toContainEqual(expect.objectContaining({
      id: 'event_sales_orders_detail', label: 'Sales', value_field: 'sale_price_total_display', permission: 'events.read',
    }));
    expect(eventApi.actions).toContainEqual(expect.objectContaining({
      id: 'event_sales_orders_detail', type: 'navigate', navigate_to: '/events/sales-orders',
    }));
    expect(page.page).toMatchObject({ id: 'event-sales-orders', route: '/events/sales-orders' });
    expect(page.components[0]).toMatchObject({ source: 'event_sales_orders', view_navigation: 'tabs' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'card']);
    expect(api.page.id).toBe('event-sales-orders');
    expect(api.datasources[0]).toMatchObject({ id: 'event_sales_orders', permission: 'events.read' });
    expect(discovered.pages.get('event-sales-orders')?.config.page.route).toBe('/events/sales-orders');
    expect(discovered.pageDatasources.get('event-sales-orders')).toEqual(['event_sales_orders']);
  });

  test('reads the fixed confirmed order for Design Fair and supports search', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_sales_orders_read_migrations', ['schema', 'data']);
    const source = yaml('api/event-sales-orders.yaml').datasources[0];

    const rows = await repository.querySource(source, { event_id: 'event-demo-001', fixture_state: null, q: null }, 0, 80);
    expect(rows.data).toEqual([expect.objectContaining({
      id: 'event-sale-order-design-fair-001', order_reference: 'S00025', customer_name: 'Wood Corner, Willie Burke',
      salesperson_name: 'Mitchell Admin', total: 2300, total_display: '$ 2,300.00', invoice_status_label: 'To Invoice',
    })]);
    expect((await repository.querySource(source, { event_id: 'event-demo-001', fixture_state: null, q: 'Wood Corner' }, 0, 80)).data).toHaveLength(1);
    expect((await repository.querySource(source, { event_id: 'event-demo-002', fixture_state: null, q: null }, 0, 80)).data).toEqual([]);
    database.close();
  });

  test('keeps read-only empty, missing, transport, and permission contracts explicit', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_sales_orders_error_migrations', ['schema', 'data']);
    const source = yaml('api/event-sales-orders.yaml').datasources[0];

    expect(source.permission).toBe('events.read');
    expect(await repository.querySource(source, { event_id: 'event-demo-001', fixture_state: 'empty', q: null }, 0, 80)).toMatchObject({ data: [] });
    await expect(repository.querySource(source, { event_id: 'event-demo-001', fixture_state: 'not_found', q: null }, 0, 80)).rejects.toMatchObject({ status: 404, code: 'EVENT_NOT_FOUND' });
    await expect(repository.querySource(source, { event_id: 'event-demo-001', fixture_state: 'transport_error', q: null }, 0, 80)).rejects.toMatchObject({ status: 503, code: 'EVENT_SALES_ORDERS_UNAVAILABLE' });
    expect(yaml('pages/event-sales-orders.yaml').actions).toBeUndefined();
    database.close();
  });
});

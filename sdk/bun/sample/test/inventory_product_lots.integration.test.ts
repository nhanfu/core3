import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(file).actions.find((candidate: any) => candidate.id === id);
const source = (id: string) => yaml('api/lots.yaml').datasources.find((candidate: any) => candidate.id === id);

describe('Inventory Product form Lot/Serial Numbers parity', () => {
  test('declares the Odoo stat action on both product detail forms', () => {
    const templatePage = yaml('pages/product-template-detail.yaml');
    const variantPage = yaml('pages/product-variant-detail.yaml');
    const templateApi = yaml('api/product-template-detail.yaml');
    const variantApi = yaml('api/product-variant-detail.yaml');

    expect(templatePage.components[0].stat_buttons).toContainEqual(expect.objectContaining({
      id: 'view_inventory_product_template_lots',
      label: 'Lot/Serial Numbers',
      permission: 'inventory.tracking',
      show_if: "record.tracking !== 'none'",
    }));
    expect(variantPage.components[0].header_actions).toContainEqual(expect.objectContaining({
      id: 'view_inventory_product_variant_lots',
      label: 'Lot/Serial Numbers',
      permission: 'inventory.tracking',
    }));
    expect(action('api/product-template-detail.yaml', 'view_inventory_product_template_lots')).toMatchObject({
      type: 'navigate', permission: 'inventory.tracking', navigate_to: '/lots',
      params: { product_template_id: '{state.inventory_product_template_detail.id}' },
    });
    expect(action('api/product-variant-detail.yaml', 'view_inventory_product_variant_lots')).toMatchObject({
      type: 'navigate', permission: 'inventory.tracking', navigate_to: '/lots',
      params: { product_id: '{state.inventory_product_variant_detail.id}' },
    });
    expect(templatePage.datasources).toBeUndefined();
    expect(variantPage.datasources).toBeUndefined();
    expect(templatePage.page).toMatchObject({ id: 'product-template-detail', route: '/products/detail' });
    expect(variantPage.page).toMatchObject({ id: 'product-variant-detail', route: '/product-variants/detail' });
    expect(templateApi.page.id).toBe('product-template-detail');
    expect(variantApi.page.id).toBe('product-variant-detail');
    expect(yaml('api/lots.yaml').page.id).toBe('lots');
    expect(yaml('pages/lots.yaml').page.route).toBe('/lots');
    expect(yaml('pages/lots.yaml').components[0].source).toBe('inventory_lots');
  });

  test('seeds idempotent product lots and applies template and variant context', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'inventory_product_lots_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'inventory_product_lots_test_migrations', ['schema', 'data']);

    expect(await repository.query('SELECT COUNT(*) AS count FROM inventory_lots WHERE id LIKE \'lot-inventory-cabinet-%\'', [])).toEqual([{ count: 2 }]);
    const lots = source('inventory_lots');
    const templateDetail = yaml('api/product-template-detail.yaml').datasources.find((candidate: any) => candidate.id === 'inventory_product_template_detail');
    const variantDetail = yaml('api/product-variant-detail.yaml').datasources.find((candidate: any) => candidate.id === 'inventory_product_variant_detail');
    expect((await repository.querySource(templateDetail, { id: 'inventory-template-large-cabinet', current_company_name: 'Core3 Demo Company' })).data).toMatchObject({ lot_count: 2 });
    expect((await repository.querySource(variantDetail, { id: 'inventory-variant-cabinet', current_company_name: 'Core3 Demo Company' })).data).toMatchObject({ lot_count: 2 });
    const templateRows = await repository.querySource(lots, {
      q: null, availability: null, fixture_state: null,
      product_template_id: 'inventory-template-large-cabinet', product_id: null,
      current_company_name: 'Core3 Demo Company',
    }, 0, 50);
    expect(templateRows.data.map((row: any) => row.name)).toEqual(['CAB-LOT-0002', 'CAB-LOT-0001']);
    expect(templateRows.data.every((row: any) => row.product_name === 'Large Cabinet')).toBe(true);

    const variantRows = await repository.querySource(lots, {
      q: null, availability: null, fixture_state: null,
      product_template_id: null, product_id: 'inventory-variant-cabinet',
      current_company_name: 'Core3 Demo Company',
    }, 0, 50);
    expect(variantRows.data).toHaveLength(2);
    expect(variantRows.data.map((row: any) => row.location_name)).toEqual(['Shelf 2', 'Stock']);

    const emptyRows = await repository.querySource(lots, {
      q: null, availability: null, fixture_state: null,
      product_template_id: 'inventory-template-corner-desk', product_id: null,
      current_company_name: 'Core3 Demo Company',
    }, 0, 50);
    expect(emptyRows.data).toEqual([]);
    await expect(repository.querySource(lots, {
      q: null, availability: null, fixture_state: 'transport_error',
      product_template_id: 'inventory-template-large-cabinet', product_id: null,
      current_company_name: 'Core3 Demo Company',
    }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_LOTS_UNAVAILABLE' });

    database.close();
  });

  test('keeps company scope and product context isolated after restart', async () => {
    const databasePath = `/tmp/core3-inventory-product-lots-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_product_lots_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const firstDatabase = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(firstDatabase);
    await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const lots = source('inventory_lots');
    expect((await firstRepository.querySource(lots, {
      q: null, availability: null, fixture_state: null,
      product_template_id: 'inventory-template-large-cabinet', product_id: null,
      current_company_name: 'Other Company',
    }, 0, 50)).data).toEqual([]);
    firstDatabase.close();

    const secondDatabase = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(secondDatabase);
    await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.querySource(lots, {
      q: 'CAB-LOT-0002', availability: 'on_hand', fixture_state: null,
      product_template_id: 'inventory-template-large-cabinet', product_id: null,
      current_company_name: 'Core3 Demo Company',
    })).data).toMatchObject([{ name: 'CAB-LOT-0002', product_qty: 80, tracking: 'lot' }]);
    expect(await secondRepository.query('SELECT COUNT(*) AS count FROM inventory_lots WHERE id LIKE \'lot-inventory-cabinet-%\'', [])).toEqual([{ count: 2 }]);
    secondDatabase.close();
  });
});

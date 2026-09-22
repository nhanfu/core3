import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPages, discoverPageRoutes } from '@core3/server/discovery';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, `inventory_product_on_hand_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory Product form On Hand action parity', () => {
  test('maps Odoo action_open_quants for templates and variants to the existing On Hand route', () => {
    const templatePage = yaml('pages/product-template-detail.yaml');
    const variantPage = yaml('pages/product-variant-detail.yaml');
    const templateApi = yaml('api/product-template-detail.yaml');
    const variantApi = yaml('api/product-variant-detail.yaml');
    const stockPage = yaml('pages/stock.yaml');
    const stockApi = yaml('api/stock.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(templatePage.datasources).toBeUndefined();
    expect(variantPage.datasources).toBeUndefined();
    expect(templateApi.page).toEqual({ id: 'product-template-detail' });
    expect(variantApi.page).toEqual({ id: 'product-variant-detail' });
    expect(stockPage.page).toMatchObject({ id: 'stock' });
    expect(stockApi.page).toEqual({ id: 'stock' });
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/stock', page: 'stock', module: 'inventory' });
    expect(templatePage.components[0].stat_buttons).toContainEqual(expect.objectContaining({
      id: 'view_inventory_product_template_on_hand', label: 'On Hand', value_field: 'on_hand', permission: 'inventory.read',
    }));
    expect(variantPage.components[0].header_actions).toContainEqual(expect.objectContaining({
      id: 'view_inventory_product_variant_on_hand', label: 'On Hand', value_field: 'on_hand', permission: 'inventory.read',
    }));
    expect(templateApi.actions).toContainEqual(expect.objectContaining({
      id: 'view_inventory_product_template_on_hand', type: 'navigate', navigate_to: '/stock',
      params: { product_template_id: '{state.inventory_product_template_detail.id}', current_company_name: '{state.inventory_product_template_detail.company_name}' },
    }));
    expect(variantApi.actions).toContainEqual(expect.objectContaining({
      id: 'view_inventory_product_variant_on_hand', type: 'navigate', navigate_to: '/stock',
      params: { product_id: '{state.inventory_product_variant_detail.id}', current_company_name: '{state.inventory_product_variant_detail.company_name}' },
    }));
    expect(stockApi.datasources.find((source: any) => source.id === 'inventory_stock').query).toContain('inventory_product_quant_links');
  });

  test('returns deterministic variant- and template-scoped quants with empty and company boundaries', async () => {
    const { database, repository } = await repositoryForTest();
    const source = yaml('api/stock.yaml').datasources.find((candidate: any) => candidate.id === 'inventory_stock');
    const base = { q: null, product_id: null, product_template_id: null };
    expect((await repository.querySource(source, { ...base, product_id: 'inventory-variant-storage-box' }, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'quant-box-main', product_name: '[E-COM08] Storage Box', quantity: 18 }),
    ]);
    expect((await repository.querySource(source, { ...base, product_template_id: 'inventory-template-large-cabinet' }, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'quant-cabinet-main', product_name: '[E-COM07] Large Cabinet', quantity: 33 }),
    ]);
    expect((await repository.querySource(source, { ...base, product_template_id: 'inventory-template-corner-desk' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...base, product_id: 'inventory-variant-storage-box', current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('replays the link migration without duplicate rows and preserves the read-only surface', async () => {
    const { database, repository } = await repositoryForTest();
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, `inventory_product_on_hand_replay_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
    expect(await repository.query('SELECT COUNT(*) AS count FROM inventory_product_quant_links')).toEqual([{ count: 2 }]);
    expect(yaml('api/stock.yaml').datasources.find((source: any) => source.id === 'inventory_stock').permission).toBe('inventory.read');
    expect(yaml('pages/stock.yaml').components[0].row_actions).toBe('menu');
    database.close();
  });
});

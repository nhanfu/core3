import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(file).actions.find((candidate: any) => candidate.id === id);

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, `inventory_product_reordering_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory Product form Reordering Rules action parity', () => {
  test('maps Odoo action_view_orderpoints on templates and variants to the existing list route', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/stock/models/product.py', 'utf8');
    const templatePage = yaml('pages/product-template-detail.yaml');
    const variantPage = yaml('pages/product-variant-detail.yaml');
    const templateApi = yaml('api/product-template-detail.yaml');
    const variantApi = yaml('api/product-variant-detail.yaml');
    const reorderingApi = yaml('api/reordering-rules.yaml');

    expect(source).toContain('def action_view_orderpoints(self):');
    expect(source).toContain('search_default_product_id');
    expect(templatePage.datasources).toBeUndefined();
    expect(variantPage.datasources).toBeUndefined();
    expect(templateApi.page).toEqual({ id: 'product-template-detail' });
    expect(variantApi.page).toEqual({ id: 'product-variant-detail' });
    expect(reorderingApi.page).toEqual({ id: 'reordering-rules' });
    expect(yaml('pages/reordering-rules.yaml').page.route).toBe('/reordering-rules');
    expect(templatePage.components[0].stat_buttons).toContainEqual(expect.objectContaining({
      id: 'view_inventory_product_template_reordering_rules', label: 'Reordering Rules', value_field: 'reordering_rule_count', permission: 'inventory.read',
    }));
    expect(variantPage.components[0].header_actions).toContainEqual(expect.objectContaining({
      id: 'view_inventory_product_variant_reordering_rules', label: 'Reordering Rules', value_field: 'reordering_rule_count', permission: 'inventory.read',
    }));
    expect(action('api/product-template-detail.yaml', 'view_inventory_product_template_reordering_rules')).toMatchObject({
      type: 'navigate', permission: 'inventory.read', navigate_to: '/reordering-rules',
      params: { product_template_id: '{state.inventory_product_template_detail.id}', current_company_name: '{state.inventory_product_template_detail.company_name}' },
    });
    expect(action('api/product-variant-detail.yaml', 'view_inventory_product_variant_reordering_rules')).toMatchObject({
      type: 'navigate', permission: 'inventory.read', navigate_to: '/reordering-rules',
      params: { product_id: '{state.inventory_product_variant_detail.id}', current_company_name: '{state.inventory_product_variant_detail.company_name}' },
    });
    expect(reorderingApi.datasources.find((source: any) => source.id === 'inventory_reordering_rules').query).toContain('inventory_product_orderpoint_links');
  });

  test('returns deterministic product and template scoped orderpoints with company and empty boundaries', async () => {
    const { database, repository } = await repositoryForTest();
    const listSource = yaml('api/reordering-rules.yaml').datasources.find((source: any) => source.id === 'inventory_reordering_rules');
    const templateSource = yaml('api/product-template-detail.yaml').datasources.find((source: any) => source.id === 'inventory_product_template_detail');
    const variantSource = yaml('api/product-variant-detail.yaml').datasources.find((source: any) => source.id === 'inventory_product_variant_detail');
    const base = { q: null, active: 'all', trigger: null, current_company_name: 'Core3 Demo Company', fixture_state: null };

    expect((await repository.querySource(listSource, { ...base, product_id: 'inventory-variant-storage-box' }, 0, 50)).data.map((row: any) => row.id))
      .toEqual(['orderpoint-quant-replenish-0001', 'orderpoint-storage-box-auto']);
    expect((await repository.querySource(listSource, { ...base, product_template_id: 'inventory-template-corner-desk', current_company_name: 'My Company (San Francisco)' }, 0, 50)).data.map((row: any) => row.id))
      .toEqual(['orderpoint-desk-right']);
    expect((await repository.querySource(listSource, { ...base, product_id: 'inventory-variant-storage-box', current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(listSource, { ...base, product_template_id: 'inventory-template-legacy' }, 0, 50)).data).toEqual([]);

    expect(await repository.querySource(templateSource, { id: 'inventory-template-storage-box', current_company_name: 'Core3 Demo Company' }, 0, 1))
      .toMatchObject({ data: expect.objectContaining({ reordering_rule_count: 2 }) });
    expect(await repository.querySource(variantSource, { id: 'inventory-variant-corner-desk', current_company_name: 'Core3 Demo Company' }, 0, 1))
      .toMatchObject({ data: expect.objectContaining({ reordering_rule_count: 1 }) });
    database.close();
  });

  test('replays the product links without duplicates and keeps the surface read-only', async () => {
    const { database, repository } = await repositoryForTest();
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, `inventory_product_reordering_replay_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
    expect(await repository.query('SELECT COUNT(*) AS count FROM inventory_product_orderpoint_links')).toEqual([{ count: 3 }]);
    expect(yaml('api/reordering-rules.yaml').datasources.find((source: any) => source.id === 'inventory_reordering_rules').permission).toBe('inventory.read');
    expect(action('api/product-template-detail.yaml', 'view_inventory_product_template_reordering_rules').type).toBe('navigate');
    database.close();
  });
});

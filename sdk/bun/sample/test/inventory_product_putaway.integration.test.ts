import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/inventory');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

async function repositoryForTest(databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, `inventory_product_putaway_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
  return { database, repository };
}

const listSource = () => yaml('api/putaway-rules.yaml').datasources.find((source: any) => source.id === 'inventory_putaway_rules');

describe('Inventory product form Putaway Rules action parity', () => {
  test('maps Odoo product actions to the existing Putaway Rules page/API pair', () => {
    const templatePage = yaml('pages/product-template-detail.yaml');
    const variantPage = yaml('pages/product-variant-detail.yaml');
    const templateApi = yaml('api/product-template-detail.yaml');
    const variantApi = yaml('api/product-variant-detail.yaml');
    const putawayPage = yaml('pages/putaway-rules.yaml');
    const putawayApi = yaml('api/putaway-rules.yaml');

    expect(templatePage.datasources).toBeUndefined();
    expect(variantPage.datasources).toBeUndefined();
    expect(templatePage.components[0].stat_buttons).toContainEqual(expect.objectContaining({
      id: 'view_inventory_product_template_putaway_rules', label: 'Putaway Rules', value_field: 'putaway_rule_count', permission: 'inventory.multi_location',
    }));
    expect(variantPage.components[0].header_actions).toContainEqual(expect.objectContaining({
      id: 'view_inventory_product_variant_putaway_rules', label: 'Putaway Rules', permission: 'inventory.multi_location',
    }));
    expect(templateApi.actions).toContainEqual(expect.objectContaining({
      id: 'view_inventory_product_template_putaway_rules', type: 'navigate', permission: 'inventory.multi_location', navigate_to: '/putaway-rules',
      params: { product_template_id: '{state.inventory_product_template_detail.id}', current_company_name: '{state.inventory_product_template_detail.company_name}' },
    }));
    expect(variantApi.actions).toContainEqual(expect.objectContaining({
      id: 'view_inventory_product_variant_putaway_rules', type: 'navigate', permission: 'inventory.multi_location', navigate_to: '/putaway-rules',
      params: { product_id: '{state.inventory_product_variant_detail.id}', current_company_name: '{state.inventory_product_variant_detail.company_name}' },
    }));
    expect(putawayPage.page).toMatchObject({ id: 'putaway-rules', route: '/putaway-rules' });
    expect(putawayApi.page).toEqual({ id: 'putaway-rules' });
    expect(putawayApi.datasources.find((source: any) => source.id === 'inventory_putaway_rules').query).toContain(':product_template_id');
    expect(putawayApi.datasources.find((source: any) => source.id === 'inventory_putaway_rules').query).toContain(':product_id');
  });

  test('returns product and category putaway rules with Odoo empty and company guards', async () => {
    const { database, repository } = await repositoryForTest();
    const source = listSource();
    const base = { q: null, active: 'active', fixture_state: null, current_company_name: 'Core3 Demo Company' };

    expect((await repository.querySource(source, { ...base, product_template_id: 'inventory-template-storage-box', product_id: null }, 0, 50)).data.map((row: any) => row.id))
      .toEqual(['putaway-product-storage-box', 'putaway-office-supplies']);
    const detail = yaml('api/product-template-detail.yaml').datasources.find((candidate: any) => candidate.id === 'inventory_product_template_detail');
    expect((await repository.querySource(detail, { id: 'inventory-template-storage-box', current_company_name: 'Core3 Demo Company' }, 0, 1)).data).toMatchObject({ putaway_rule_count: 2 });
    expect((await repository.querySource(source, { ...base, product_template_id: null, product_id: 'inventory-variant-storage-box' }, 0, 50)).data.map((row: any) => row.id))
      .toEqual(['putaway-product-storage-box', 'putaway-office-supplies']);
    expect((await repository.querySource(source, { ...base, product_template_id: 'inventory-template-corner-desk', product_id: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...base, product_template_id: 'inventory-template-storage-box', product_id: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...base, product_template_id: 'inventory-template-storage-box', product_id: null, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('replays the stable fixture and preserves the product context after restart', async () => {
    const databasePath = `/tmp/core3-inventory-product-putaway-${crypto.randomUUID()}.duckdb`;
    try {
      const first = await repositoryForTest(databasePath);
      expect(await first.repository.query('SELECT COUNT(*) AS count FROM inventory_putaway_rules WHERE id = ?', ['putaway-product-storage-box'])).toEqual([{ count: 1 }]);
      first.database.close();

      const second = await repositoryForTest(databasePath);
      expect(await second.repository.query('SELECT id, product_id, company_name FROM inventory_putaway_rules WHERE id = ?', ['putaway-product-storage-box']))
        .toEqual([{ id: 'putaway-product-storage-box', product_id: 'inventory-variant-storage-box', company_name: 'Core3 Demo Company' }]);
      const rows = await second.repository.querySource(listSource(), {
        q: 'Storage Box', active: 'active', fixture_state: null,
        product_template_id: 'inventory-template-storage-box', product_id: null,
        current_company_name: 'Core3 Demo Company',
      }, 0, 50);
      expect(rows.data).toEqual([expect.objectContaining({ id: 'putaway-product-storage-box', product_name: 'Storage Box' })]);
      second.database.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});

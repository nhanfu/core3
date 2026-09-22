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
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, `inventory_product_category_putaway_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory product category Putaway Rules action parity', () => {
  test('maps Odoo category_open_putaway to the existing Putaway Rules page/API pair', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/product_views.xml', 'utf8');
    const strategySource = readFileSync('/home/nhanjs/projects/odoo/addons/stock/views/product_strategy_views.xml', 'utf8');
    const page = yaml('pages/product-category-detail.yaml');
    const api = yaml('api/product-category-detail.yaml');
    const putawayApi = yaml('api/putaway-rules.yaml');

    expect(source).toContain('name="%(category_open_putaway)d"');
    expect(strategySource).toContain('id="category_open_putaway"');
    expect(strategySource).toContain("'search_default_category_id': [active_id]");
    expect(page.components[0].stat_buttons).toContainEqual(expect.objectContaining({
      id: 'view_inventory_product_category_putaway_rules', label: 'Putaway Rules', value_field: 'putaway_rule_count', permission: 'inventory.multi_location',
    }));
    expect(api.page).toEqual({ id: 'product-category-detail' });
    expect(api.actions).toContainEqual(expect.objectContaining({
      id: 'view_inventory_product_category_putaway_rules', type: 'navigate', permission: 'inventory.multi_location', navigate_to: '/putaway-rules',
      params: {
        category_id: '{state.inventory_product_category_detail.id}',
        category_name: '{state.inventory_product_category_detail.name}',
        current_company_name: '{state.inventory_product_category_detail.company_name}',
      },
    }));
    expect(putawayApi.page).toEqual({ id: 'putaway-rules' });
    expect(putawayApi.datasources.find((candidate: any) => candidate.id === 'inventory_putaway_rules').query).toContain(':category_id');
  });

  test('filters category rules, exposes the stat count, and preserves Odoo empty/company boundaries', async () => {
    const { database, repository } = await repositoryForTest();
    const detail = yaml('api/product-category-detail.yaml').datasources.find((candidate: any) => candidate.id === 'inventory_product_category_detail');
    const putaway = yaml('api/putaway-rules.yaml').datasources.find((candidate: any) => candidate.id === 'inventory_putaway_rules');
    const base = { q: null, active: 'active', fixture_state: null, product_id: null, product_template_id: null, current_company_name: 'Core3 Demo Company' };

    expect(await repository.querySource(detail, { id: 'inventory-category-office', current_company_name: 'Core3 Demo Company' }, 0, 1))
      .toMatchObject({ data: expect.objectContaining({ name: 'Office Supplies', putaway_rule_count: 1 }) });
    expect((await repository.querySource(putaway, { ...base, category_id: 'inventory-category-office' }, 0, 50)).data.map((row: any) => row.id))
      .toEqual(['putaway-office-supplies']);
    expect((await repository.querySource(putaway, { ...base, category_id: 'inventory-category-furniture' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(putaway, { ...base, category_id: 'inventory-category-office', current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(putaway, { ...base, category_id: 'inventory-category-office', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('replays the existing putaway data without duplicates and preserves the category context after restart', async () => {
    const databasePath = `/tmp/core3-inventory-category-putaway-${crypto.randomUUID()}.duckdb`;
    try {
      const first = await repositoryForTest(databasePath);
      expect(await first.repository.query('SELECT COUNT(*) AS count FROM inventory_putaway_rules WHERE id = ?', ['putaway-office-supplies'])).toEqual([{ count: 1 }]);
      first.database.close();

      const second = await repositoryForTest(databasePath);
      expect((await second.repository.querySource(yaml('api/putaway-rules.yaml').datasources.find((candidate: any) => candidate.id === 'inventory_putaway_rules'), {
        q: null, active: 'active', fixture_state: null, category_id: 'inventory-category-office', product_id: null, product_template_id: null, current_company_name: 'Core3 Demo Company',
      }, 0, 50)).data).toEqual([expect.objectContaining({ id: 'putaway-office-supplies', category_name: 'Office Supplies' })]);
      second.database.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});

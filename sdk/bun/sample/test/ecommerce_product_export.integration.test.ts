import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('eCommerce Product export parity', () => {
  test('traces the Odoo website Products action through separate page/API export contracts', () => {
    const page = yaml('pages/products.yaml');
    const api = yaml('api/products.yaml');
    const exportAction = api.actions.find((action: any) => action.id === 'export_ecommerce_products');
    expect(page.page).toMatchObject({ id: 'ecommerce-products', route: '/ecommerce/products' });
    expect(api.page).toEqual({ id: 'ecommerce-products' });
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'export_ecommerce_products', label: 'Export', permission: 'ecommerce.read' }));
    expect(exportAction).toMatchObject({ id: 'export_ecommerce_products', type: 'client', permission: 'ecommerce.read' });
    expect(exportAction.script).toContain("state.ecommerce_products");
    expect(exportAction.script).toContain("ecommerce-products.csv");
    expect(exportAction.script).toContain("text/csv;charset=utf-8");
    expect(exportAction.script).toContain("internal_reference");
    expect(api.datasources.find((source: any) => source.id === 'ecommerce_products')).toMatchObject({ permission: 'ecommerce.read' });
  });

  test('exports only durable current-company catalog rows and remains idempotent across replay and restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-product-export-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_product_export_${crypto.randomUUID().replaceAll('-', '_')}`;
    const source = yaml('api/products.yaml').datasources.find((candidate: any) => candidate.id === 'ecommerce_products');
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const params = { q: null, published: null, fixture_state: null, company_name: 'My Company' };
      const firstExport = (await firstRepository.querySource(source, params, 0, 50)).data;
      expect(firstExport.map((row: any) => row.name)).toEqual(['Core3 Ceramic Mug', 'Ergonomic Office Chair', 'Workspace Setup Service', 'Desk Lamp']);
      expect(firstExport.every((row: any) => row.company_name === 'My Company')).toBe(true);
      expect((await firstRepository.querySource(source, { ...params, company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
      expect(firstExport.map((row: any) => [row.id, row.row_version, row.name, row.sales_price])).toEqual([
        ['ecommerce-product-mug', 1, 'Core3 Ceramic Mug', 18],
        ['ecommerce-product-chair', 1, 'Ergonomic Office Chair', 249],
        ['ecommerce-product-setup', 1, 'Workspace Setup Service', 120],
        ['ecommerce-product-lamp', 1, 'Desk Lamp', 46.5],
      ]);
      await firstRepository.query("UPDATE ecommerce_products SET name = 'Renamed Mug', row_version = row_version + 1 WHERE id = 'ecommerce-product-mug'");
      const concurrentRead = (await firstRepository.querySource(source, params, 0, 50)).data;
      expect(concurrentRead.find((row: any) => row.id === 'ecommerce-product-mug')).toMatchObject({ name: 'Renamed Mug', row_version: 2 });
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const replay = (await secondRepository.querySource(source, params, 0, 50)).data;
      expect(replay.find((row: any) => row.id === 'ecommerce-product-mug')).toMatchObject({ name: 'Renamed Mug', row_version: 2 });
      expect(replay).toHaveLength(4);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});

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
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, `inventory_product_moves_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
  return { database, repository };
}

describe('Inventory Product form Stock Moves action parity', () => {
  test('maps Odoo action_view_stock_move_lines to the existing Moves History route', () => {
    const detailPage = yaml('pages/product-template-detail.yaml');
    const detailApi = yaml('api/product-template-detail.yaml');
    const movesPage = yaml('pages/moves.yaml');
    const movesApi = yaml('api/moves.yaml');
    const movesAction = detailApi.actions.find((candidate: any) => candidate.id === 'view_inventory_product_template_moves');

    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(detailApi.page).toEqual({ id: 'product-template-detail' });
    expect(movesApi.page).toEqual({ id: 'moves' });
    expect(detailPage.page).toMatchObject({ id: 'product-template-detail', route: '/products/detail' });
    expect(movesPage.page).toMatchObject({ id: 'moves', route: '/moves' });
    expect(detailPage.components[0].stat_buttons).toContainEqual(expect.objectContaining({
      id: 'view_inventory_product_template_moves', label: 'Stock Moves', permission: 'inventory.read',
    }));
    expect(detailApi.datasources.find((source: any) => source.id === 'inventory_product_template_detail').query).toContain('move_count');
    expect(movesAction).toMatchObject({
      type: 'navigate', permission: 'inventory.read', navigate_to: '/moves',
      params: { product_template_id: '{state.inventory_product_template_detail.id}' },
    });
    expect(movesPage.components[0]).toMatchObject({ source: 'inventory_move_lines', default_filters: { state: 'done' } });
  });

  test('returns deterministic product-scoped move history without changing the global report', async () => {
    const { database, repository } = await repositoryForTest();
    const detail = yaml('api/product-template-detail.yaml').datasources.find((source: any) => source.id === 'inventory_product_template_detail');
    const moves = yaml('api/moves.yaml').datasources.find((source: any) => source.id === 'inventory_move_lines');
    expect(await repository.querySource(detail, { id: 'inventory-template-storage-box', current_company_name: 'Core3 Demo Company' }, 0, 1)).toMatchObject({
      data: expect.objectContaining({ name: 'Storage Box', move_count: 2 }),
    });
    const scoped = await repository.querySource(moves, {
      q: null, state: 'done', movement_type: null, from_date: null, to_date: null,
      product_template_id: 'inventory-template-storage-box', current_company_name: 'Core3 Demo Company', fixture_state: null,
    }, 0, 50);
    expect(scoped.data.map((row: any) => row.id)).toEqual(['move-line-0005', 'move-line-0007']);
    expect((await repository.querySource(moves, {
      q: null, state: 'done', movement_type: null, from_date: null, to_date: null,
      product_template_id: 'inventory-template-corner-desk', current_company_name: 'Core3 Demo Company', fixture_state: null,
    }, 0, 50)).data).toEqual([expect.objectContaining({ id: 'move-line-0004', product_name: 'Desk Combination' })]);
    expect((await repository.querySource(moves, {
      q: null, state: 'done', movement_type: null, from_date: null, to_date: null,
      product_template_id: 'inventory-template-storage-box', current_company_name: 'Other Company', fixture_state: null,
    })).data).toEqual([]);
    expect((await repository.querySource(moves, {
      q: null, state: 'done', movement_type: null, from_date: null, to_date: null,
      product_template_id: 'inventory-template-storage-box', current_company_name: 'Core3 Demo Company', fixture_state: 'empty',
    })).data).toEqual([]);
    const unscoped = await repository.querySource(moves, {
      q: null, state: 'done', movement_type: null, from_date: null, to_date: null,
      product_template_id: null, current_company_name: 'Core3 Demo Company', fixture_state: null,
    }, 0, 50);
    expect(unscoped.data.length).toBeGreaterThan(scoped.data.length);
    expect(unscoped.data).toEqual(expect.arrayContaining(scoped.data));
    database.close();
  });

  test('keeps the read-only action permissioned and persists the relation across restart', async () => {
    const databasePath = `/tmp/core3-inventory-product-moves-${crypto.randomUUID()}.duckdb`;
    try {
      const first = await repositoryForTest(databasePath);
      const api = yaml('api/product-template-detail.yaml');
      const action = api.actions.find((candidate: any) => candidate.id === 'view_inventory_product_template_moves');
      expect(action.permission).toBe('inventory.read');
      expect(action.type).toBe('navigate');
      expect(await first.repository.query('SELECT template_id, move_line_id FROM inventory_product_template_move_links WHERE template_id = ? ORDER BY move_line_id', ['inventory-template-storage-box'])).toEqual([
        { template_id: 'inventory-template-storage-box', move_line_id: 'move-line-0005' },
        { template_id: 'inventory-template-storage-box', move_line_id: 'move-line-0007' },
      ]);
      first.database.close();
      const second = await repositoryForTest(databasePath);
      expect(await second.repository.query('SELECT COUNT(*) AS count FROM inventory_product_template_move_links')).toEqual([{ count: 3 }]);
      second.database.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});

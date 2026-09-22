import { describe, expect, test } from 'bun:test';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const serviceRoot = join(import.meta.dir, '../services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

function discoverManufacturingPages() {
  const isolatedRoot = mkdtempSync(join(tmpdir(), 'core3-manufacturing-discovery-'));
  mkdirSync(join(isolatedRoot, 'services'), { recursive: true });
  cpSync(serviceRoot, join(isolatedRoot, 'services/manufacturing'), { recursive: true });
  try {
    return discoverPages(isolatedRoot);
  } finally {
    rmSync(isolatedRoot, { recursive: true, force: true });
  }
}

async function repositoryForTest(databasePath = ':memory:', migrationName = `manufacturing_unbuild_moves_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  const migrations = join(serviceRoot, 'migrations');
  await migrateDatabase(repository, migrations, undefined, migrationName, ['schema', 'data']);
  await migrateDatabase(repository, migrations, undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

describe('Manufacturing Unbuild Product Moves parity slice', () => {
  test('maps action_mrp_unbuild_moves to a page/API pair and Done-only stat button', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/mrp/views/mrp_unbuild_views.xml', 'utf8');
    expect(source).toContain('<record id="action_mrp_unbuild_moves" model="ir.actions.act_window">');
    expect(source).toContain('<field name="res_model">stock.move.line</field>');
    expect(source).toContain('<field name="view_mode">list,form</field>');
    expect(source).toContain("('move_id.unbuild_id', '=', active_id)");
    expect(source).toContain("('move_id.consume_unbuild_id', '=', active_id)");

    const page = yaml('pages/unbuild-product-moves.yaml');
    const detailPage = yaml('pages/unbuild-product-move-detail.yaml');
    const api = yaml('api/unbuild-product-moves.yaml');
    const detailApi = yaml('api/unbuild-product-move-detail.yaml');
    const unbuildDetail = yaml('pages/unbuild-order-detail.yaml');
    const unbuildDetailApi = yaml('api/unbuild-order-detail.yaml');
    const discovered = discoverManufacturingPages();

    expect(page.page).toMatchObject({ id: 'manufacturing-unbuild-product-moves', route: '/unbuild-orders/detail/product-moves' });
    expect(detailPage.page).toMatchObject({ id: 'manufacturing-unbuild-product-move-detail', route: '/unbuild-orders/detail/product-moves/detail' });
    expect(page.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'manufacturing-unbuild-product-moves' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(['mrp_unbuild_moves']);
    expect(api.datasources[0].meta.source_action).toMatchObject({
      external_id: 'action_mrp_unbuild_moves', model: 'stock.move.line', view_modes: ['list', 'form'],
    });
    expect(api.datasources[0].query).toContain('u.id = :id');
    expect(api.datasources[0].query).toContain('u.company_name = m.company_name');
    expect(api.datasources[0].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, missing_record: { status: 404 }, transport_error: { status: 503 } });
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(detailApi.page).toEqual({ id: 'manufacturing-unbuild-product-move-detail' });
    expect(detailApi.datasources).toEqual([expect.objectContaining({ id: 'mrp_unbuild_move_detail', permission: 'manufacturing.read' })]);
    expect(() => validatePageDefinition(detailApi, { allowExternalSources: true })).not.toThrow();
    expect(unbuildDetail.components[0].stat_buttons).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'open_mrp_unbuild_moves', label: 'Product Moves', value_field: 'move_count' }),
    ]));
    expect(unbuildDetailApi.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'open_mrp_unbuild_moves', navigate_to: '/unbuild-orders/detail/product-moves' }),
    ]));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/unbuild-orders/detail/product-moves', page: 'manufacturing-unbuild-product-moves', module: 'manufacturing' }),
      expect.objectContaining({ path: '/unbuild-orders/detail/product-moves/detail', page: 'manufacturing-unbuild-product-move-detail', module: 'manufacturing' }),
    ]));
  });

  test('serves durable company-scoped moves with deterministic search, empty, and transport states', async () => {
    const { database, repository } = await repositoryForTest();
    const api = yaml('api/unbuild-product-moves.yaml');
    const list = api.datasources[0];
    const detail = yaml('api/unbuild-product-move-detail.yaml').datasources[0];
    const params = { id: 'unbuild-desk-done', q: null, fixture_state: null };

    expect((await repository.querySource(list, params, 0, 50)).data.map((row: any) => row.id)).toEqual([
      'ubmove-desk-001', 'ubmove-desk-002', 'ubmove-desk-003', 'ubmove-desk-004', 'ubmove-desk-005', 'ubmove-desk-006',
    ]);
    expect((await repository.querySource(list, { ...params, q: 'LOT-DESK' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['ubmove-desk-001', 'ubmove-desk-004']);
    expect((await repository.querySource(list, { ...params, id: 'unbuild-table-draft' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(list, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(list, { ...params, fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(list, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_UNBUILD_MOVES_UNAVAILABLE' });
    expect(await repository.querySource(detail, { id: 'ubmove-desk-001', unbuild_id: 'unbuild-desk-done', fixture_state: null }, 0, 1)).toMatchObject({ data: { unbuild_name: 'UB/2026/0004', lot_name: 'LOT-DESK-001' } });
    expect((await repository.querySource(detail, { id: 'ubmove-desk-001', unbuild_id: 'unbuild-drawer-done', fixture_state: null }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'ubmove-desk-001', unbuild_id: 'unbuild-desk-done', fixture_state: 'transport_error' })).rejects.toMatchObject({ status: 503, code: 'MRP_UNBUILD_MOVE_UNAVAILABLE' });
    database.close();
  });

  test('replays the migration and preserves move rows across a file-backed restart', async () => {
    const databasePath = `/tmp/core3-manufacturing-unbuild-moves-${crypto.randomUUID()}.duckdb`;
    try {
      const first = await repositoryForTest(databasePath, `manufacturing_unbuild_moves_restart_a_${crypto.randomUUID().replaceAll('-', '_')}`);
      expect(await first.repository.query("SELECT COUNT(*) AS count FROM mrp_unbuild_moves WHERE unbuild_id = 'unbuild-desk-done' AND company_name = 'My Company (San Francisco)'"))
        .toEqual([{ count: 6 }]);
      expect(await first.repository.query("SELECT COUNT(*) AS count FROM duckdb_indexes() WHERE index_name = 'idx_mrp_unbuild_moves_scope'"))
        .toEqual([{ count: 1 }]);
      first.database.close();

      const second = await repositoryForTest(databasePath, `manufacturing_unbuild_moves_restart_b_${crypto.randomUUID().replaceAll('-', '_')}`);
      expect(await second.repository.query("SELECT COUNT(*) AS count FROM mrp_unbuild_moves"))
        .toEqual([{ count: 14 }]);
      expect(await second.repository.query("SELECT id FROM mrp_unbuild_moves WHERE id = 'ubmove-secondary-004'"))
        .toEqual([{ id: 'ubmove-secondary-004' }]);
      second.database.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});

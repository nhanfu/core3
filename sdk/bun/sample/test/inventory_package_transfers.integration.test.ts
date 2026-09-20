import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/inventory');
const parsed = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Inventory package transfers parity', () => {
  test('maps the Odoo Package Transfers stat to a separate page/API contract', () => {
    const packagePage = parsed('pages/package-detail.yaml');
    const packageApi = parsed('api/package-detail.yaml');
    const transferPage = parsed('pages/package-transfers.yaml');
    const transferApi = parsed('api/package-transfers.yaml');
    const form = packagePage.components.find((component: any) => component.type === 'OdooFormView');
    expect(packagePage.datasources).toBeUndefined();
    expect(packageApi.page.id).toBe('package-detail');
    expect(form.stat_buttons).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'view_inventory_package_transfers', label: 'Package Transfers', value_field: 'transfer_count', permission: 'inventory.tracking' }),
    ]));
    expect(packageApi.datasources[0].query).toContain('transfer_count');
    expect(packageApi.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'view_inventory_package_transfers', type: 'navigate', navigate_to: '/packages/transfers' }),
    ]));
    expect(transferPage.page).toMatchObject({ id: 'package-transfers', route: '/packages/transfers' });
    expect(transferPage.datasources).toBeUndefined();
    expect(transferApi.page.id).toBe('package-transfers');
    expect(transferApi.datasources.find((source: any) => source.id === 'inventory_package_transfers')).toMatchObject({ permission: 'inventory.tracking', single: false });
    expect(transferApi.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'view_inventory_package_transfer', navigate_to: '/inventory/transfer/detail' }),
    ]));
  });

  test('seeds source/result package transfer relations idempotently with deterministic filters', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `inventory_package_transfers_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const context = parsed('api/package-transfers.yaml').datasources[0];
    const source = parsed('api/package-transfers.yaml').datasources[1];
    expect((await repository.querySource(context, { package_id: 'package-main-0001', fixture_state: null }, 0, 1)).data).toMatchObject({
      id: 'package-main-0001', name: 'PACK0000001', transfer_count: 2,
    });
    expect((await repository.querySource(source, { package_id: 'package-main-0001', q: null, state: null, fixture_state: null }, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'delivery-00001', name: 'WH/OUT/00001', package_relation: 'source' }),
      expect.objectContaining({ id: 'receipt-00001', name: 'WH/IN/00001', package_relation: 'result' }),
    ]);
    expect((await repository.querySource(source, { package_id: 'package-main-0001', q: 'WH/OUT', state: null, fixture_state: null }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(source, { package_id: 'package-main-0001', q: null, state: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { package_id: 'package-main-0001', q: null, state: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'INVENTORY_PACKAGE_TRANSFERS_UNAVAILABLE' });
    expect((await repository.query('SELECT COUNT(*) AS count FROM inventory_package_move_lines', []) )[0].count).toBe(4);
    database.close();
  });

  test('enforces tracking permission, package scope, and restart persistence', async () => {
    const databasePath = `/tmp/core3-inventory-package-transfers-${crypto.randomUUID()}.duckdb`;
    const migrationName = `inventory_package_transfers_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      await firstRepository.query('INSERT INTO inventory_package_move_lines(id, package_id, move_id, relation_type) VALUES (?, ?, ?, ?)', ['package-move-restart', 'package-empty-0004', 'receipt-00003-move-001', 'result']);
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const source = parsed('api/package-transfers.yaml').datasources[1];
      expect((await secondRepository.querySource(source, { package_id: 'package-empty-0004', q: null, state: null, fixture_state: null }, 0, 50)).data).toEqual([
        expect.objectContaining({ id: 'receipt-00003', package_relation: 'result' }),
      ]);

      const transferApi = parsed('api/package-transfers.yaml');
      const pageSources = new Map([['package-transfers', transferApi.datasources.map((source: any) => source.id)]]);
      const sources = new Map(transferApi.datasources.map((source: any) => [source.id, source]));
      const pages = new Map([['package-transfers', parsed('pages/package-transfers.yaml')]]);
      const user: any = { sub: 'inventory-user', permissions: ['inventory.read'] };
      const api = createYamlApi({
        repository: secondRepository,
        authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
        sources, pageSources, pages, catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
        permissions: { permissions: ['inventory.read', 'inventory.tracking'], tables: {}, endpoints: {} }, eventStore: {}, topics: {}, storage: parsed('storage.yaml'),
      });
      await expect(api(new Request('http://inventory.test/api/pages/package-transfers?package_id=package-empty-0004'), new URL('http://inventory.test/api/pages/package-transfers?package_id=package-empty-0004'))).rejects.toMatchObject({ status: 403 });
      user.permissions = ['inventory.tracking'];
      const missing = await api(new Request('http://inventory.test/api/pages/package-transfers?package_id=missing-package'), new URL('http://inventory.test/api/pages/package-transfers?package_id=missing-package'));
      expect(missing?.status).toBe(200);
      expect((await missing!.json()).datasources.find((entry: any) => entry.id === 'inventory_package_transfer_context').data).toEqual({});
      const allowed = await api(new Request('http://inventory.test/api/pages/package-transfers?package_id=package-empty-0004'), new URL('http://inventory.test/api/pages/package-transfers?package_id=package-empty-0004'));
      expect(allowed?.status).toBe(200);
      expect((await allowed!.json()).datasources.find((entry: any) => entry.id === 'inventory_package_transfers').data).toEqual([
        expect.objectContaining({ id: 'receipt-00003', package_relation: 'result' }),
      ]);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});

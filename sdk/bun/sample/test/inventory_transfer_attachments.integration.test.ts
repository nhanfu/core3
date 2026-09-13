import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { discoverPages } from '@core3/server/discovery';

const root = join(import.meta.dir, '../services/inventory');
const sampleRoot = join(import.meta.dir, '..');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

const makeForm = (bytes: number[], name: string, meta: Record<string, unknown>) => {
  const form = new FormData();
  form.set('file', new File([new Uint8Array(bytes)], name, { type: 'text/plain' }));
  form.set('meta', JSON.stringify({ kind: 'inventory_transfer_attachment', ...meta }));
  return form;
};

describe('Inventory transfer document attachments', () => {
  test('declares the transfer attachment page/API/storage contract', () => {
    const page = yaml('pages/transfer-detail.yaml');
    const api = yaml('api/transfer-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    expect(form).toMatchObject({
      source: 'inventory_transfer_detail',
      attachment_source: 'inventory_transfer_attachments',
      attachment_upload_action: 'upload_inventory_transfer_attachment',
      attachment_download_action: 'download_inventory_transfer_attachment',
    });
    expect(api.datasources.find((source: any) => source.id === 'inventory_transfer_attachments')).toMatchObject({ permission: 'inventory.read', single: false });
    expect(api.actions.find((action: any) => action.id === 'upload_inventory_transfer_attachment')).toMatchObject({
      type: 'upload', permission: 'inventory.write', handler: 'attachment_metadata', kind: 'inventory_transfer_attachment',
    });
    expect(api.actions.find((action: any) => action.id === 'download_inventory_transfer_attachment')).toMatchObject({ type: 'download', permission: 'inventory.read', kind: 'inventory_transfer_attachment' });
    expect(yaml('storage.yaml').attachments.inventory_transfer_attachment.download).toMatchObject({ route: '/api/inventory/transfer-attachments', permission: 'inventory.read' });
  });

  test('enforces actor, ownership, company, duplicate, and stale guards without partial writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, `inventory_transfer_attachment_guards_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
    const action = yaml('api/transfer-detail.yaml').actions.find((candidate: any) => candidate.id === 'upload_inventory_transfer_attachment');
    const attachmentCount = async () => (await repository.query('SELECT COUNT(*) AS count FROM inventory_transfer_attachments', []))[0].count;
    const user: any = { sub: 'inventory-manager', email: 'manager@core3.local', name: 'Inventory Manager', roles: ['manager'], company_name: 'Core3 Demo Company', permissions: ['inventory.read', 'inventory.write'] };
    const uploadRoot = `/tmp/core3-inventory-transfer-upload-${crypto.randomUUID()}`;
    const api = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(), pageSources: new Map(), pages: new Map([['transfer-detail', { actions: [action] }]]),
      catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write'], tables: {}, endpoints: {} }, uploadRoot, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    const upload = (meta: Record<string, unknown>, bytes = [65, 66, 67], name = 'packing-list.txt') => api(new Request('http://inventory.test/api/upload', { method: 'POST', body: makeForm(bytes, name, meta) }), new URL('http://inventory.test/api/upload'));

    user.permissions = ['inventory.read'];
    await expect(upload({ picking_id: 'receipt-00003', expected_row_version: 1 })).rejects.toMatchObject({ status: 403 });
    expect(await attachmentCount()).toBe(0);
    user.permissions = ['inventory.read', 'inventory.write'];
    user.company_name = 'Other Company';
    await expect(upload({ picking_id: 'receipt-00003', expected_row_version: 1 })).rejects.toMatchObject({ status: 403, code: 'INVENTORY_TRANSFER_COMPANY_SCOPE_REQUIRED' });
    expect(await attachmentCount()).toBe(0);
    user.company_name = 'Core3 Demo Company';
    await expect(upload({ picking_id: 'missing-transfer', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'INVENTORY_TRANSFER_NOT_FOUND' });
    expect(await attachmentCount()).toBe(0);
    await expect(upload({ picking_id: 'receipt-00003', expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    expect(await attachmentCount()).toBe(0);
    const invalidUpload = await upload({ picking_id: 'receipt-00003', expected_row_version: 1 }, [], 'invalid.txt');
    expect(invalidUpload?.status).toBe(400);
    expect(await attachmentCount()).toBe(0);

    const response = await upload({ picking_id: 'receipt-00003', expected_row_version: 1 });
    expect(response?.status).toBe(200);
    const uploaded = await response?.json() as any;
    expect(uploaded).toMatchObject({ picking_id: 'receipt-00003', company_name: 'Core3 Demo Company', file_name: 'packing-list.txt', size_bytes: 3 });
    expect(await attachmentCount()).toBe(1);
    expect((await repository.query('SELECT row_version FROM inventory_pickings WHERE id = ?', ['receipt-00003']))[0].row_version).toBe(2);
    await expect(upload({ picking_id: 'receipt-00003', expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'INVENTORY_TRANSFER_ATTACHMENT_DUPLICATE' });
    expect(await attachmentCount()).toBe(1);

    const download = await api(new Request(`http://inventory.test/api/inventory/transfer-attachments/${uploaded.id}`), new URL(`http://inventory.test/api/inventory/transfer-attachments/${uploaded.id}`));
    expect(download?.status).toBe(200);
    expect([...new Uint8Array(await download!.arrayBuffer())]).toEqual([65, 66, 67]);
    user.company_name = 'Other Company';
    const outOfScopeDownload = await api(new Request(`http://inventory.test/api/inventory/transfer-attachments/${uploaded.id}`), new URL(`http://inventory.test/api/inventory/transfer-attachments/${uploaded.id}`));
    expect(outOfScopeDownload?.status).toBe(404);
    database.close();
    rmSync(uploadRoot, { recursive: true, force: true });
  });

  test('persists transfer documents across a file-backed close and reopen', async () => {
    const databasePath = `/tmp/core3-inventory-transfer-attachment-${crypto.randomUUID()}.duckdb`;
    const uploadRoot = `/tmp/core3-inventory-transfer-attachment-upload-${crypto.randomUUID()}`;
    const migrationName = `inventory_transfer_attachment_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const user = { sub: 'inventory-manager', email: 'manager@core3.local', name: 'Inventory Manager', roles: ['manager'], company_name: 'Core3 Demo Company', permissions: ['inventory.read', 'inventory.write'] };
    const action = yaml('api/transfer-detail.yaml').actions.find((candidate: any) => candidate.id === 'upload_inventory_transfer_attachment');
    const createApi = (repository: YamlRepository) => createYamlApi({
      repository, authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(), pageSources: new Map(), pages: new Map([['transfer-detail', { actions: [action] }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['inventory.read', 'inventory.write'], tables: {}, endpoints: {} }, uploadRoot, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const response = await createApi(firstRepository)(new Request('http://inventory.test/api/upload', { method: 'POST', body: makeForm([82, 69, 83, 84], 'restart.txt', { picking_id: 'receipt-00003', expected_row_version: 1 }) }), new URL('http://inventory.test/api/upload'));
    expect(response?.status).toBe(200);
    const uploaded = await response!.json() as any;
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const attachmentSource = yaml('api/transfer-detail.yaml').datasources.find((source: any) => source.id === 'inventory_transfer_attachments');
    expect((await secondRepository.querySource(attachmentSource, { id: 'receipt-00003', current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 50)).data).toMatchObject([
      expect.objectContaining({ id: uploaded.id, picking_id: 'receipt-00003', file_name: 'restart.txt', size_bytes: 4 }),
    ]);
    expect(await secondRepository.query('SELECT file_name, size_bytes FROM inventory_transfer_attachments WHERE id = ?', [uploaded.id])).toEqual([{ file_name: 'restart.txt', size_bytes: 4 }]);
    const download = await createApi(secondRepository)(new Request(`http://inventory.test/api/inventory/transfer-attachments/${uploaded.id}`), new URL(`http://inventory.test/api/inventory/transfer-attachments/${uploaded.id}`));
    expect(download?.status).toBe(200);
    expect([...new Uint8Array(await download!.arrayBuffer())]).toEqual([82, 69, 83, 84]);
    second.close();
    rmSync(databasePath, { force: true });
    rmSync(uploadRoot, { recursive: true, force: true });
  });

  test('prefetches attachment rows in the transfer detail UI with the authenticated company context', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, `inventory_transfer_attachment_detail_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
    await repository.query(
      "INSERT INTO inventory_transfer_attachments(id, picking_id, company_name, file_name, mime_type, size_bytes, storage_key, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ['inventory-transfer-attachment-detail-001', 'receipt-00003', 'Core3 Demo Company', 'detail.txt', 'text/plain', 7, 'detail.txt', 'inventory-manager'],
    );
    const discovered = discoverPages(sampleRoot);
    const inventoryPages = new Map([...discovered.pages]
      .filter(([, page]) => page.module === 'inventory')
      .map(([id, page]) => [id, page.config]));
    const inventorySources = new Map([...discovered.datasources]
      .filter(([id]) => id.startsWith('inventory_')));
    const inventoryPageSources = new Map([...discovered.pageDatasources]
      .filter(([pageId]) => inventoryPages.has(pageId)));
    const authUser: any = {
      sub: 'inventory-manager', email: 'manager@core3.local', name: 'Inventory Manager', roles: ['manager'],
      company_name: 'Core3 Demo Company', permissions: ['inventory.read', 'inventory.write'],
    };
    const api = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return authUser; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: inventorySources, pageSources: inventoryPageSources, pages: inventoryPages,
      catalogs: discovered.catalogs, menus: discovered.menus, workflows: new Map(), workflowFiles: new Map(),
      permissions: discovered.permissions.get('inventory')?.config || {}, uploadRoot: '/tmp/core3-inventory-detail-test', eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    const pageResponse = await api(
      new Request('http://inventory.test/api/pages/transfer-detail?id=receipt-00003'),
      new URL('http://inventory.test/api/pages/transfer-detail?id=receipt-00003'),
    );
    expect(pageResponse?.status).toBe(200);
    const page = await pageResponse!.json() as any;
    expect(page.datasources.find((source: any) => source.id === 'inventory_transfer_attachments')?.data).toEqual([
      expect.objectContaining({ id: 'inventory-transfer-attachment-detail-001', file_name: 'detail.txt' }),
    ]);
    const queryResponse = await api(
      new Request('http://inventory.test/api/query', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 'inventory_transfer_attachments', params: { id: 'receipt-00003' }, top: 50 }),
      }),
      new URL('http://inventory.test/api/query'),
    );
    expect(queryResponse?.status).toBe(200);
    expect((await queryResponse!.json()).data).toEqual([
      expect.objectContaining({ id: 'inventory-transfer-attachment-detail-001', file_name: 'detail.txt' }),
    ]);
    authUser.company_name = 'Other Company';
    const outOfScopeResponse = await api(
      new Request('http://inventory.test/api/pages/transfer-detail?id=receipt-00003'),
      new URL('http://inventory.test/api/pages/transfer-detail?id=receipt-00003'),
    );
    expect(outOfScopeResponse?.status).toBe(200);
    const outOfScopePage = await outOfScopeResponse!.json() as any;
    expect(outOfScopePage.datasources.find((source: any) => source.id === 'inventory_transfer_attachments')?.data).toEqual([]);
    database.close();
  });
});

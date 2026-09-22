import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Accounting invoice attachments parity', () => {
  test('binds invoice attachments through the page/API/storage contracts', () => {
    const page = yaml('pages/invoice-detail.yaml');
    const api = yaml('api/invoice-detail.yaml');
    const form = page.components.find((candidate: any) => candidate.type === 'OdooFormView');
    const upload = api.actions.find((candidate: any) => candidate.id === 'upload_accounting_invoice_attachment');
    const download = api.actions.find((candidate: any) => candidate.id === 'download_accounting_invoice_attachment');
    const remove = api.actions.find((candidate: any) => candidate.id === 'remove_accounting_invoice_attachment');

    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(api.page).toEqual({ id: 'invoice-detail' });
    expect(form).toMatchObject({
      attachment_source: 'accounting_invoice_attachments',
      attachment_upload_action: upload.id,
      attachment_download_action: download.id,
      add_attachment_label: 'Attach files',
      no_attachments_label: 'No attachments',
      attachment_actions: [{ id: remove.id, label: 'Remove', variant: 'danger', permission: 'accounting.write' }],
    });
    expect(upload).toMatchObject({ type: 'upload', permission: 'accounting.write', kind: 'accounting_invoice_attachment' });
    expect(download).toMatchObject({ type: 'download', permission: 'accounting.read', kind: 'accounting_invoice_attachment' });
    expect(remove).toMatchObject({ type: 'server', handler: 'line_item', operation: 'delete', permission: 'accounting.write', domain: 'accounting_invoice_attachment' });
    expect(remove.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'ACCOUNTING_INVOICE_ATTACHMENT_ACTOR_REQUIRED', 'ACCOUNTING_INVOICE_ATTACHMENT_PARENT_STALE', 'ACCOUNTING_INVOICE_ATTACHMENT_STALE',
    ]);
    expect(yaml('storage.yaml').attachments.accounting_invoice_attachment.download).toMatchObject({
      route: '/api/accounting/invoice-attachments', permission: 'accounting.read',
    });
  });

  test('uploads, downloads, guards, and persists an invoice attachment across restart', async () => {
    const databasePath = `/tmp/core3-accounting-invoice-attachments-${crypto.randomUUID()}.duckdb`;
    const uploadRoot = `/tmp/core3-accounting-invoice-attachment-files-${crypto.randomUUID()}`;
    const migrationName = `accounting_invoice_attachments_${crypto.randomUUID().replaceAll('-', '_')}`;
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const apiDocument = yaml('api/invoice-detail.yaml');
    const listPage = yaml('pages/invoices.yaml');
    const attachmentSource = apiDocument.datasources.find((source: any) => source.id === 'accounting_invoice_attachments');
    const user: any = { sub: 'user-admin', name: 'Accounting QA', permissions: ['accounting.read', 'accounting.write'] };
    const createApi = (activeRepository = repository) => createYamlApi({
      repository: activeRepository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map([...apiDocument.datasources, ...(listPage.datasources || [])].map((source: any) => [source.id, source])),
      pageSources: new Map(), pages: new Map([['invoice-detail', { actions: apiDocument.actions }]]),
      catalogs: new Map(), menus: new Map(), workflows: new Map([['accounting_invoices', yaml('pages/invoices-workflow.yaml').workflow]]), workflowFiles: new Map(),
      permissions: { permissions: ['accounting.read', 'accounting.write'], tables: {}, endpoints: {} },
      uploadRoot, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    const formFor = (name: string, bytes: number[], expectedRowVersion: number) => {
      const form = new FormData();
      form.set('file', new File([new Uint8Array(bytes)], name, { type: 'text/plain' }));
      form.set('meta', JSON.stringify({ kind: 'accounting_invoice_attachment', invoice_id: 'accounting-invoice-demo-001', expected_row_version: expectedRowVersion }));
      return form;
    };

    expect((await repository.querySource(attachmentSource, { id: 'accounting-invoice-demo-001', fixture_state: null }, 0, 10)).data)
      .toEqual([expect.objectContaining({ id: 'accounting-invoice-attachment-demo-001', file_name: 'supplier-quote.txt' })]);
    user.permissions = ['accounting.read'];
    await expect(createApi()(new Request('http://accounting.test/api/upload', { method: 'POST', body: formFor('read-only.txt', [1], 1) }), new URL('http://accounting.test/api/upload'))).rejects.toMatchObject({ status: 403 });
    user.permissions = ['accounting.read', 'accounting.write'];
    const uploaded = await createApi()(new Request('http://accounting.test/api/upload', { method: 'POST', body: formFor('invoice-support.txt', [73, 78, 86], 1) }), new URL('http://accounting.test/api/upload'));
    expect(uploaded?.status).toBe(200);
    expect(await repository.query('SELECT file_name, size_bytes, uploaded_by FROM accounting_invoice_attachments WHERE file_name = ?', ['invoice-support.txt']))
      .toEqual([{ file_name: 'invoice-support.txt', size_bytes: 3, uploaded_by: 'user-admin' }]);
    expect(await repository.query('SELECT row_version FROM accounting_invoices WHERE id = ?', ['accounting-invoice-demo-001'])).toEqual([{ row_version: 2 }]);
    const duplicate = await createApi()(new Request('http://accounting.test/api/upload', { method: 'POST', body: formFor('invoice-support.txt', [4], 2) }), new URL('http://accounting.test/api/upload'));
    expect(duplicate?.status).toBe(409);
    const stale = await createApi()(new Request('http://accounting.test/api/upload', { method: 'POST', body: formFor('stale.txt', [4], 1) }), new URL('http://accounting.test/api/upload'));
    expect(stale?.status).toBe(409);

    const download = await createApi()(new Request('http://accounting.test/api/accounting/invoice-attachments/accounting-invoice-attachment-demo-001'), new URL('http://accounting.test/api/accounting/invoice-attachments/accounting-invoice-attachment-demo-001'));
    expect(download?.status).toBe(200);
    expect(await download?.text()).toBe('Accounting invoice attachment\n');
    database.close();

    const restartedDatabase = await DuckDbDatabase.open(databasePath);
    const restartedRepository = new YamlRepository(restartedDatabase);
    await migrateDatabase(restartedRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await restartedRepository.query('SELECT file_name, size_bytes FROM accounting_invoice_attachments WHERE file_name = ?', ['invoice-support.txt']))
      .toEqual([{ file_name: 'invoice-support.txt', size_bytes: 3 }]);
    restartedDatabase.close();
    rmSync(databasePath, { force: true });
    rmSync(uploadRoot, { recursive: true, force: true });
  });

  test('removes an invoice attachment atomically and records the chatter event', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, `accounting_invoice_attachment_remove_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
    const apiDocument = yaml('api/invoice-detail.yaml');
    const remove = apiDocument.actions.find((candidate: any) => candidate.id === 'remove_accounting_invoice_attachment');

    expect(await repository.executeMutation(remove.mutation, {
      id: 'accounting-invoice-demo-001', line_id: 'accounting-invoice-attachment-demo-001', expected_row_version: 1,
      parent_expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Accounting QA', file_name: 'supplier-quote.txt',
    })).toEqual({ deleted: true, id: 'accounting-invoice-attachment-demo-001' });
    expect(await repository.query("SELECT active, row_version FROM accounting_invoice_attachments WHERE id = 'accounting-invoice-attachment-demo-001'"))
      .toEqual([{ active: false, row_version: 2 }]);
    expect(await repository.query("SELECT row_version FROM accounting_invoices WHERE id = 'accounting-invoice-demo-001'"))
      .toEqual([{ row_version: 2 }]);
    expect(await repository.query("SELECT action, action_label, detail FROM accounting_invoice_messages WHERE invoice_id = 'accounting-invoice-demo-001' ORDER BY created_at DESC LIMIT 1"))
      .toEqual([{ action: 'accounting.invoices.attachments.remove', action_label: 'Removed attachment', detail: 'supplier-quote.txt' }]);
    expect((await repository.querySource(apiDocument.datasources.find((source: any) => source.id === 'accounting_invoice_attachments'), { id: 'accounting-invoice-demo-001', fixture_state: null }, 0, 10)).data)
      .toEqual([]);
    await database.close();
  });

  test('rejects read-only, stale-parent, stale-attachment, and missing attachment removal without partial writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, `accounting_invoice_attachment_remove_guards_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
    const remove = yaml('api/invoice-detail.yaml').actions.find((candidate: any) => candidate.id === 'remove_accounting_invoice_attachment');
    const base = {
      id: 'accounting-invoice-demo-001', line_id: 'accounting-invoice-attachment-demo-001', expected_row_version: 1,
      parent_expected_row_version: 1, current_user_id: 'user-admin', current_user_name: 'Accounting QA', file_name: 'supplier-quote.txt',
    };
    await expect(repository.executeMutation(remove.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'ACCOUNTING_INVOICE_ATTACHMENT_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(remove.mutation, { ...base, parent_expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_ATTACHMENT_PARENT_STALE' });
    await expect(repository.executeMutation(remove.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_ATTACHMENT_STALE' });
    await expect(repository.executeMutation(remove.mutation, { ...base, line_id: 'missing-attachment' })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_ATTACHMENT_STALE' });
    expect(await repository.query("SELECT active, row_version FROM accounting_invoice_attachments WHERE id = 'accounting-invoice-attachment-demo-001'"))
      .toEqual([{ active: true, row_version: 1 }]);
    expect(await repository.query("SELECT row_version FROM accounting_invoices WHERE id = 'accounting-invoice-demo-001'"))
      .toEqual([{ row_version: 1 }]);
    await database.close();
  });
});

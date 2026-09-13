import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Accounting bank statement attachments', () => {
  test('uploads, downloads, and persists an attachment with read/write boundaries', async () => {
    const databasePath = `/tmp/core3-accounting-attachment-${crypto.randomUUID()}.duckdb`;
    const uploadRoot = `/tmp/core3-accounting-attachment-files-${crypto.randomUUID()}`;
    const migrationName = `accounting_attachment_${crypto.randomUUID().replaceAll('-', '_')}`;
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const page = yaml('pages/bank-statement-detail.yaml');
    const apiDocument = yaml('api/bank-statement-detail.yaml');
    const upload = apiDocument.actions.find((action: any) => action.id === 'upload_accounting_bank_statement_attachment');
    const download = apiDocument.actions.find((action: any) => action.id === 'download_accounting_bank_statement_attachment');
    expect(page.components[0]).toMatchObject({ attachment_source: 'accounting_bank_statement_attachments', attachment_upload_action: upload.id, attachment_download_action: download.id });
    expect(apiDocument.page).toEqual({ id: 'accounting-bank-statement-detail' });
    expect(upload).toMatchObject({ type: 'upload', permission: 'accounting.write', kind: 'accounting_bank_statement_attachment' });
    expect(download).toMatchObject({ type: 'download', permission: 'accounting.read', kind: 'accounting_bank_statement_attachment' });
    const user: any = { sub: 'accounting-manager', name: 'Accounting Manager', company: { name: 'Core3 Demo Company' }, permissions: ['accounting.read', 'accounting.write'] };
    const createApi = (activeRepository = repository) => createYamlApi({
      repository: activeRepository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(apiDocument.datasources.map((source: any) => [source.id, source])), pageSources: new Map(), pages: new Map([['accounting-bank-statement-detail', { actions: [upload, download] }]]),
      catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['accounting.read', 'accounting.write'], tables: {}, endpoints: {} }, uploadRoot, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    const form = new FormData();
    form.set('file', new File([new Uint8Array([65, 67, 67, 84])], 'statement.csv', { type: 'text/csv' }));
    form.set('meta', JSON.stringify({ kind: 'accounting_bank_statement_attachment', id: 'accounting-bank-statement-001', expected_row_version: 1 }));
    user.permissions = ['accounting.read'];
    await expect(createApi()(new Request('http://accounting.test/api/upload', { method: 'POST', body: form }), new URL('http://accounting.test/api/upload'))).rejects.toMatchObject({ status: 403 });
    user.permissions = ['accounting.read', 'accounting.write'];
    const uploadedResponse = await createApi()(new Request('http://accounting.test/api/upload', { method: 'POST', body: form }), new URL('http://accounting.test/api/upload'));
    expect(uploadedResponse?.status).toBe(200);
    expect(await repository.query('SELECT attachment_name, attachment_type, attachment_size, attachment_company, attachment_created_by, storage_key, row_version FROM accounting_bank_statements WHERE id = ?', ['accounting-bank-statement-001'])).toEqual([expect.objectContaining({ attachment_name: 'statement.csv', attachment_type: 'text/csv', attachment_size: '4', attachment_company: 'Core3 Demo Company', attachment_created_by: 'Accounting Manager', row_version: 2 })]);
    const uploaded = (await repository.query('SELECT storage_key FROM accounting_bank_statements WHERE id = ?', ['accounting-bank-statement-001']))[0] as any;

    const staleForm = new FormData();
    staleForm.set('file', new File([new Uint8Array([83, 84, 65, 76, 69])], 'stale.csv', { type: 'text/csv' }));
    staleForm.set('meta', JSON.stringify({ kind: 'accounting_bank_statement_attachment', id: 'accounting-bank-statement-001', expected_row_version: 1 }));
    const staleResponse = await createApi()(new Request('http://accounting.test/api/upload', { method: 'POST', body: staleForm }), new URL('http://accounting.test/api/upload'));
    expect(staleResponse?.status).toBe(409);
    expect(await staleResponse?.json()).toMatchObject({ code: 'STALE_RECORD' });
    expect((await repository.query('SELECT attachment_name, attachment_size, row_version FROM accounting_bank_statements WHERE id = ?', ['accounting-bank-statement-001']))[0]).toEqual({ attachment_name: 'statement.csv', attachment_size: '4', row_version: 2 });

    user.company = { name: 'Core3 Vietnam Branch' };
    const crossCompanyForm = new FormData();
    crossCompanyForm.set('file', new File([new Uint8Array([67, 82, 79, 83, 83])], 'cross.csv', { type: 'text/csv' }));
    crossCompanyForm.set('meta', JSON.stringify({ kind: 'accounting_bank_statement_attachment', id: 'accounting-bank-statement-001', expected_row_version: 2 }));
    const crossCompanyUpload = await createApi()(new Request('http://accounting.test/api/upload', { method: 'POST', body: crossCompanyForm }), new URL('http://accounting.test/api/upload'));
    expect(crossCompanyUpload?.status).toBe(404);
    expect(await crossCompanyUpload?.json()).toMatchObject({ code: 'ACCOUNTING_BANK_STATEMENT_NOT_FOUND' });
    expect((await repository.query('SELECT attachment_name, storage_key FROM accounting_bank_statements WHERE id = ?', ['accounting-bank-statement-001']))[0]).toEqual(expect.objectContaining({ attachment_name: 'statement.csv', storage_key: uploaded.storage_key }));
    const crossCompanyDownload = await createApi()(new Request('http://accounting.test/api/accounting/bank-statement-attachments/accounting-bank-statement-001'), new URL('http://accounting.test/api/accounting/bank-statement-attachments/accounting-bank-statement-001'));
    expect(crossCompanyDownload?.status).toBe(404);
    user.company = { name: 'Core3 Demo Company' };
    database.close();
    const restartedDatabase = await DuckDbDatabase.open(databasePath);
    const restartedRepository = new YamlRepository(restartedDatabase);
    await migrateDatabase(restartedRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const downloaded = await createApi(restartedRepository)(new Request(`http://accounting.test/api/accounting/bank-statement-attachments/accounting-bank-statement-001`), new URL('http://accounting.test/api/accounting/bank-statement-attachments/accounting-bank-statement-001'));
    expect(downloaded?.status).toBe(200);
    expect(downloaded?.headers.get('content-type')).toBe('text/csv');
    expect([...new Uint8Array(await downloaded!.arrayBuffer())]).toEqual([65, 67, 67, 84]);
    expect(uploaded.storage_key).toContain('statement.csv');
    restartedDatabase.close();
    rmSync(databasePath, { force: true });
    rmSync(uploadRoot, { recursive: true, force: true });
  });
});

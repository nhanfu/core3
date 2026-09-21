import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Accounting invoice PDF download parity', () => {
  test('serves a durable PDF artifact through the page/API-bound Accounting route', async () => {
    const databasePath = `/tmp/core3-accounting-invoice-pdf-${crypto.randomUUID()}.duckdb`;
    const migrationName = `accounting_invoice_pdf_${crypto.randomUUID().replaceAll('-', '_')}`;
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const page = yaml('pages/invoice-detail.yaml');
    const apiDocument = yaml('api/invoice-detail.yaml');
    const workflow = yaml('pages/invoices-workflow.yaml').workflow;
    const download = apiDocument.actions.find((action: any) => action.id === 'download_accounting_invoice_pdf');
    const user: any = { sub: 'accounting-reader', name: 'Accounting Reader', company: { name: 'Core3 Demo Company' }, permissions: ['accounting.read'] };
    const api = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map([...apiDocument.datasources, ...yaml('pages/invoices.yaml').datasources].map((source: any) => [source.id, source])), pageSources: new Map(), pages: new Map([['invoice-detail', { actions: apiDocument.actions }]]),
      catalogs: new Map(), menus: new Map(), workflows: new Map([['accounting_invoices', workflow]]), workflowFiles: new Map(), permissions: { permissions: ['accounting.read', 'accounting.write'], tables: {}, endpoints: {} },
      uploadRoot: `/tmp/core3-accounting-invoice-pdf-files-${crypto.randomUUID()}`, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    try {
      expect(page.components[0].page_id).toBeUndefined();
      expect(page.page.id).toBe('invoice-detail');
      expect(apiDocument.page.id).toBe(page.page.id);
      expect(download).toMatchObject({ type: 'client', permission: 'accounting.read' });
      expect(download.script).toContain("/api/query");
      const source = apiDocument.datasources.find((candidate: any) => candidate.id === 'accounting_invoice_pdf');
      const sourceResult = await repository.querySource(source, { id: 'accounting-invoice-demo-001', fixture_state: null }, 0, 1);
      expect(sourceResult.data).toMatchObject({ id: 'accounting-invoice-demo-001', file_name: 'INV_2026_0001.pdf', mime_type: 'application/pdf' });
      expect(String(sourceResult.data.content_base64).startsWith('JVBERi0xLjQ')).toBe(true);
      const response = await api(new Request('http://accounting.test/api/accounting/invoice-pdfs/accounting-invoice-demo-001'), new URL('http://accounting.test/api/accounting/invoice-pdfs/accounting-invoice-demo-001'));
      expect(response?.status).toBe(200);
      expect(response?.headers.get('content-type')).toBe('application/pdf');
      expect(response?.headers.get('content-disposition')).toContain('INV_2026_0001.pdf');
      const bytes = new Uint8Array(await response!.arrayBuffer());
      expect(bytes.length).toBeGreaterThan(500);
      expect(new TextDecoder().decode(bytes.slice(0, 8))).toBe('%PDF-1.4');

      user.permissions = [];
      await expect(api(new Request('http://accounting.test/api/accounting/invoice-pdfs/accounting-invoice-demo-001'), new URL('http://accounting.test/api/accounting/invoice-pdfs/accounting-invoice-demo-001'))).rejects.toMatchObject({ status: 403 });
      user.permissions = ['accounting.read'];
      const vendor = await api(new Request('http://accounting.test/api/accounting/invoice-pdfs/accounting-invoice-demo-002'), new URL('http://accounting.test/api/accounting/invoice-pdfs/accounting-invoice-demo-002'));
      expect(vendor?.status).toBe(404);
    } finally {
      await database.close();
      rmSync(databasePath, { force: true });
    }
  });

  test('keeps the PDF artifact available after DuckDB close and reopen', async () => {
    const databasePath = `/tmp/core3-accounting-invoice-pdf-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `accounting_invoice_pdf_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const user: any = { sub: 'accounting-reader', name: 'Accounting Reader', company: { name: 'Core3 Demo Company' }, permissions: ['accounting.read'] };
    const createApi = (repository: YamlRepository) => createYamlApi({
      repository, authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(), pageSources: new Map(), pages: new Map(), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: { permissions: ['accounting.read'], tables: {}, endpoints: {} },
      uploadRoot: `/tmp/core3-accounting-invoice-pdf-restart-files-${crypto.randomUUID()}`, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const response = await createApi(secondRepository)(new Request('http://accounting.test/api/accounting/invoice-pdfs/accounting-invoice-demo-001'), new URL('http://accounting.test/api/accounting/invoice-pdfs/accounting-invoice-demo-001'));
    expect(response?.status).toBe(200);
    expect(new TextDecoder().decode(new Uint8Array(await response!.arrayBuffer()).slice(0, 8))).toBe('%PDF-1.4');
    second.close();
    rmSync(databasePath, { force: true });
  });
});

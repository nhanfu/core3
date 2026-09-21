import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('eCommerce product document parity', () => {
  test('traces Odoo product documents and keeps product/detail page and API contracts separate', () => {
    const productModel = readFileSync('/home/nhanjs/projects/odoo/addons/product/models/product_document.py', 'utf8');
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_document.py', 'utf8');
    const websiteViews = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/product_document_views.xml', 'utf8');
    const controller = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/controllers/main.py', 'utf8');
    const page = yaml('pages/product-document-detail.yaml');
    const api = yaml('api/product-document-detail.yaml');
    const productPage = yaml('pages/product-detail.yaml');
    const productApi = yaml('api/product-detail.yaml');

    expect(productModel).toContain("_name = 'product.document'");
    expect(productModel).toContain('_inherits = {');
    expect(websiteModel).toContain('shown_on_product_page = fields.Boolean');
    expect(websiteModel).toContain('Documents shown on product page cannot be restricted');
    expect(websiteViews).toContain('name="shown_on_product_page"');
    expect(controller).toContain("/shop/<model(\"product.template\"):product_template>/document/<int:document_id>");
    expect(controller).toContain('document.shown_on_product_page');
    expect(page.page).toMatchObject({ id: 'ecommerce-product-document-detail', route: '/ecommerce/products/documents/detail' });
    expect(api.page).toEqual({ id: 'ecommerce-product-document-detail' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_product_document_detail', attachment_source: 'ecommerce_product_document_attachment', attachment_upload_action: 'upload_ecommerce_product_document' });
    expect(productPage.components.find((component: any) => component.source === 'ecommerce_product_documents')).toMatchObject({ create_action: 'create_ecommerce_product_document' });
    expect(productApi.datasources.find((source: any) => source.id === 'ecommerce_product_documents')).toMatchObject({ permission: 'ecommerce.read' });
    expect(action(api, 'upload_ecommerce_product_document')).toMatchObject({ type: 'upload', permission: 'ecommerce.write', kind: 'ecommerce_product_document' });
    expect(action(api, 'download_ecommerce_product_document')).toMatchObject({ type: 'download', permission: 'ecommerce.read', kind: 'ecommerce_product_document' });
    expect(action(api, 'edit_ecommerce_product_document').permission).toBe('ecommerce.write');
    expect(action(productApi, 'view_ecommerce_product_document')).toMatchObject({ permission: 'ecommerce.read', navigate_to: '/ecommerce/products/documents/detail' });
    expect(yaml('storage.yaml').attachments.ecommerce_product_document.download).toMatchObject({ route: '/api/ecommerce/product-documents', permission: 'ecommerce.read' });
  });

  test('seeds documents, supports permissioned upload/edit/delete, and guards company, validation, and stale writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_documents_guards', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_documents_guards', ['schema', 'data']);
    const productApi = yaml('api/product-detail.yaml');
    const documentApi = yaml('api/product-document-detail.yaml');
    const documents = productApi.datasources.find((source: any) => source.id === 'ecommerce_product_documents');
    expect((await repository.querySource(documents, { id: 'ecommerce-product-mug', company_name: 'My Company' }, 0, 20)).data)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'ecommerce-product-document-mug-care', name: 'Mug Care Guide', document_type: 'file', shown_on_product_page: true }),
        expect.objectContaining({ id: 'ecommerce-product-document-mug-assembly', name: 'Mug Assembly Instructions', document_type: 'url', external_url: 'https://docs.core3.local/products/mug-assembly', shown_on_product_page: true }),
      ]));

    const create = action(productApi, 'create_ecommerce_product_document');
    const created = await repository.executeMutation(create.mutation, {
      id: 'ecommerce-product-document-qa',
      product_id: 'ecommerce-product-mug',
      current_company_name: 'My Company',
      values: { name: 'QA Installation Guide', sequence: 20 },
    }) as any;
    expect(created).toMatchObject({ id: 'ecommerce-product-document-qa', active: false, row_version: 1 });

    const upload = action(documentApi, 'upload_ecommerce_product_document');
    await expect(repository.executeMutation(upload.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Other Company',
      fileName: 'qa-guide.pdf', mimeType: 'application/pdf', sizeBytes: 64, storageKey: 'qa-guide.pdf', current_user_id: 'qa-user',
    })).rejects.toMatchObject({ status: 404, code: 'ECOMMERCE_PRODUCT_DOCUMENT_NOT_FOUND' });
    await expect(repository.executeMutation(upload.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'My Company',
      fileName: '', mimeType: 'application/pdf', sizeBytes: 0, storageKey: 'invalid', current_user_id: 'qa-user',
    })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_DOCUMENT_INVALID' });
    const uploaded = await repository.executeMutation(upload.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'My Company',
      fileName: 'qa-guide.pdf', mimeType: 'application/pdf', sizeBytes: 64, storageKey: 'qa-guide.pdf', current_user_id: 'qa-user',
    }) as any;
    expect(uploaded).toMatchObject({ id: created.id, active: true, file_name: 'qa-guide.pdf', mime_type: 'application/pdf', row_version: 2 });

    const edit = action(documentApi, 'edit_ecommerce_product_document');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 2, current_company_name: 'My Company', values: { name: 'QA Installation Guide Published', sequence: 5, active: true, shown_on_product_page: true } }) as any;
    expect(edited).toMatchObject({ name: 'QA Installation Guide Published', sequence: 5, shown_on_product_page: true, row_version: 3 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 2, current_company_name: 'My Company', values: { name: 'Stale' } }))
      .rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_DOCUMENT_STALE' });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 3, current_company_name: 'Other Company', values: { name: 'Foreign' } }))
      .rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_DOCUMENT_STALE' });

    const remove = action(documentApi, 'delete_ecommerce_product_document');
    expect(await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 3, current_company_name: 'My Company' }))
      .toEqual({ deleted: true, id: created.id });
    expect((await repository.query('SELECT COUNT(*) AS count FROM ecommerce_product_documents WHERE id = ?', [created.id]))[0].count).toBe(0);
    database.close();
  });

  test('uploads, downloads, and preserves product document bytes across restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-product-documents-${crypto.randomUUID()}.duckdb`;
    const uploadRoot = `/tmp/core3-ecommerce-product-documents-uploads-${crypto.randomUUID()}`;
    const migrationName = `ecommerce_product_documents_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const user: any = { sub: 'document-manager', email: 'manager@core3.local', name: 'Document Manager', permissions: ['ecommerce.read', 'ecommerce.write'] };
    const productApi = yaml('api/product-detail.yaml');
    const documentApi = yaml('api/product-document-detail.yaml');
    const create = action(productApi, 'create_ecommerce_product_document');
    const upload = action(documentApi, 'upload_ecommerce_product_document');
    const download = action(documentApi, 'download_ecommerce_product_document');
    const createApi = (repository: YamlRepository) => createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map([...productApi.datasources, ...documentApi.datasources].map((source: any) => [source.id, source])),
      pageSources: new Map(), pages: new Map([['ecommerce-product-document-detail', { actions: [upload, download] }]]),
      catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['ecommerce.read', 'ecommerce.write'], tables: {}, endpoints: {} },
      uploadRoot, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    let first: DuckDbDatabase | undefined;
    let second: DuckDbDatabase | undefined;
    try {
      first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const created = await firstRepository.executeMutation(create.mutation, { id: 'ecommerce-product-document-restart', product_id: 'ecommerce-product-mug', current_company_name: 'My Company', values: { name: 'Restart Guide', sequence: 15 } }) as any;
      const form = new FormData();
      form.set('file', new File([new Uint8Array([80, 68, 70, 45, 49])], 'restart-guide.pdf', { type: 'application/pdf' }));
      form.set('meta', JSON.stringify({ kind: 'ecommerce_product_document', id: created.id, expected_row_version: 1 }));
      const uploadedResponse = await createApi(firstRepository)(new Request('http://ecommerce.test/api/upload', { method: 'POST', body: form }), new URL('http://ecommerce.test/api/upload'));
      expect(uploadedResponse?.status).toBe(200);
      expect(await uploadedResponse!.json()).toMatchObject({ id: created.id, file_name: 'restart-guide.pdf', size_bytes: 5 });
      first.close();
      first = undefined;

      second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT file_name, mime_type, size_bytes, active FROM ecommerce_product_documents WHERE id = ?', [created.id]))
        .toEqual([{ file_name: 'restart-guide.pdf', mime_type: 'application/pdf', size_bytes: 5, active: true }]);
      const downloaded = await createApi(secondRepository)(new Request(`http://ecommerce.test/api/ecommerce/product-documents/${created.id}`), new URL(`http://ecommerce.test/api/ecommerce/product-documents/${created.id}`));
      expect(downloaded?.status).toBe(200);
      expect(downloaded?.headers.get('content-type')).toBe('application/pdf');
      expect([...new Uint8Array(await downloaded!.arrayBuffer())]).toEqual([80, 68, 70, 45, 49]);
    } finally {
      second?.close();
      first?.close();
      rmSync(databasePath, { force: true });
      rmSync(uploadRoot, { recursive: true, force: true });
    }
  });
});

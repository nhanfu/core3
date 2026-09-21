import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { bindNamedParams } from '@core3/server/database/sql';
import { validatePageDefinition } from '@core3/server/yaml/schema';
import EcommerceModule from '../services/ecommerce/module';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);
const migrate = (repository: YamlRepository, name: string) => migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);

describe('eCommerce URL product document parity', () => {
  test('traces Odoo URL attachments, public route, and separate document contracts', () => {
    const productModel = readFileSync('/home/nhanjs/projects/odoo/addons/product/models/product_document.py', 'utf8');
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_document.py', 'utf8');
    const websiteViews = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/product_document_views.xml', 'utf8');
    const controller = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/controllers/main.py', 'utf8');
    const templates = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/templates.xml', 'utf8');
    const api = yaml('api/product-document-detail.yaml');
    const page = yaml('pages/product-document-detail.yaml');
    const productApi = yaml('api/product-detail.yaml');
    const productPage = yaml('pages/product-detail.yaml');
    const operations = yaml('operations.yaml');

    expect(productModel).toContain("_inherits = {");
    expect(websiteModel).toContain('shown_on_product_page = fields.Boolean');
    expect(websiteViews).toContain('name="shown_on_product_page"');
    expect(controller).toContain("'/shop/<model(\"product.template\"):product_template>/document/<int:document_id>'");
    expect(controller).toContain('document.shown_on_product_page');
    expect(templates).toContain("attachment_sudo.type == 'url' and '_blank' or '_self'");
    expect(page.page).toMatchObject({ id: 'ecommerce-product-document-detail' });
    expect(api.page).toEqual({ id: 'ecommerce-product-document-detail' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_product_document_detail' });
    expect(page.components[0].header_actions).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'set_ecommerce_product_document_url', permission: 'ecommerce.write' })]));
    expect(action(api, 'set_ecommerce_product_document_url')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.products.documents.set_url' });
    expect(action(api, 'set_ecommerce_product_document_url').mutation.concurrency).toEqual({ required: true });
    expect(productApi.datasources.find((source: any) => source.id === 'ecommerce_product_documents').query).toContain('external_url');
    expect(productPage.components.find((component: any) => component.source === 'ecommerce_product_documents')).toMatchObject({ create_action: 'create_ecommerce_product_document' });
    expect(operations.operations['ecommerce.public.product_document'].query).toContain("document_type, 'file'");
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921300000-124-ecommerce-product-document-url.yaml').version).toBe('0.0.124');
    expect(yaml('migrations/20260921301000-125-ecommerce-product-document-url-demo.yaml').version).toBe('0.0.125');
  });

  test('persists URL documents, validates permissioned updates, redirects publicly, and survives restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_document_url_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const productApi = yaml('api/product-detail.yaml');
    const documentApi = yaml('api/product-document-detail.yaml');
    const documents = productApi.datasources.find((source: any) => source.id === 'ecommerce_product_documents');
    const setUrl = action(documentApi, 'set_ecommerce_product_document_url');
    const fixture = await repository.querySource(documents, { id: 'ecommerce-product-mug', company_name: 'My Company' }, 0, 20);
    expect(fixture.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'ecommerce-product-document-mug-assembly', document_type: 'url', external_url: 'https://docs.core3.local/products/mug-assembly', shown_on_product_page: true })]));
    await expect(repository.executeMutation(setUrl.mutation, { id: 'ecommerce-product-document-mug-assembly', expected_row_version: 1, current_company_name: 'My Company', values: { external_url: 'javascript:alert(1)' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_DOCUMENT_URL_INVALID' });
    await expect(repository.executeMutation(setUrl.mutation, { id: 'ecommerce-product-document-mug-assembly', expected_row_version: 1, current_company_name: 'Other Company', values: { external_url: 'https://docs.example/foreign' } })).rejects.toMatchObject({ status: 404, code: 'ECOMMERCE_PRODUCT_DOCUMENT_NOT_FOUND' });
    const updated = await repository.executeMutation(setUrl.mutation, { id: 'ecommerce-product-document-mug-assembly', expected_row_version: 1, current_company_name: 'My Company', values: { external_url: 'https://docs.example/mug-assembly-v2' } }) as any;
    expect(updated).toMatchObject({ id: 'ecommerce-product-document-mug-assembly', row_version: 2, document_type: 'url', external_url: 'https://docs.example/mug-assembly-v2' });
    await expect(repository.executeMutation(setUrl.mutation, { id: 'ecommerce-product-document-mug-assembly', expected_row_version: 1, current_company_name: 'My Company', values: { external_url: 'https://docs.example/replay' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_DOCUMENT_STALE' });

    const operation = yaml('operations.yaml').operations['ecommerce.public.product_document'];
    const bound = bindNamedParams(operation.query, { product_id: 'ecommerce-product-mug', document_id: 'ecommerce-product-document-mug-assembly' });
    expect(await repository.query(bound.statement, bound.values)).toEqual([{ id: 'ecommerce-product-document-mug-assembly', product_id: 'ecommerce-product-mug', name: 'Mug Assembly Instructions', document_type: 'url', external_url: 'https://docs.example/mug-assembly-v2', company_name: 'My Company' }]);
    database.close();

    const module = new EcommerceModule() as any;
    module.authAdapter = { async getCurrentUser() { return { id: 'public-customer' }; } };
    const calls: any[] = [];
    const publicService = { async call(name: string, request: any) { calls.push({ name, request }); if (name === 'ecommerce.public.access') return { access: [{ allowed: true }] }; return { document: [{ external_url: 'https://docs.example/mug-assembly-v2' }] }; } };
    const response = await module.handlePublicRoute(new Request('http://core3.test/api/public/ecommerce/products/ecommerce-product-mug/documents/ecommerce-product-document-mug-assembly'), new URL('http://core3.test/api/public/ecommerce/products/ecommerce-product-mug/documents/ecommerce-product-document-mug-assembly'), publicService);
    expect(response?.status).toBe(302);
    expect(response?.headers.get('location')).toBe('https://docs.example/mug-assembly-v2');
    expect(calls.at(-1)).toEqual({ name: 'ecommerce.public.product_document', request: { product_id: 'ecommerce-product-mug', document_id: 'ecommerce-product-document-mug-assembly' } });

    const databasePath = `/tmp/core3-ecommerce-document-url-${crypto.randomUUID()}.duckdb`;
    let restarted: DuckDbDatabase | undefined;
    try {
      restarted = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(restarted);
      await migrate(first, `${migrationName}_restart`);
      await first.executeMutation(setUrl.mutation, { id: 'ecommerce-product-document-mug-assembly', expected_row_version: 1, current_company_name: 'My Company', values: { external_url: 'https://docs.example/restart' } });
      restarted.close();
      restarted = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(restarted);
      await migrate(second, `${migrationName}_restart`);
      expect(await second.query('SELECT document_type, external_url, row_version FROM ecommerce_product_documents WHERE id = ?', ['ecommerce-product-document-mug-assembly'])).toEqual([{ document_type: 'url', external_url: 'https://docs.example/restart', row_version: 2 }]);
    } finally {
      restarted?.close();
      rmSync(databasePath, { force: true });
    }
  });
});

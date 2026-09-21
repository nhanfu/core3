import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);
const migrate = (repository: YamlRepository, name: string) => migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);

describe('eCommerce product page extra fields parity', () => {
  test('traces Odoo settings model and pairs configuration and Product Detail contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const extraFieldModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website_sale_extra_field.py', 'utf8');
    const websiteView = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/website_views.xml', 'utf8');
    const template = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/templates.xml', 'utf8');
    const api = yaml('api/product-extra-fields.yaml');
    const page = yaml('pages/product-extra-fields.yaml');
    const detailApi = yaml('api/product-detail.yaml');
    const detailPage = yaml('pages/product-detail.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('shop_extra_field_ids = fields.One2many');
    expect(websiteModel).toContain("comodel_name='website.sale.extra.field'");
    expect(extraFieldModel).toContain("_name = 'website.sale.extra.field'");
    expect(extraFieldModel).toContain("ttype', 'in', ['char', 'binary']");
    expect(websiteView).toContain('Product Page Extra Fields');
    expect(websiteView).toContain('shop_extra_field_ids');
    expect(websiteView).toContain("widget=\"handle\"");
    expect(template).toContain('website.shop_extra_field_ids');
    expect(template).toContain("product.sudo()[field.name]");
    expect(page.page).toMatchObject({ id: 'ecommerce-product-extra-fields', route: '/ecommerce/product-extra-fields' });
    expect(api.page).toEqual({ id: 'ecommerce-product-extra-fields' });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_product_extra_fields' });
    expect(action(api, 'create_ecommerce_product_extra_field')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.product_extra_fields.create' });
    expect(action(api, 'edit_ecommerce_product_extra_field').mutation.concurrency).toEqual({ required: true });
    expect(action(api, 'delete_ecommerce_product_extra_field')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.product_extra_fields.delete' });
    expect(detailApi.datasources).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'ecommerce_product_extra_field_values', permission: 'ecommerce.read' })]));
    expect(detailPage.components).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'ListView', source: 'ecommerce_product_extra_field_values' })]));
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/product-extra-fields', label: 'Product Page Extra Fields', permission: 'ecommerce.read' }),
    ]));
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921410000-146-ecommerce-product-extra-fields.yaml').version).toBe('0.0.146');
    expect(yaml('migrations/20260921411000-147-ecommerce-product-extra-fields-demo.yaml').version).toBe('0.0.147');
  });

  test('persists ordered fields, enforces company/value/stale guards, projects Product Detail, and survives restart', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_product_extra_fields_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const api = yaml('api/product-extra-fields.yaml');
    const fields = api.datasources[0];
    const options = api.datasources[1];
    const create = action(api, 'create_ecommerce_product_extra_field');
    const edit = action(api, 'edit_ecommerce_product_extra_field');
    const remove = action(api, 'delete_ecommerce_product_extra_field');

    expect((await repository.querySource(fields, { company_name: 'My Company', active: null }, 0, 20)).data).toEqual([
      expect.objectContaining({ id: 'ecommerce-product-extra-field-reference', field_name: 'internal_reference', field_type: 'char', sequence: 10 }),
      expect.objectContaining({ id: 'ecommerce-product-extra-field-category', field_name: 'category', field_type: 'char', sequence: 20 }),
    ]);
    expect((await repository.querySource(options, {}, 0, 20)).data).toEqual([
      { value: 'name', label: 'Product Name', field_type: 'char' },
      { value: 'internal_reference', label: 'Internal Reference', field_type: 'char' },
      { value: 'category', label: 'eCommerce Category', field_type: 'char' },
    ]);
    expect((await repository.querySource(fields, { company_name: 'My Company', fixture_state: 'not_found', active: null }, 0, 20)).data).toEqual([]);
    await expect(repository.executeMutation(create.mutation, { current_company_name: 'Other Company', values: { field_name: 'name', sequence: 30, active: true, company_name: 'My Company' } })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_EXTRA_FIELD_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { current_company_name: 'My Company', values: { field_name: 'website_description', sequence: 30, active: true, company_name: 'My Company' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_EXTRA_FIELD_INVALID' });
    await expect(repository.executeMutation(create.mutation, { current_company_name: 'My Company', values: { field_name: 'internal_reference', sequence: 30, active: true, company_name: 'My Company' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_EXTRA_FIELD_EXISTS' });
    const created = await repository.executeMutation(create.mutation, { current_company_name: 'My Company', values: { field_name: 'name', sequence: 30, active: true, company_name: 'My Company' } }) as any;
    expect(created).toMatchObject({ field_name: 'name', field_label: 'Product Name', row_version: 1, sequence: 30 });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: created.id, expected_row_version: 1, values: { field_name: 'category', sequence: 35, active: true } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_EXTRA_FIELD_EXISTS' });
    const updated = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: created.id, expected_row_version: 1, values: { field_name: 'name', sequence: 5, active: false } }) as any;
    expect(updated).toMatchObject({ row_version: 2, field_name: 'name', sequence: 5, active: false });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: created.id, expected_row_version: 1, values: { field_name: 'name', sequence: 40, active: true } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_EXTRA_FIELD_STALE' });
    await expect(repository.executeMutation(remove.mutation, { current_company_name: 'Other Company', id: 'ecommerce-product-extra-field-reference', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'ECOMMERCE_PRODUCT_EXTRA_FIELD_NOT_FOUND' });
    await repository.executeMutation(remove.mutation, { current_company_name: 'My Company', id: created.id, expected_row_version: 2 });
    const detail = yaml('api/product-detail.yaml').datasources.find((source: any) => source.id === 'ecommerce_product_extra_field_values');
    const productId = 'ecommerce-product-mug';
    expect(await repository.querySource(detail, { id: productId, company_name: 'My Company' }, 0, 20)).toMatchObject({ data: expect.arrayContaining([expect.objectContaining({ field_name: 'internal_reference', value: 'CS-MUG-001' }), expect.objectContaining({ field_name: 'category', value: 'All / Accessories' })]) });
    database.close();

    const databasePath = `/tmp/core3-ecommerce-product-extra-fields-${crypto.randomUUID()}.duckdb`;
    let restarted: DuckDbDatabase | undefined;
    try {
      restarted = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(restarted);
      await migrate(first, `${migrationName}_restart`);
      await first.executeMutation(create.mutation, { current_company_name: 'My Company', values: { field_name: 'name', sequence: 30, active: true, company_name: 'My Company' } });
      restarted.close();
      restarted = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(restarted);
      await migrate(second, `${migrationName}_restart`);
      expect(await second.query("SELECT field_name, sequence, active FROM ecommerce_product_extra_fields WHERE company_name = 'My Company' AND field_name = 'name'", [])).toEqual([{ field_name: 'name', sequence: 30, active: true }]);
    } finally {
      restarted?.close();
      rmSync(databasePath, { force: true });
    }
  });
});

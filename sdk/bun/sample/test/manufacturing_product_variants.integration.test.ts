import { describe, expect, test } from 'bun:test';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages, discoverPageRoutes } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(file).actions.find((candidate: any) => candidate.id === id);
const variantMigration = '20260912010000-017-product-variants.yaml';

function variantMigrationRoot() {
  const root = mkdtempSync(join(tmpdir(), 'core3-mrp-product-variants-'));
  copyFileSync(join(serviceRoot, 'migrations', variantMigration), join(root, variantMigration));
  return root;
}

async function variantRepository(migrationTable: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  const migrationRoot = variantMigrationRoot();
  await migrateDatabase(repository, migrationRoot, undefined, migrationTable, ['schema', 'data']);
  await migrateDatabase(repository, migrationRoot, undefined, migrationTable, ['schema', 'data']);
  rmSync(migrationRoot, { recursive: true, force: true });
  return { database, repository };
}

describe('Manufacturing Product Variants parity slice', () => {
  test('keeps the MRP menu, source action modes, and page/API ownership', () => {
    const page = yaml('pages/product-variants.yaml');
    const detail = yaml('pages/product-variant-detail.yaml');
    const api = yaml('api/product-variants.yaml');
    const detailApi = yaml('api/product-variant-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const masterData = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'master-data');
    const item = masterData.items.find((candidate: any) => candidate.label === 'Product Variants');
    const view = page.components[0];
    const form = detail.components[0];

    expect(page.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'manufacturing-product-variants', route: '/manufacturing/product-variants', auth: { require: ['manufacturing.read'] } });
    expect(detail.page).toMatchObject({ id: 'manufacturing-product-variant-detail', route: '/manufacturing/product-variants/detail' });
    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detail.page.id);
    expect(discovered.pages.get(page.page.id)?.config.page.id).toBe(page.page.id);
    expect(discovered.pageDatasources.get(page.page.id)).toContain('mrp_product_variants');
    expect(discovered.pageDatasources.get(detail.page.id)).toEqual(expect.arrayContaining(['mrp_product_variant_detail', 'mrp_product_variant_messages']));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/manufacturing/product-variants', page: page.page.id, module: 'manufacturing' }),
      expect.objectContaining({ path: '/manufacturing/product-variants/detail', page: detail.page.id, module: 'manufacturing' }),
    ]));
    expect(item).toMatchObject({ path: '/manufacturing/product-variants', label: 'Product Variants', permission: 'manufacturing.read' });
    expect(view).toMatchObject({ source: 'mrp_product_variants', view_navigation: 'tabs', form_view: { page: 'apps/services/manufacturing/pages/product-variant-detail.yaml' } });
    expect(view.views.map((candidate: any) => candidate.label)).toEqual(['Kanban', 'List']);
    expect(form).toMatchObject({ source: 'mrp_product_variant_detail', title_field: 'name', subtitle_field: 'default_code', editable: true, message_source: 'mrp_product_variant_messages' });
    expect(form.notebook.tabs.map((tab: any) => tab.label)).toEqual(['General Information', 'Purchase', 'INTERNAL NOTES']);
    expect(api.datasources.every((source: any) => source.permission === 'manufacturing.read')).toBe(true);
    expect(detailApi.datasources.every((source: any) => source.permission === 'manufacturing.read')).toBe(true);
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['manufacturing.read', 'manufacturing.write', 'manufacturing.manage']));
  });

  test('seeds deterministic variants, search, filters, detail, and error states', async () => {
    const { database, repository } = await variantRepository('manufacturing_product_variants_schema_migrations');
    const list = yaml('api/product-variants.yaml').datasources.find((source: any) => source.id === 'mrp_product_variants');
    const detail = yaml('api/product-variant-detail.yaml').datasources.find((source: any) => source.id === 'mrp_product_variant_detail');
    const messages = yaml('api/product-variant-detail.yaml').datasources.find((source: any) => source.id === 'mrp_product_variant_messages');
    const params = { q: null, product_type: null, active: null, fixture_state: null };

    const rows = await repository.querySource(list, params, 0, 50);
    expect(rows.data).toHaveLength(14);
    expect(rows.data[0]).toMatchObject({ id: 'mrp-variant-screen-black', name: 'Acoustic Bloc Screens', variant_values: 'Color: Black', on_hand_display: '10.00 Units' });
    expect((await repository.querySource(list, { ...params, q: 'DESK0005' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['mrp-variant-desk-white-custom']);
    expect((await repository.querySource(list, { ...params, q: 'Aluminium' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['mrp-variant-chair-aluminium', 'mrp-variant-desk-black-aluminium', 'mrp-variant-desk-white-aluminium']);
    expect((await repository.querySource(list, { ...params, active: false }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Plastic Laminate']);
    expect((await repository.querySource(list, { ...params, product_type: 'Goods' }, 0, 50)).data).toHaveLength(14);
    expect((await repository.querySource(list, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(list, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_PRODUCT_VARIANTS_UNAVAILABLE' });
    expect(await repository.querySource(detail, { id: 'mrp-variant-desk-white-steel', fixture_state: null }, 0, 1)).toMatchObject({ data: expect.objectContaining({ name: 'Customizable Desk', default_code: 'FURN_0096', variant_values: 'Color: White, Legs: Steel' }) });
    expect((await repository.querySource(messages, { id: 'mrp-variant-desk-white-steel' }, 0, 50)).data).toHaveLength(2);
    expect((await repository.querySource(detail, { id: 'missing-variant', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'mrp-variant-desk-white-steel', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'MRP_PRODUCT_VARIANT_DETAIL_UNAVAILABLE' });
    database.close();
  });

  test('enforces create, edit, stale-write, duplicate, archive, delete, and permissions contracts', async () => {
    const { database, repository } = await variantRepository('manufacturing_product_variants_crud_migrations');
    const variantsApi = yaml('api/product-variants.yaml');
    const detailApi = yaml('api/product-variant-detail.yaml');
    const create = action('api/product-variants.yaml', 'create_mrp_product_variant');
    const edit = action('api/product-variant-detail.yaml', 'edit_mrp_product_variant');
    const archive = action('api/product-variants.yaml', 'archive_mrp_product_variant');
    const remove = action('api/product-variant-detail.yaml', 'delete_mrp_product_variant');
    expect(create.permission).toBe('manufacturing.write');
    expect(edit.permission).toBe('manufacturing.write');
    expect(archive.permission).toBe('manufacturing.manage');
    expect(remove.permission).toBe('manufacturing.manage');
    expect(variantsApi.datasources[1].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 } });
    expect(detailApi.datasources[0].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, missing_record: { status: 404 } });

    const values = { name: 'QA Variant', product_template: 'QA Product', variant_values: 'Color: Green', default_code: 'QA-VAR-001', barcode: '900000000001', category: 'QA', product_type: 'Goods', uom: 'Units', company_name: 'My Company (San Francisco)', list_price: 12, standard_price: 8, sales_tax: '15%', purchase_tax: '15%', note: '', on_hand: 0, document_count: 0, purchased_qty: 0, active: true };
    const created = await repository.executeMutation(create.mutation, { values }) as any;
    expect(created).toMatchObject({ name: values.name, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values })).rejects.toMatchObject({ status: 409, code: 'MRP_PRODUCT_VARIANT_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: '' } })).rejects.toMatchObject({ status: 422, code: 'MRP_PRODUCT_VARIANT_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'QA Invalid', list_price: -1 } })).rejects.toMatchObject({ status: 422, code: 'MRP_PRODUCT_VARIANT_NUMERIC_INVALID' });
    const updated = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...values, name: 'QA Variant Updated', list_price: 13 } }) as any;
    expect(updated).toMatchObject({ name: 'QA Variant Updated', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 2, values: { ...values, name: 'Customizable Desk', variant_values: 'Color: White, Legs: Custom' } })).rejects.toMatchObject({ status: 409, code: 'MRP_PRODUCT_VARIANT_EXISTS' });
    await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 3 })).rejects.toMatchObject({ status: 409, code: 'MRP_PRODUCT_VARIANT_ALREADY_ARCHIVED' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 3 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 3 })).rejects.toMatchObject({ status: 404, code: 'MRP_PRODUCT_VARIANT_NOT_FOUND' });
    await expect(repository.executeMutation(remove.mutation, { id: 'mrp-variant-desk-white-steel', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'MRP_PRODUCT_VARIANT_IN_USE' });
    database.close();
  });
});

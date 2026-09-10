import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const listApi = () => yaml('api/boms.yaml');
const detailApi = () => yaml('api/bom-detail.yaml');
const action = (id: string) => [...(listApi().actions || []), ...(detailApi().actions || [])]
  .find((candidate: any) => candidate.id === id);

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'manufacturing_boms_test_schema_migrations', ['schema', 'data']);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'manufacturing_boms_test_schema_migrations', ['schema', 'data']);
  return repository;
}

describe('Manufacturing Bills of Materials parity slice', () => {
  test('keeps list/detail pages layout-only and binds every API fragment by page id', () => {
    const listPage = yaml('pages/boms.yaml');
    const detailPage = yaml('pages/bom-detail.yaml');
    const list = listPage.components[0];
    const detail = detailPage.components[0];
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(listPage.page).toMatchObject({ id: 'boms', route: '/boms', auth: { require: ['manufacturing.read'] } });
    expect(detailPage.page).toMatchObject({ id: 'bom-detail', route: '/boms/detail', auth: { require: ['manufacturing.read'] } });
    expect(list).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'mrp_boms', row_open_action: 'view_mrp_bom' });
    expect(list).toMatchObject({ view_navigation: 'icons' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban']);
    expect(list.views.find((view: any) => view.id === 'list')).not.toHaveProperty('mobile', false);
    expect(list.views.find((view: any) => view.id === 'kanban')).not.toHaveProperty('mobile', false);
    expect(list.views.find((view: any) => view.id === 'card')).toBeUndefined();
    expect(list.columns.find((column: any) => column.field === 'product_name')).toMatchObject({ mobile_secondary: 'reference' });
    expect(list.columns.find((column: any) => column.field === 'product_quantity')).toMatchObject({ type: 'WeightCell', unit: 'Units', mobile: true, optional: 'hide' });
    expect(detail).toMatchObject({ type: 'OdooFormView', source: 'mrp_bom_detail', editable: true });
    expect(detail.notebook.tabs.map((tab: any) => tab.label)).toEqual(['Components', 'Operations', 'By-products', 'Miscellaneous']);
    expect(discovered.pageDatasources.get('boms')).toEqual(['mrp_boms']);
    expect(discovered.pageDatasources.get('bom-detail')).toEqual(['mrp_bom_detail', 'mrp_bom_components', 'mrp_bom_operations', 'mrp_bom_byproducts']);
    expect(listApi().page.id).toBe('boms');
    expect(detailApi().page.id).toBe('bom-detail');
  });

  test('matches the installed Odoo action, menu, modes, and declared permissions', () => {
    const manifest = yaml('manifest.yaml');
    const masterData = manifest.menu.groups.find((group: any) => group.id === 'master-data');
    const menu = masterData.items.find((item: any) => item.label === 'Bills of Materials');
    expect(menu).toMatchObject({ path: '/boms', permission: 'manufacturing.read' });
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['manufacturing.read', 'manufacturing.write', 'manufacturing.manage']));
    expect(listApi().datasources[0]).toMatchObject({ permission: 'manufacturing.read' });
    expect(detailApi().datasources.every((source: any) => source.permission === 'manufacturing.read')).toBe(true);
    expect(action('view_mrp_bom')).toMatchObject({ type: 'navigate', permission: 'manufacturing.read', navigate_to: '/manufacturing/boms/detail' });
    for (const id of ['create_mrp_bom', 'duplicate_mrp_bom', 'edit_mrp_bom', 'archive_mrp_bom', 'unarchive_mrp_bom', 'delete_mrp_bom']) {
      expect(action(id), id).toHaveProperty('permission');
    }
    expect(action('edit_mrp_bom').mutation.concurrency).toEqual({ required: true });
    expect(action('delete_mrp_bom').mutation).toMatchObject({ operation: 'delete', concurrency: { required: true } });
  });

  test('serves deterministic active, archived, search, empty, detail, and line fixtures', async () => {
    const repository = await repositoryForTest();
    const list = listApi().datasources[0];
    const detail = detailApi().datasources.find((source: any) => source.id === 'mrp_bom_detail');
    const components = detailApi().datasources.find((source: any) => source.id === 'mrp_bom_components');
    const operations = detailApi().datasources.find((source: any) => source.id === 'mrp_bom_operations');
    const byproducts = detailApi().datasources.find((source: any) => source.id === 'mrp_bom_byproducts');
    const params = { q: null, active: null, bom_type: null, fixture_state: null };

    expect((await repository.querySource(list, params, 0, 50)).data.map((row: any) => row.product_name)).toEqual([
      '[FURN_7800] Desk Combination', '[FURN_8522] Table Top', '[FURN_8621] Plastic Laminate', '[FURN_7023] Wood Panel',
      '[FURN_8855] Drawer', '[FURN_78236] Table Kit', '[FURN_8855] Drawer', '[FURN_9666] Table',
    ]);
    expect((await repository.querySource(list, { ...params, active: 'active' }, 0, 50)).data).toHaveLength(8);
    expect((await repository.querySource(list, { ...params, active: 'archived' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(list, { ...params, q: 'Drawer' }, 0, 50)).data.map((row: any) => row.reference)).toEqual(['PRIM-ASSEM', 'SEC-ASSEM']);
    expect((await repository.querySource(list, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(list, { ...params, q: 'not found' }, 0, 50)).data).toEqual([]);
    expect(await repository.querySource(detail, { id: 'bom-desk-combination', fixture_state: null }, 0, 1)).toMatchObject({ data: { product_name: '[FURN_7800] Desk Combination', component_count: 2, active: true } });
    expect((await repository.querySource(detail, { id: 'missing-bom', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(components, { id: 'bom-desk-combination', fixture_state: null }, 0, 50)).data).toHaveLength(2);
    expect((await repository.querySource(operations, { id: 'bom-desk-combination', fixture_state: null }, 0, 50)).data).toHaveLength(2);
    expect((await repository.querySource(byproducts, { id: 'bom-desk-combination', fixture_state: null }, 0, 50)).data).toHaveLength(1);
    await expect(repository.querySource(list, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_BOMS_UNAVAILABLE' });
    await expect(repository.querySource(detail, { id: 'bom-desk-combination', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'MRP_BOM_DETAIL_UNAVAILABLE' });
  });

  test('supports create, edit, duplicate, archive, restore, delete, validation, stale, and missing guards', async () => {
    const repository = await repositoryForTest();
    const create = action('create_mrp_bom');
    const duplicate = action('duplicate_mrp_bom');
    const edit = action('edit_mrp_bom');
    const archive = action('archive_mrp_bom');
    const unarchive = action('unarchive_mrp_bom');
    const remove = action('delete_mrp_bom');
    const values = { name: 'QA BOM', product_id: 'product-qa', product_name: 'QA Assembly', product_variant: '', product_quantity: 2, uom: 'Units', version: '1.0', reference: 'QA-ASSEMBLY', bom_type: 'Manufacture this product', company_name: 'My Company (San Francisco)', active: true, valid_from: '2026-01-15', valid_to: '2026-12-31', routing: 'Assembly', notes: 'QA fixture' };
    const createdId = 'bom-qa-created';

    const created = await repository.executeMutation(create.mutation, { id: createdId, values });
    expect(created).toMatchObject({ id: expect.any(String), product_name: 'QA Assembly', product_quantity: 2, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, product_name: 'Another QA Assembly' } })).rejects.toMatchObject({ status: 409, code: 'MRP_BOM_VERSION_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, product_name: 'Invalid QA Assembly', product_id: 'product-invalid', product_quantity: 0 } })).rejects.toMatchObject({ status: 422, code: 'MRP_BOM_QUANTITY_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, product_name: 'Invalid Type', product_id: 'product-invalid-type', bom_type: 'Subcontract' } })).rejects.toMatchObject({ status: 422, code: 'MRP_BOM_TYPE_INVALID' });
    await expect(repository.executeMutation(duplicate.mutation, { values: { ...values, product_name: 'Duplicate QA Assembly' } })).rejects.toMatchObject({ status: 409, code: 'MRP_BOM_VERSION_EXISTS' });

    const updated = await repository.executeMutation(edit.mutation, { id: createdId, expected_row_version: 1, values: { ...values, product_name: 'QA Assembly Updated', product_quantity: 3 } });
    expect(updated).toMatchObject({ id: created.id, product_name: 'QA Assembly Updated', product_quantity: 3, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: createdId, expected_row_version: 1, values: { ...values, product_name: 'Stale QA Assembly' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-bom', expected_row_version: 1, values })).rejects.toMatchObject({ status: 404, code: 'MRP_BOM_NOT_FOUND' });
    await repository.executeMutation(archive.mutation, { id: createdId, expected_row_version: 2, values: { active: false } });
    await repository.executeMutation(unarchive.mutation, { id: createdId, expected_row_version: 3, values: { active: true } });
    await expect(repository.executeMutation(remove.mutation, { id: createdId, expected_row_version: 3 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(remove.mutation, { id: createdId, expected_row_version: 4 });
    expect((await repository.querySource(listApi().datasources[0], { q: 'QA Assembly Updated', active: null, bom_type: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    await expect(repository.executeMutation(remove.mutation, { id: createdId, expected_row_version: 4 })).rejects.toMatchObject({ status: 404, code: 'MRP_BOM_NOT_FOUND' });
  });
});

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Purchase attributes parity', () => {
  test('binds the Configuration > Products > Attributes list and form by page id', () => {
    const list = yaml('pages/purchase-attributes.yaml');
    const detail = yaml('pages/purchase-attribute-detail.yaml');
    const listApi = yaml('api/purchase-attributes.yaml');
    const detailApi = yaml('api/purchase-attribute-detail.yaml');

    expect(list.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(list.page).toMatchObject({ id: 'purchase-product-attributes', route: '/purchase/attributes', auth: { require: ['purchase.read'] } });
    expect(detail.page).toMatchObject({ id: 'purchase-product-attribute-detail', route: '/purchase/attributes/detail', auth: { require: ['purchase.read'] } });
    expect(listApi.page.id).toBe('purchase-product-attributes');
    expect(detailApi.page.id).toBe('purchase-product-attribute-detail');
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('purchase-product-attributes')).toContain('purchase_product_attributes');
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('purchase-product-attribute-detail')).toEqual(expect.arrayContaining(['purchase_product_attribute_detail', 'purchase_product_attribute_values']));
    expect(list.components[0]).toMatchObject({ source: 'purchase_product_attributes', row_open_action: 'view_purchase_product_attribute' });
    expect(list.components[0].views.map((view: any) => view.id)).toEqual(['list']);
    expect(detail.components[0]).toMatchObject({ source: 'purchase_product_attribute_detail', initial_editing: true });
    expect(detail.components[1]).toMatchObject({ type: 'LineItemGrid', source: 'purchase_product_attribute_values' });
    expect(yaml('manifest.yaml').menu.groups).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'configuration', items: expect.arrayContaining([expect.objectContaining({ path: '/purchase/attributes', label: 'Attributes', permission: 'purchase.read' })]) })]));
  });

  test('seeds deterministic Odoo-shaped attributes and covers empty/search/create/update guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_attributes_test_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_attributes_test_schema_migrations', ['schema', 'data']);

    const listApi = yaml('api/purchase-attributes.yaml');
    const source = listApi.datasources.find((candidate: any) => candidate.id === 'purchase_product_attributes');
    const params = { q: null, fixture_state: null };
    const rows = await repository.querySource(source, params, 0, 50);
    expect(rows.data).toHaveLength(11);
    expect(rows.data.map((row: any) => row.name)).toEqual(['Brand', 'Color', 'Customization', 'Duration', 'Fabric', 'Height', 'Legs', 'Length', 'Options', 'Shoes size', 'Size']);
    expect(rows.data[0]).toMatchObject({ id: 'purchase-attribute-brand', display_type: 'Radio', variant_creation: 'Instantly' });
    expect((await repository.querySource(source, { ...params, q: 'Pills' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Length', 'Shoes size', 'Size']);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const detailApi = yaml('api/purchase-attribute-detail.yaml');
    const detailSource = detailApi.datasources.find((candidate: any) => candidate.id === 'purchase_product_attribute_detail');
    expect((await repository.querySource(detailSource, { id: 'purchase-attribute-brand', fixture_state: null }, 0, 1)).data).toMatchObject({ name: 'Brand', values_count: 40 });
    const valuesSource = detailApi.datasources.find((candidate: any) => candidate.id === 'purchase_product_attribute_values');
    const values = await repository.querySource(valuesSource, { id: 'purchase-attribute-brand' }, 0, 100);
    expect(values.data).toHaveLength(40);
    expect(values.data[0]).toMatchObject({ value: 'Adidas', free_text_label: 'No', price_extra_display: '$ 0.00' });

    const create = listApi.actions.find((candidate: any) => candidate.id === 'create_purchase_product_attribute');
    expect(create).toMatchObject({ permission: 'purchase.write', operation: 'create' });
    expect(create.mutation.guards[0]).toMatchObject({ status: 409, code: 'PURCHASE_PRODUCT_ATTRIBUTE_EXISTS' });
    const created = await repository.executeMutation(create.mutation, { name: 'Material', display_type: 'Select', variant_creation: 'Dynamically', values_count: 0, active: true });
    expect(created).toMatchObject({ name: 'Material', display_type: 'Select', variant_creation: 'Dynamically' });
    await expect(repository.executeMutation(create.mutation, { name: 'brand', display_type: 'Radio', variant_creation: 'Instantly', values_count: 0, active: true })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_PRODUCT_ATTRIBUTE_EXISTS' });

    const update = detailApi.actions.find((candidate: any) => candidate.id === 'edit_purchase_product_attribute');
    expect(update).toMatchObject({ permission: 'purchase.write', operation: 'update' });
    const changed = await repository.executeMutation(update.mutation, { id: 'purchase-attribute-brand', expected_row_version: 1, name: 'Manufacturer', display_type: 'Pills', variant_creation: 'Never', values_count: 40, active: true });
    expect(changed).toMatchObject({ name: 'Manufacturer', row_version: 2, display_type: 'Pills', variant_creation: 'Never' });
    await expect(repository.executeMutation(update.mutation, { id: 'purchase-attribute-brand', expected_row_version: 1, name: 'Stale', display_type: 'Radio', variant_creation: 'Instantly', values_count: 40, active: true })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(update.mutation, { id: 'missing-attribute', expected_row_version: 1, name: 'Missing', display_type: 'Radio', variant_creation: 'Instantly', values_count: 0, active: true })).rejects.toMatchObject({ status: 404 });
  });
});

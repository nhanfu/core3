import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const listApi = () => yaml('api/purchase-units-packagings.yaml');
const detailApi = () => yaml('api/purchase-unit-packaging-detail.yaml');
const action = (id: string) => [...listApi().actions, ...detailApi().actions].find((candidate: any) => candidate.id === id);

async function seededRepository() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'purchase_units_packagings_test_schema_migrations', ['schema', 'data']);
  return repository;
}

describe('Purchase Units & Packagings parity', () => {
  test('binds the installed Odoo action and keeps pages layout-only', () => {
    const list = yaml('pages/purchase-units-packagings.yaml');
    const detail = yaml('pages/purchase-unit-packaging-detail.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const configuration = manifest.menu.groups.find((group: any) => group.id === 'configuration');

    expect(list.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(list.page).toMatchObject({ id: 'purchase-units-packagings', route: '/purchase/units-packagings', auth: { require: ['purchase.read'] } });
    expect(detail.page).toMatchObject({ id: 'purchase-unit-packaging-detail', route: '/purchase/units-packagings/detail', auth: { require: ['purchase.read'] } });
    expect(listApi().page.id).toBe('purchase-units-packagings');
    expect(detailApi().page.id).toBe('purchase-unit-packaging-detail');
    expect(discovered.pageDatasources.get('purchase-units-packagings')).toContain('purchase_units_packagings');
    expect(discovered.pageDatasources.get('purchase-unit-packaging-detail')).toContain('purchase_unit_packaging_detail');
    expect(configuration.items.find((item: any) => item.label === 'Units & Packagings')).toMatchObject({ path: '/purchase/units-packagings', permission: 'purchase.read' });
    expect(list.components[0].columns.map((column: any) => column.label)).toEqual([' ', 'Unit Name', 'Contains', 'Reference Unit']);
    expect(detail.components[0].type).toBe('OdooFormView');
    expect(detail.components[0].groups[0].fields.map((field: any) => field.label)).toEqual(['Unit Name', 'Quantity', 'Reference Unit']);
  });

  test('serves the 21 Odoo demo rows with search, empty, detail, and transport states', async () => {
    const repository = await seededRepository();
    const source = listApi().datasources.find((candidate: any) => candidate.id === 'purchase_units_packagings');
    const detail = detailApi().datasources.find((candidate: any) => candidate.id === 'purchase_unit_packaging_detail');
    const params = { q: null, fixture_state: null };
    const rows = await repository.querySource(source, params, 0, 50);

    expect(rows.data).toHaveLength(21);
    expect(rows.data.map((row: any) => row.name)).toEqual([
      'Minutes', 'ft²', 'Units', 'Hours', 'mm', 'm²', 'ml', 'g', 'KWH', 'in', 'gal (US)', 'Pack of 6', 'Days', 'm', 'km', 'L', 'kg', 'Ton', 'oz', 'lb', 'ft',
    ]);
    expect(rows.data[0]).toMatchObject({ name: 'Minutes', relative_factor: 0.016667, relative_factor_display: '0.017', relative_uom_name: 'Hours' });
    expect(rows.data.find((row: any) => row.name === 'Pack of 6')).toMatchObject({ relative_factor_display: '6.000', relative_uom_name: 'Units' });
    expect((await repository.querySource(source, { ...params, q: 'Pack' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Pack of 6']);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'PURCHASE_UNITS_PACKAGINGS_UNAVAILABLE' });

    const first = await repository.querySource(detail, { id: 'purchase-uom-minutes', fixture_state: null }, 0, 1);
    expect(first.data).toMatchObject({ name: 'Minutes', relative_factor: 0.016667, relative_uom_name: 'Hours' });
    expect((await repository.querySource(detail, { id: 'missing-unit', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(detail, { id: 'purchase-uom-minutes', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'PURCHASE_UNIT_PACKAGING_UNAVAILABLE' });
  });

  test('enforces purchase permissions and supports CRUD, duplicate, validation, stale, and not-found guards', async () => {
    const repository = await seededRepository();
    const create = action('create_purchase_unit_packaging');
    const edit = action('edit_purchase_unit_packaging');
    const remove = action('delete_purchase_unit_packaging');
    const source = listApi().datasources.find((candidate: any) => candidate.id === 'purchase_units_packagings');

    expect(source.permission).toBe('purchase.read');
    expect(create.permission).toBe('purchase.write');
    expect(edit.permission).toBe('purchase.write');
    expect(remove.permission).toBe('purchase.write');
    expect(edit.mutation.concurrency).toEqual({ required: true });
    expect(remove.mutation.concurrency).toEqual({ required: true });

    const created = await repository.executeMutation(create.mutation, { values: { sequence: 700, name: 'Carton 12', relative_factor: 12, relative_uom_name: 'Units' } });
    expect(created).toMatchObject({ name: 'Carton 12', relative_factor: 12, relative_uom_name: 'Units', row_version: 1 });
    expect((await repository.querySource(source, { q: 'Carton', fixture_state: null }, 0, 50)).data).toHaveLength(1);
    await expect(repository.executeMutation(create.mutation, { values: { name: 'carton 12', relative_factor: 12 } })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_UNIT_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Invalid Factor', relative_factor: 0 } })).rejects.toMatchObject({ status: 422, code: 'PURCHASE_UNIT_FACTOR_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { name: '   ', relative_factor: 1 } })).rejects.toMatchObject({ status: 422, code: 'PURCHASE_UNIT_NAME_REQUIRED' });

    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { sequence: 701, name: 'Carton 24', relative_factor: 24, relative_uom_name: 'Units' } });
    expect(edited).toMatchObject({ name: 'Carton 24', relative_factor: 24, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale Carton', relative_factor: 2 } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 2, values: { name: 'Units', relative_factor: 24 } })).rejects.toMatchObject({ status: 409, code: 'PURCHASE_UNIT_NAME_EXISTS' });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 2, values: { name: 'Carton 24', relative_factor: -1 } })).rejects.toMatchObject({ status: 422, code: 'PURCHASE_UNIT_FACTOR_INVALID' });

    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    expect((await repository.querySource(source, { q: 'Carton', fixture_state: null }, 0, 50)).data).toEqual([]);
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'PURCHASE_UNIT_PACKAGING_NOT_FOUND' });
  });
});

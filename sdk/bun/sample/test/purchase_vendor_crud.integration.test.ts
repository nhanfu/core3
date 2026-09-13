import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/purchase');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Purchase Vendor CRUD bounded parity', () => {
  test('declares the guarded editable Vendor detail contract', () => {
    const page = yaml('pages/vendor-detail.yaml');
    const api = yaml('api/vendor-detail.yaml');
    const update = api.actions.find((action: any) => action.id === 'edit_purchase_vendor');
    expect(page.page).toMatchObject({ id: 'vendor-detail', auth: { require: ['purchase.read'] } });
    expect(page.components[0].header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'edit_purchase_vendor', permission: 'purchase.manage' }),
    ]));
    expect(update.mutation).toMatchObject({ concurrency: { required: true }, timestamps: true });
    expect(update.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 404 }),
      expect.objectContaining({ status: 409, code: 'STALE_RECORD' }),
    ]));
  });

  test('persists a valid vendor edit and rejects stale and missing rows', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'purchase_vendor_crud_reviewer', ['schema', 'data']);
    const create = yaml('api/vendors.yaml').actions.find((action: any) => action.id === 'create_purchase_vendor');
    const update = yaml('api/vendor-detail.yaml').actions.find((action: any) => action.id === 'edit_purchase_vendor');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Reviewer Vendor', email: 'reviewer-vendor@example.com' } }) as any;
    expect(created).toMatchObject({ state: 'Active', row_version: 1 });
    const updated = await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Reviewer Vendor Updated' } }) as any;
    expect(updated).toMatchObject({ name: 'Reviewer Vendor Updated', row_version: 2 });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(update.mutation, { id: 'missing-vendor', expected_row_version: 1, values: { name: 'Missing' } })).rejects.toMatchObject({ status: 404 });
    database.close();
  });
});

import { describe, expect, test } from 'bun:test';
import { rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('eCommerce Product Tag Variant Assignments parity', () => {
  test('traces the Odoo variant assignment surface and keeps page/API contracts separate', () => {
    const page = yaml('pages/product-tags.yaml');
    const api = yaml('api/product-tags.yaml');
    expect(page.page).toMatchObject({ id: 'ecommerce-product-tags', route: '/ecommerce/product-tags' });
    expect(page.components[0].columns).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'variant_count', label: 'Variants' }),
      expect.objectContaining({ field: 'variant_names', label: 'Assigned variants' }),
    ]));
    expect(api.page).toEqual({ id: 'ecommerce-product-tags' });
    expect(api.datasources.find((source: any) => source.id === 'ecommerce_product_tag_variants')).toMatchObject({ permission: 'ecommerce.read' });
    expect(action(api, 'assign_ecommerce_product_tag_variant')).toMatchObject({ permission: 'ecommerce.write', operation: 'update' });
    expect(action(api, 'remove_ecommerce_product_tag_variant')).toMatchObject({ permission: 'ecommerce.write', operation: 'update' });
    expect(action(api, 'assign_ecommerce_product_tag_variant').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ECOMMERCE_PRODUCT_TAG_STALE' }),
      expect.objectContaining({ code: 'ECOMMERCE_PRODUCT_TAG_VARIANT_INVALID' }),
      expect.objectContaining({ code: 'ECOMMERCE_PRODUCT_TAG_VARIANT_EXISTS' }),
    ]));
  });

  test('seeds deterministic variant assignments and projects them separately from templates', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_tag_variants_contract_test', ['schema', 'data']);
    const api = yaml('api/product-tags.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'ecommerce_product_tags');
    const featured = (await repository.querySource(source, { q: null, visible_to_customers: null, fixture_state: null }, 0, 50)).data[0];
    expect(featured).toMatchObject({ product_count: 2, variant_count: 1, variant_names: 'Core3 Ceramic Mug (Blue)', variant_ids: ['ecommerce-variant-mug-blue'] });
    const variants = api.datasources.find((candidate: any) => candidate.id === 'ecommerce_product_tag_variants');
    expect((await repository.querySource(variants, { company_name: 'My Company' }, 0, 50)).data).toEqual([
      { value: 'ecommerce-variant-mug-blue', label: 'Core3 Ceramic Mug (Blue) (CS-MUG-001-BLUE)' },
      { value: 'ecommerce-variant-chair-black', label: 'Ergonomic Office Chair (Black) (OF-CHAIR-004-BLACK)' },
    ]);
    expect((await repository.querySource(variants, { company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('assigns and removes variants with permission, company, duplicate, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_tag_variants_crud_test', ['schema', 'data']);
    const api = yaml('api/product-tags.yaml');
    const assign = action(api, 'assign_ecommerce_product_tag_variant');
    const remove = action(api, 'remove_ecommerce_product_tag_variant');
    await expect(repository.executeMutation(assign.mutation, {
      tag_id: 'ecommerce-tag-service', expected_row_version: 1, current_company_name: 'Other Company',
      values: { variant_id: 'ecommerce-variant-mug-blue' },
    })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_TAG_VARIANT_INVALID' });
    await expect(repository.executeMutation(assign.mutation, {
      tag_id: 'ecommerce-tag-service', expected_row_version: 1, current_company_name: 'My Company',
      values: { variant_id: 'missing-variant' },
    })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_TAG_VARIANT_INVALID' });
    const assigned = await repository.executeMutation(assign.mutation, {
      tag_id: 'ecommerce-tag-service', expected_row_version: 1, current_company_name: 'My Company',
      values: { variant_id: 'ecommerce-variant-mug-blue' },
    }) as any;
    expect(assigned).toMatchObject({ id: 'ecommerce-tag-service', row_version: 2 });
    await expect(repository.executeMutation(assign.mutation, {
      tag_id: 'ecommerce-tag-service', expected_row_version: 2, current_company_name: 'My Company',
      values: { variant_id: 'ecommerce-variant-mug-blue' },
    })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_TAG_VARIANT_EXISTS' });
    await expect(repository.executeMutation(assign.mutation, {
      tag_id: 'ecommerce-tag-service', expected_row_version: 1, current_company_name: 'My Company',
      values: { variant_id: 'ecommerce-variant-chair-black' },
    })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_TAG_STALE' });
    const removed = await repository.executeMutation(remove.mutation, {
      tag_id: 'ecommerce-tag-service', expected_row_version: 2, values: { variant_id: 'ecommerce-variant-mug-blue' },
    }) as any;
    expect(removed).toMatchObject({ id: 'ecommerce-tag-service', row_version: 3 });
    await expect(repository.executeMutation(remove.mutation, {
      tag_id: 'ecommerce-tag-service', expected_row_version: 3, values: { variant_id: 'ecommerce-variant-mug-blue' },
    })).rejects.toMatchObject({ status: 404, code: 'ECOMMERCE_PRODUCT_TAG_VARIANT_NOT_FOUND' });
    expect(await repository.query('SELECT COUNT(*) AS count FROM ecommerce_product_tag_variants WHERE tag_id = ? AND variant_id = ?', ['ecommerce-tag-service', 'ecommerce-variant-mug-blue'])).toEqual([{ count: 0 }]);
    database.close();
  });

  test('persists variant assignments across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-product-tag-variants-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_product_tag_variants_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const assign = action(yaml('api/product-tags.yaml'), 'assign_ecommerce_product_tag_variant');
      await firstRepository.executeMutation(assign.mutation, {
        tag_id: 'ecommerce-tag-service', expected_row_version: 1, current_company_name: 'My Company',
        values: { variant_id: 'ecommerce-variant-chair-black' },
      });
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT variant_id FROM ecommerce_product_tag_variants WHERE tag_id = ? ORDER BY variant_id', ['ecommerce-tag-service'])).toEqual([
        { variant_id: 'ecommerce-variant-chair-black' },
      ]);
      expect((await secondRepository.query('SELECT COUNT(*) AS count FROM ecommerce_product_tag_variants'))[0].count).toBe(3);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});

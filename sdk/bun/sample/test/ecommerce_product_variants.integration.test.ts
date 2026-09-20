import { describe, expect, test } from 'bun:test';
import { mkdirSync, rmSync, readFileSync, symlinkSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages, discoverPageRoutes } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

const values = {
  name: 'Browser Blue Mug Variant',
  internal_reference: 'CS-MUG-BROWSER-BLUE',
  combination_key: 'color=blue,size=large',
  attribute_values: 'Color: Blue, Size: Large',
  sales_price: 24.5,
  active: true,
};

describe('eCommerce Product Variants parity', () => {
  test('traces Odoo variant sources and separates product page/API contracts', () => {
    const page = yaml('pages/product-detail.yaml');
    const api = yaml('api/product-detail.yaml');
    const discoveryRoot = mkdtempSync('/tmp/core3-ecommerce-discovery-');
    mkdirSync(join(discoveryRoot, 'services'));
    const isolatedModule = join(discoveryRoot, 'services/ecommerce');
    mkdirSync(isolatedModule);
    for (const entry of ['manifest.yaml', 'permission.yaml', 'api', 'pages']) {
      symlinkSync(join(import.meta.dir, `../services/ecommerce/${entry}`), join(isolatedModule, entry));
    }
    const discovered = discoverPages(discoveryRoot);
    expect(page.page).toMatchObject({ id: 'ecommerce-product-detail', route: '/ecommerce/products/detail' });
    expect(api.page).toEqual({ id: 'ecommerce-product-detail' });
    expect(page.components[1]).toMatchObject({ type: 'ListView', source: 'ecommerce_product_variants', create_action: 'create_ecommerce_product_variant' });
    expect(discovered.pageDatasources.get('ecommerce-product-detail')).toEqual(expect.arrayContaining(['ecommerce_product_detail', 'ecommerce_product_variants']));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/ecommerce/products/detail', page: 'ecommerce-product-detail', module: 'ecommerce' })]));
    expect(api.datasources.find((source: any) => source.id === 'ecommerce_product_variants').permission).toBe('ecommerce.read');
    expect(action(api, 'create_ecommerce_product_variant').permission).toBe('ecommerce.write');
    expect(action(api, 'edit_ecommerce_product_variant').permission).toBe('ecommerce.write');
    expect(action(api, 'delete_ecommerce_product_variant').permission).toBe('ecommerce.write');
    const pricelistApi = yaml('api/pricelist-detail.yaml');
    expect(pricelistApi.datasources.map((source: any) => source.id)).toContain('ecommerce_pricelist_rule_variants');
    expect(action(pricelistApi, 'create_ecommerce_pricelist_rule').mutation.steps[0].query).toContain('variant_id');
    rmSync(discoveryRoot, { recursive: true, force: true });
  });

  test('seeds durable variants and resolves variant-specific pricelist rules', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_product_variants_seed', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'ecommerce_product_variants_seed', ['schema', 'data']);
    const api = yaml('api/product-detail.yaml');
    const variants = api.datasources.find((source: any) => source.id === 'ecommerce_product_variants');
    const rows = await repository.querySource(variants, { id: 'ecommerce-product-mug', company_name: 'My Company' }, 0, 50);
    expect(rows.data).toMatchObject([{ id: 'ecommerce-variant-mug-blue', name: 'Core3 Ceramic Mug (Blue)', combination_key: 'color=blue', sales_price: 20.5 }]);
    expect((await repository.querySource(variants, { id: 'ecommerce-product-mug', company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    const ruleApi = yaml('api/pricelist-detail.yaml');
    const rules = ruleApi.datasources.find((source: any) => source.id === 'ecommerce_pricelist_rules');
    expect((await repository.querySource(rules, { id: 'ecommerce-pricelist-public' }, 0, 50)).data[0]).toMatchObject({ applied_on: '0_product_variant', variant_id: 'ecommerce-variant-mug-blue', price: 19 });
    expect(variants.error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
    database.close();
  });

  test('enforces variant CRUD, combination/reference validation, company scope, and stale writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_variants_crud', ['schema', 'data']);
    const api = yaml('api/product-detail.yaml');
    const create = action(api, 'create_ecommerce_product_variant');
    const edit = action(api, 'edit_ecommerce_product_variant');
    const remove = action(api, 'delete_ecommerce_product_variant');
    await expect(repository.executeMutation(create.mutation, { product_id: 'ecommerce-product-mug', current_company_name: 'Other Company', values })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_VARIANT_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { product_id: 'ecommerce-product-mug', current_company_name: 'My Company', values: { ...values, combination_key: 'color=blue' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_VARIANT_COMBINATION_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { product_id: 'ecommerce-product-mug', current_company_name: 'My Company', values: { ...values, sales_price: -1 } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_VARIANT_PRICE_INVALID' });
    const created = await repository.executeMutation(create.mutation, { product_id: 'ecommerce-product-mug', current_company_name: 'My Company', values }) as any;
    expect(created).toMatchObject({ product_id: 'ecommerce-product-mug', name: values.name, combination_key: values.combination_key, row_version: 1 });
    const changed = await repository.executeMutation(edit.mutation, { product_id: 'ecommerce-product-mug', variant_id: created.id, current_company_name: 'My Company', expected_row_version: 1, values: { ...values, name: 'Browser Blue Mug Variant Updated', sales_price: 25 } }) as any;
    expect(changed).toMatchObject({ id: created.id, name: 'Browser Blue Mug Variant Updated', sales_price: 25, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { product_id: 'ecommerce-product-mug', variant_id: created.id, current_company_name: 'My Company', expected_row_version: 1, values: { ...values, name: 'Stale Variant' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_VARIANT_STALE' });
    await expect(repository.executeMutation(remove.mutation, { product_id: 'ecommerce-product-mug', variant_id: created.id, current_company_name: 'Other Company', expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_VARIANT_STALE' });
    expect(await repository.executeMutation(remove.mutation, { product_id: 'ecommerce-product-mug', variant_id: created.id, current_company_name: 'My Company', expected_row_version: 2 })).toMatchObject({ deleted: true, id: created.id });
    expect((await repository.query('SELECT COUNT(*) AS count FROM ecommerce_product_variants WHERE id = ?', [created.id]))[0].count).toBe(0);
    database.close();
  });

  test('preserves variants across restart and applies a variant pricelist rule to a cart line', async () => {
    const databasePath = `/tmp/core3-ecommerce-product-variants-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_product_variants_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await firstRepository.query('SELECT name, sales_price FROM ecommerce_product_variants WHERE id = ?', ['ecommerce-variant-mug-blue'])).toEqual([{ name: 'Core3 Ceramic Mug (Blue)', sales_price: 20.5 }]);
      await firstRepository.query('UPDATE ecommerce_cart_lines SET variant_id = ?, variant_name = ? WHERE id = ?', ['ecommerce-variant-mug-blue', 'Core3 Ceramic Mug (Blue)', 'ecommerce-cart-line-001']);
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT variant_id, variant_name FROM ecommerce_cart_lines WHERE id = ?', ['ecommerce-cart-line-001'])).toEqual([{ variant_id: 'ecommerce-variant-mug-blue', variant_name: 'Core3 Ceramic Mug (Blue)' }]);
      const cartApi = yaml('api/cart.yaml');
      const apply = cartApi.actions.find((candidate: any) => candidate.id === 'apply_ecommerce_cart_pricelist');
      const cart = (await secondRepository.query('SELECT row_version FROM ecommerce_carts WHERE id = ?', ['ecommerce-cart-open-001']))[0] as { row_version: number };
      const switched = await secondRepository.executeMutation(apply.mutation, { id: 'ecommerce-cart-open-001', expected_row_version: cart.row_version, customer_scope: 'all', values: { pricelist_id: 'ecommerce-pricelist-retail' } }) as { row_version: number };
      await secondRepository.executeMutation(apply.mutation, { id: 'ecommerce-cart-open-001', expected_row_version: switched.row_version, customer_scope: 'all', values: { pricelist_id: 'ecommerce-pricelist-public' } });
      expect(await secondRepository.query('SELECT unit_price FROM ecommerce_cart_lines WHERE id = ?', ['ecommerce-cart-line-001'])).toEqual([{ unit_price: 19 }]);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});

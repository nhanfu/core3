import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('eCommerce Pricelist Rules parity', () => {
  test('traces the Odoo pricelist rule model and separates detail page/API contracts', () => {
    const page = yaml('pages/pricelist-detail.yaml');
    const api = yaml('api/pricelist-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'ecommerce-pricelist-detail', route: '/ecommerce/pricelists/detail' });
    expect(api.page).toEqual({ id: 'ecommerce-pricelist-detail' });
    expect(discovered.pageDatasources.get('ecommerce-pricelist-detail')).toEqual(expect.arrayContaining(['ecommerce_pricelist_detail', 'ecommerce_pricelist_rules']));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/ecommerce/pricelists/detail', page: 'ecommerce-pricelist-detail', module: 'ecommerce' })]));
    expect(page.components[1]).toMatchObject({ type: 'ListView', source: 'ecommerce_pricelist_rules', create_action: 'create_ecommerce_pricelist_rule' });
    expect(action(api, 'create_ecommerce_pricelist_rule').permission).toBe('ecommerce.write');
    expect(action(api, 'edit_ecommerce_pricelist_rule').permission).toBe('ecommerce.write');
    expect(action(api, 'delete_ecommerce_pricelist_rule').permission).toBe('ecommerce.write');
    expect(api.datasources.map((source: any) => source.id)).toEqual(expect.arrayContaining([
      'ecommerce_pricelist_rule_apply_on',
      'ecommerce_pricelist_rule_compute_price',
      'ecommerce_pricelist_rule_products',
      'ecommerce_pricelist_rule_categories',
    ]));
  });

  test('seeds durable Odoo rule fields, targets products, and declares read contract boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_pricelist_rules_contract', ['schema', 'data']);
    const api = yaml('api/pricelist-detail.yaml');
    const rules = api.datasources.find((source: any) => source.id === 'ecommerce_pricelist_rules');
    const rows = await repository.querySource(rules, { id: 'ecommerce-pricelist-retail', current_company_name: 'My Company' }, 0, 50);
    expect(rows.data).toMatchObject([{ applied_on: '1_product', product_id: 'ecommerce-product-chair', compute_price: 'fixed', fixed_price: 229 }]);
    expect(rows.data[0].row_version).toBe(1);
    expect((await repository.querySource(rules, { id: 'ecommerce-pricelist-retail', current_company_name: 'Other Company' }, 0, 50)).data).toEqual(rows.data);
    expect(api.datasources.find((source: any) => source.id === 'ecommerce_pricelist_rules').error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
    expect((await repository.querySource(api.datasources.find((source: any) => source.id === 'ecommerce_pricelist_rule_apply_on'), {}, 0, 20)).data).toHaveLength(4);
    database.close();
  });

  test('enforces permissioned rule CRUD, target/date/value validation, company scope, and stale writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_pricelist_rules_crud', ['schema', 'data']);
    const api = yaml('api/pricelist-detail.yaml');
    const create = action(api, 'create_ecommerce_pricelist_rule');
    const edit = action(api, 'edit_ecommerce_pricelist_rule');
    const remove = action(api, 'delete_ecommerce_pricelist_rule');
    const values = { applied_on: '1_product', apply_on: 'Browser Mug', product_id: 'ecommerce-product-mug', category_name: '', compute_price: 'percentage', base: 'list_price', fixed_price: 0, percent_price: 10, price_discount: 0, price_round: 0, price_surcharge: 0, price_min_margin: 0, price_max_margin: 0, base_pricelist_id: '', min_quantity: 2, date_start: '2026-10-01', date_end: '2026-12-31' };
    await expect(repository.executeMutation(create.mutation, { id: 'ecommerce-pricelist-retail', current_company_name: 'Other Company', parent_expected_row_version: 1, values })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PRICELIST_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { id: 'ecommerce-pricelist-retail', current_company_name: 'My Company', parent_expected_row_version: 1, values: { ...values, date_start: '2026-12-31', date_end: '2026-10-01' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRICELIST_RULE_DATES_INVALID' });
    await expect(repository.executeMutation(create.mutation, { id: 'ecommerce-pricelist-retail', current_company_name: 'My Company', parent_expected_row_version: 1, values: { ...values, applied_on: '2_product_category', product_id: '', category_name: 'Missing Category' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRICELIST_RULE_TARGET_INVALID' });
    const created = await repository.executeMutation(create.mutation, { id: 'ecommerce-pricelist-retail', current_company_name: 'My Company', parent_expected_row_version: 1, values });
    expect(created).toMatchObject({ pricelist_id: 'ecommerce-pricelist-retail', product_id: 'ecommerce-product-mug', compute_price: 'percentage', percent_price: 10, row_version: 1 });
    const changed = await repository.executeMutation(edit.mutation, { id: 'ecommerce-pricelist-retail', line_id: created.id, current_company_name: 'My Company', expected_row_version: 1, values: { ...values, apply_on: 'Browser Mug Updated', fixed_price: 16, compute_price: 'fixed' } });
    expect(changed).toMatchObject({ id: created.id, apply_on: 'Browser Mug Updated', compute_price: 'fixed', fixed_price: 16, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: 'ecommerce-pricelist-retail', line_id: created.id, current_company_name: 'My Company', expected_row_version: 1, values: { ...values, fixed_price: 12, compute_price: 'fixed' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRICELIST_RULE_STALE' });
    await expect(repository.executeMutation(remove.mutation, { id: 'ecommerce-pricelist-retail', line_id: created.id, current_company_name: 'Other Company', expected_row_version: 2 })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PRICELIST_COMPANY_SCOPE_REQUIRED' });
    const deleted = await repository.executeMutation(remove.mutation, { id: 'ecommerce-pricelist-retail', line_id: created.id, current_company_name: 'My Company', expected_row_version: 2 });
    expect(deleted).toMatchObject({ deleted: true, id: created.id });
    expect((await repository.query('SELECT COUNT(*) AS count FROM ecommerce_pricelist_rules WHERE id = ?', [created.id]))[0].count).toBe(0);
    database.close();
  });

  test('preserves rules across restart and applies fixed/percentage prices to cart lines', async () => {
    const databasePath = `/tmp/core3-ecommerce-pricelist-rules-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_pricelist_rules_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const firstDatabase = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(firstDatabase);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const api = yaml('api/pricelist-detail.yaml');
    const create = action(api, 'create_ecommerce_pricelist_rule');
    const created = await firstRepository.executeMutation(create.mutation, { id: 'ecommerce-pricelist-retail', current_company_name: 'My Company', parent_expected_row_version: 1, values: { applied_on: '1_product', apply_on: 'Restart Mug Discount', product_id: 'ecommerce-product-mug', category_name: '', compute_price: 'percentage', base: 'list_price', fixed_price: 0, percent_price: 10, price_discount: 0, price_round: 0, price_surcharge: 0, price_min_margin: 0, price_max_margin: 0, base_pricelist_id: '', min_quantity: 1, date_start: '', date_end: '' } });
    const createdId = created.id;
    expect(created).toMatchObject({ id: expect.any(String), row_version: 1 });
    firstDatabase.close();
    const secondDatabase = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(secondDatabase);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const row = await secondRepository.query('SELECT applied_on, product_id, compute_price, percent_price FROM ecommerce_pricelist_rules WHERE id = ?', [createdId]);
    expect(row).toEqual([{ applied_on: '1_product', product_id: 'ecommerce-product-mug', compute_price: 'percentage', percent_price: 10 }]);
    const cartApi = yaml('api/cart.yaml');
    const apply = cartApi.actions.find((candidate: any) => candidate.id === 'apply_ecommerce_cart_pricelist');
    await secondRepository.executeMutation(apply.mutation, { id: 'ecommerce-cart-open-001', expected_row_version: 1, customer_scope: 'all', values: { pricelist_id: 'ecommerce-pricelist-retail' } });
    expect(await secondRepository.query('SELECT unit_price FROM ecommerce_cart_lines WHERE product_id = ?', ['ecommerce-product-mug'])).toEqual([{ unit_price: 16.2 }]);
    secondDatabase.close();
  });
});

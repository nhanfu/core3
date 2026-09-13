import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('eCommerce private-route permission boundaries', () => {
  test('declares 401 and 403 contracts for every private catalog and order datasource', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_permission_contract_test', ['schema', 'data']);

    const cases = [
      ['api/products.yaml', 'ecommerce_products', 'ECOMMERCE_PRODUCTS_UNAUTHENTICATED', 'ECOMMERCE_PRODUCTS_FORBIDDEN', { q: null, published: null, company_name: null, fixture_state: null }],
      ['api/pricelists.yaml', 'ecommerce_pricelists', 'ECOMMERCE_PRICELISTS_UNAUTHENTICATED', 'ECOMMERCE_PRICELISTS_FORBIDDEN', { q: null, active: null, company_name: null, fixture_state: null }],
      ['api/order-detail.yaml', 'ecommerce_order_detail', 'ECOMMERCE_ORDER_DETAIL_UNAUTHENTICATED', 'ECOMMERCE_ORDER_DETAIL_FORBIDDEN', { id: 'ecommerce-order-001', customer_scope: 'all', current_user_email: null, fixture_state: null }],
      ['api/pricelist-detail.yaml', 'ecommerce_pricelist_detail', 'ECOMMERCE_PRICELIST_DETAIL_UNAUTHENTICATED', 'ECOMMERCE_PRICELIST_DETAIL_FORBIDDEN', { id: 'ecommerce-pricelist-retail', fixture_state: null }],
      ['api/pricelist-detail.yaml', 'ecommerce_pricelist_rules', 'ECOMMERCE_PRICELIST_RULES_UNAUTHENTICATED', 'ECOMMERCE_PRICELIST_RULES_FORBIDDEN', { id: 'ecommerce-pricelist-retail', fixture_state: null }],
    ] as const;

    for (const [file, sourceId, unauthorizedCode, forbiddenCode, params] of cases) {
      const source = yaml(file).datasources.find((candidate: any) => candidate.id === sourceId);
      expect(source.permission).toBe('ecommerce.read');
      expect(source.error_states.unauthorized).toMatchObject({ status: 401, code: unauthorizedCode });
      expect(source.error_states.forbidden).toMatchObject({ status: 403, code: forbiddenCode });
      await expect(repository.querySource(source, { ...params, fixture_state: 'unauthorized' }, 0, 50)).rejects.toMatchObject({ status: 401, code: unauthorizedCode });
      await expect(repository.querySource(source, { ...params, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: forbiddenCode });
    }

    database.close();
  });
});

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Accounting partner configuration parity', () => {
  test('keeps the layout and API fragments joined by page id', () => {
    const page = yaml('pages/partner-accounting.yaml');
    const api = yaml('api/partner-accounting.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const source = api.datasources.find((candidate: any) => candidate.id === 'accounting_partner_accounting');

    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'partner-accounting', route: '/accounting/partner-accounting' });
    expect(page.page.auth.require).toEqual(['accounting.read']);
    expect(api.page.id).toBe(page.page.id);
    expect(list.source).toBe(source.id);
    expect(list.columns.map((column: any) => column.field)).toEqual([
      'partner_name', 'partner_role', 'customer_payment_terms', 'vendor_payment_terms',
      'fiscal_position', 'company', 'state',
    ]);
    expect(source.permission).toBe('accounting.read');
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'ACCOUNTING_DATA_UNAVAILABLE' });
    expect(String(source.query)).toContain("fixture_state <> 'empty'");
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('partner-accounting')).toContain(source.id);
  });

  test('returns deterministic customer and vendor accounting defaults', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_partner_configuration_schema_migrations', ['schema', 'data']);
    const source = yaml('api/partner-accounting.yaml').datasources[0];

    const initial = await repository.querySource(source, { q: null, fixture_state: null }, 0, 50);
    expect(initial.data).toEqual([
      expect.objectContaining({ partner_name: 'Azure Interior', partner_role: 'Customer', customer_payment_terms: 'End of Following Month' }),
      expect.objectContaining({ partner_name: 'Gemini Furniture', partner_role: 'Customer' }),
      expect.objectContaining({ partner_name: 'Lumber Inc', partner_role: 'Vendor', vendor_payment_terms: 'Net 30' }),
      expect.objectContaining({ partner_name: 'Ready Mat', partner_role: 'Customer & Vendor', fiscal_position: 'Foreign Trade' }),
    ]);
    const searched = await repository.querySource(source, { q: 'Lumber', fixture_state: null }, 0, 50);
    expect(searched.data).toHaveLength(1);
    expect(searched.data[0]).toMatchObject({ partner_name: 'Lumber Inc', partner_role: 'Vendor' });
    const empty = await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50);
    expect(empty.data).toEqual([]);
  });
});

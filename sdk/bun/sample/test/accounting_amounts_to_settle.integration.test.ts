import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Accounting Amounts to Settle action parity', () => {
  test('keeps the source action contract and page/API boundary', () => {
    const page = yaml('pages/amounts-to-settle.yaml');
    expect(yaml('manifest.yaml').menu.groups[1].items).toContainEqual({ path: '/accounting/amounts-to-settle', label: 'Amounts to Settle', icon: 'ledger', permission: 'accounting.read' });
    expect(page.page).toMatchObject({ id: 'accounting-amounts-to-settle', route: '/accounting/amounts-to-settle' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list']);
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual(['Bill Date', 'Payment Date', 'Journal Entry', 'Partner', 'Reference', 'Label', 'Discount Amount', 'Residual']);
    expect(yaml('api/amounts-to-settle.yaml').page).toEqual({ id: page.page.id });
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('accounting-amounts-to-settle')).toContain('accounting_amounts_to_settle');
  });

  test('seeds only posted, due, reconcilable residuals and supports search', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'accounting_amounts_to_settle_test', ['schema', 'data']);
    const source = yaml('api/amounts-to-settle.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null }, 0, 50)).data).toHaveLength(3);
    expect((await repository.querySource(source, { q: 'Gemini' }, 0, 50)).data[0]).toMatchObject({ partner_name: 'Gemini Furniture', residual: 875.5 });
    expect((await repository.querySource(source, { q: 'missing' }, 0, 50)).data).toEqual([]);
    expect(source.permission).toBe('accounting.read');
    database.close();
  });
});

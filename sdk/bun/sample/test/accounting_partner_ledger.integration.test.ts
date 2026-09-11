import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Accounting Partner Ledger parity', () => {
  test('matches installed Odoo action 341 and keeps page/API ownership separated', () => {
    const page = yaml('pages/partner-ledger.yaml');
    const api = yaml('api/partner-ledger.yaml');
    const manifest = yaml('manifest.yaml');
    const reporting = manifest.menu.groups.find((group: any) => group.id === 'reporting');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const source = api.datasources.find((candidate: any) => candidate.id === 'accounting_partner_ledger');

    expect(reporting.items).toContainEqual({ path: '/accounting/reports/partner-ledger', label: 'Partner Ledger', icon: 'ledger', permission: 'accounting.read' });
    expect(page.title).toBe('Partner Ledger');
    expect(page.page).toMatchObject({ id: 'partner-ledger', route: '/accounting/reports/partner-ledger', auth: { require: ['accounting.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'partner-ledger' });
    expect(list).toMatchObject({ source: 'accounting_partner_ledger', view_navigation: 'tabs' });
    expect(list.default_filters).toEqual({ status: 'Posted', residual_scope: 'with_residual', account_scope: 'payable_receivable' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'pivot', 'graph']);
    expect(list.columns.map((column: any) => column.field)).toEqual(['partner_display', 'debit_display', 'credit_display', 'due_date', 'balance_display', 'matching']);
    expect(source.permission).toBe('accounting.read');
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'ACCOUNTING_DATA_UNAVAILABLE' });
    expect(source.pivot.fields).toEqual(['partner_name', 'entry_count', 'debit', 'credit', 'balance']);
    expect(String(source.query)).toContain(':fixture_state');
    expect(String(source.query)).toContain(':residual_scope');
    expect(readFileSync(join(serviceRoot, 'migrations/20260911220000-027-accounting-partner-ledger.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);

    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('partner-ledger')).toEqual(['accounting_partner_ledger']);
  });

  test('seeds observed Odoo totals, supports search/filter/empty/error, and is idempotent', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'accounting_partner_ledger_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'accounting_partner_ledger_migrations', ['schema', 'data']);
    const source = yaml('api/partner-ledger.yaml').datasources[0];
    const params = { q: null, status: 'Posted', residual_scope: 'with_residual', account_scope: 'payable_receivable', fixture_state: null };

    const initial = await repository.querySource(source, params, 0, 50);
    expect(initial.data).toHaveLength(6);
    expect(initial.data[0]).toMatchObject({ partner_name: 'Acme Corporation', entry_count: 7, debit: 100875, credit: 54625, balance: 46250, partner_display: 'Acme Corporation (7)' });
    expect(initial.data.find((row: any) => row.partner_name === 'Gemini Furniture')).toMatchObject({ credit: 622.27, balance: -622.27 });

    const searched = await repository.querySource(source, { ...params, q: 'Ready Mat' }, 0, 50);
    expect(searched.data).toHaveLength(1);
    expect(searched.data[0]).toMatchObject({ partner_name: 'Ready Mat', entry_count: 2 });
    const filtered = await repository.querySource(source, { ...params, residual_scope: 'without_residual' }, 0, 50);
    expect(filtered.data).toEqual([]);
    const empty = await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50);
    expect(empty.data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'ACCOUNTING_DATA_UNAVAILABLE' });
  });
});

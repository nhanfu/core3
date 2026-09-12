import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
const root = join(import.meta.dir, '../services/accounting');
const yaml = (name: string) => Bun.YAML.parse(readFileSync(join(root, name), 'utf8')) as any;
describe('Accounting Cash Registers action parity', () => {
  test('binds the cash action page and API by page id', () => {
    const page = yaml('pages/cash-registers.yaml'); const api = yaml('api/cash-registers.yaml'); const detail = yaml('pages/cash-register-detail.yaml'); const detailApi = yaml('api/cash-register-detail.yaml');
    expect(page.datasources).toBeUndefined(); expect(page.actions).toBeUndefined(); expect(api.page.id).toBe(page.page.id); expect(detailApi.page.id).toBe(detail.page.id); expect(page.components[0].views.map((v: any) => v.label)).toEqual(['List', 'Pivot', 'Graph']); expect(api.datasources[0].pivot.fields).toEqual(['statement_month', 'starting_balance', 'ending_balance']);
    const discovered = discoverPages(join(import.meta.dir, '..')); expect(discovered.pageDatasources.get('accounting-cash-registers')).toContain('accounting_cash_registers'); expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/accounting/cash-registers', page: 'accounting-cash-registers', module: 'accounting' }), expect.objectContaining({ path: '/accounting/cash-register-detail', page: 'accounting-cash-register-detail', module: 'accounting' })]));
  });
  test('seeds deterministic cash rows and error/search states', async () => {
    const db = await DuckDbDatabase.open(':memory:'); const repo = new YamlRepository(db); await migrateDatabase(repo, join(root, 'migrations'), undefined, 'accounting_cash_registers_states', ['schema', 'data']);
    const source = yaml('api/cash-registers.yaml').datasources[0]; const rows = await repo.querySource(source, { q: null, fixture_state: null, statement_filter: null }, 0, 50); expect(rows.data.map((r: any) => r.reference)).toEqual(['Cash Register - 2026-08-11', 'Cash Register - 2026-08-10']); expect((await repo.querySource(source, { q: 'Furn.', fixture_state: null, statement_filter: null }, 0, 50)).data).toHaveLength(1); expect((await repo.querySource(source, { q: null, fixture_state: 'empty', statement_filter: null }, 0, 50)).data).toEqual([]); await expect(repo.querySource(source, { q: null, fixture_state: 'transport_error', statement_filter: null }, 0, 50)).rejects.toMatchObject({ status: 503 }); expect(yaml('manifest.yaml').menu.groups.flatMap((g: any) => g.items).some((i: any) => i.path === '/accounting/cash-registers')).toBe(true); db.close();
  });
});

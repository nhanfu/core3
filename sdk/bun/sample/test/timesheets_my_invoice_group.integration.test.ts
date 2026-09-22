import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const valid = {
  q: null,
  state: null,
  work_date: null,
  fixture_state: null,
  current_user_name: 'Admin User',
  current_company_name: 'Core3 Demo Company',
};

describe('Timesheets My Timesheets Invoice grouping parity', () => {
  test('maps the Odoo Invoice group-by to the My Timesheets page/API pair', () => {
    const page = yaml('pages/entries.yaml');
    const api = yaml('api/entries.yaml');
    const list = page.components.find((item: any) => item.type === 'ListView');
    const source = api.datasources.find((item: any) => item.id === 'timesheet_entries');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/sale_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(odoo).toContain('<filter string="Invoice" name="groupby_invoice" domain="[]"');
    expect(odoo).toContain("context=\"{'group_by': 'timesheet_invoice_id'}\"");
    expect(odoo).toContain('groups="sales_team.group_sale_salesman"');
    expect(page.page).toMatchObject({ id: 'timesheets', route: '/timesheets', auth: { require: ['timesheets.read'] } });
    expect(api.page).toEqual({ id: 'timesheets' });
    expect(page.datasources).toBeUndefined();
    expect(list.group_by).toContainEqual({ field: 'invoice_name', label: 'Invoice' });
    expect(source.pivot.fields).toEqual(expect.arrayContaining(['invoice_id', 'invoice_name']));
    expect(source.meta.group_by_contracts).toContainEqual({ field: 'invoice_name', label: 'Invoice', source: 'timesheet_entries.invoice_id' });
    expect(String(source.query)).toContain('t.invoice_id');
    expect(String(source.query)).toContain('t.invoice_name');
  });

  test('groups durable invoices while preserving actor, company, and empty guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_my_invoice_group', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');

    const result = await repository.querySource(source, valid, 0, 50);
    const groups = result.data.reduce((counts: Record<string, number>, row: any) => {
      const key = row.invoice_name ?? '(No Invoice)';
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
    expect(groups).toEqual({
      'INV/2026/0001': 2,
      'INV/2026/0002': 2,
      'INV/2026/0003': 2,
      '(No Invoice)': 4,
    });
    expect(result.data.every((row: any) => row.employee_name === 'Admin User')).toBe(true);
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('reflects a persisted invoice relation change in the next grouping read', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_my_invoice_group_concurrency', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');

    expect((await repository.querySource(source, valid, 0, 50)).data.find((row: any) => row.id === 'timesheet-my-012')).toMatchObject({ invoice_id: null, invoice_name: null });
    await repository.query("UPDATE timesheet_entries SET invoice_id = 'invoice-demo-004', invoice_name = 'INV/2026/0004', row_version = row_version + 1 WHERE id = 'timesheet-my-012'");
    expect((await repository.querySource(source, valid, 0, 50)).data.find((row: any) => row.id === 'timesheet-my-012')).toMatchObject({ invoice_id: 'invoice-demo-004', invoice_name: 'INV/2026/0004' });
    database.close();
  });

  test('retains Invoice grouping after migration replay and file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-my-invoice-group-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_my_invoice_group_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_my_invoice_group_restart', ['schema', 'data']);
      const before = await repository.querySource(source, valid, 0, 50);
      expect(source.permission).toBe('timesheets.read');
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      const after = await reopened.querySource(source, valid, 0, 50);
      expect(after.data.map((row: any) => [row.id, row.invoice_id, row.invoice_name])).toEqual(before.data.map((row: any) => [row.id, row.invoice_id, row.invoice_name]));
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

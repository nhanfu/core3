import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const valid = { q: null, work_date: null, fixture_state: null, current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company' };

describe('Timesheets portal date filtering parity', () => {
  test('maps Odoo portal filter choices to a separate page/API contract', () => {
    const page = yaml('pages/portal-timesheets.yaml');
    const api = yaml('api/portal-timesheets.yaml');
    const controller = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/controllers/portal.py', 'utf8');
    const dateFilter = page.components[0].filters.find((filter: any) => filter.field === 'work_date');
    const source = api.datasources.find((candidate: any) => candidate.id === 'portal_timesheet_entries');

    expect(controller).toContain("'last_year': {'label': _('Last Year'");
    expect(controller).toContain("'last_quarter': {'label': _('Last Quarter'");
    expect(controller).toContain("'last_month': {'label': _('Last Month'");
    expect(controller).toContain("'month': {'label': _('This Month'");
    expect(controller).toContain("'quarter': {'label': _('This Quarter'");
    expect(controller).toContain("'year': {'label': _('This Year'");
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'timesheets-portal' });
    expect(api.datasources.map((candidate: any) => candidate.id)).toContain('portal_timesheet_entries');
    expect(dateFilter.options.map((option: any) => option.id)).toEqual(['all', 'today', 'this_week', 'last_week', 'this_month', 'last_month', 'this_quarter', 'last_quarter', 'this_year', 'last_year']);
    expect(source).toMatchObject({ id: 'portal_timesheet_entries', permission: 'timesheets.read' });
    expect(source.query).toContain(":work_date = 'last_month'");
    expect(source.query).toContain(":work_date = 'this_quarter'");
    expect(source.query).toContain("COALESCE(:work_date, '') IN ('', 'all')");
  });

  test('filters durable portal rows against deterministic Odoo date windows', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_portal_filtering', ['schema', 'data']);
    const source = yaml('api/portal-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'portal_timesheet_entries');
    const all = await repository.querySource(source, { ...valid, work_date: 'all' }, 0, 100);
    const thisMonth = await repository.querySource(source, { ...valid, work_date: 'this_month' }, 0, 100);
    const thisQuarter = await repository.querySource(source, { ...valid, work_date: 'this_quarter' }, 0, 100);
    const thisYear = await repository.querySource(source, { ...valid, work_date: 'this_year' }, 0, 100);
    const lastMonth = await repository.querySource(source, { ...valid, work_date: 'last_month' }, 0, 100);
    const lastQuarter = await repository.querySource(source, { ...valid, work_date: 'last_quarter' }, 0, 100);

    expect(all.meta.total).toBe(10);
    expect(thisMonth.data.map((row: any) => row.id)).toEqual(all.data.map((row: any) => row.id));
    expect(thisQuarter.data.map((row: any) => row.id)).toEqual(all.data.map((row: any) => row.id));
    expect(thisYear.data.map((row: any) => row.id)).toEqual(all.data.map((row: any) => row.id));
    expect(lastMonth.data).toEqual([]);
    expect(lastQuarter.data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, work_date: 'today', q: 'Migration' }, 0, 100)).data.map((row: any) => row.id)).toEqual(['timesheet-demo-001']);
    expect((await repository.querySource(source, { ...valid, work_date: 'this_week' }, 0, 100)).data.every((row: any) => row.work_date >= '2026-01-12' && row.work_date <= '2026-01-18')).toBe(true);
    database.close();
  });

  test('preserves filtering after file restart and retains permission/company/stale guards', async () => {
    const path = `/tmp/timesheets-portal-filtering-${process.pid}.duckdb`;
    const migrations = join(serviceRoot, 'migrations');
    const first = await DuckDbDatabase.open(path);
    const repository = new YamlRepository(first);
    await migrateDatabase(repository, migrations, undefined, 'timesheets_portal_filtering_restart', ['schema', 'data']);
    const source = yaml('api/portal-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'portal_timesheet_entries');
    const filtered = await repository.querySource(source, { ...valid, work_date: 'this_month' }, 0, 100);
    expect(filtered.data).toHaveLength(10);
    expect((await repository.querySource(source, { ...valid, current_user_name: 'Unauthorized User', work_date: 'this_month' }, 0, 100)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company', work_date: 'this_month' }, 0, 100)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty', work_date: 'this_month' }, 0, 100)).data).toEqual([]);
    first.close();

    const restarted = await DuckDbDatabase.open(path);
    const reopened = new YamlRepository(restarted);
    await migrateDatabase(reopened, migrations, undefined, 'timesheets_portal_filtering_restart', ['schema', 'data']);
    expect((await reopened.querySource(source, { ...valid, work_date: 'this_month' }, 0, 100)).data).toHaveLength(10);
    const update = yaml('api/entry-detail.yaml').actions.find((action: any) => action.id === 'edit_timesheet_detail').mutation;
    await expect(reopened.executeMutation(update, {
      id: 'timesheet-my-009', expected_row_version: 99, current_company_name: 'Core3 Demo Company', current_user_name: 'Admin User',
      values: { work_date: '2026-01-15', project_name: 'Core3 Implementation', description: 'Stale portal filter edit', hours: 2 },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    restarted.close();
  });

  test('keeps the portal query deterministic and read-only', () => {
    const page = yaml('pages/portal-timesheets.yaml');
    const api = yaml('api/portal-timesheets.yaml');
    expect(page.page.auth.require).toEqual(['timesheets.read']);
    expect(api.datasources[0].permission).toBe('timesheets.read');
    expect(api.actions[0].permission).toBe('timesheets.read');
    expect(readFileSync(join(serviceRoot, 'api/portal-timesheets.yaml'), 'utf8')).not.toMatch(/CURRENT_DATE|CURRENT_TIMESTAMP|RANDOM\(|gen_random_uuid|Date\.now/);
  });
});

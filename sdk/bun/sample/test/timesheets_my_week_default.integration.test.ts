import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const valid = { current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company', q: null, state: null, work_date: 'this_week', fixture_state: null };

describe('Timesheets My Timesheets default week parity', () => {
  test('maps the Odoo week action context to the separate page/API pair', () => {
    const page = yaml('pages/entries.yaml');
    const api = yaml('api/entries.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'timesheet_entries');
    const detail = yaml('api/entry-detail.yaml');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(page.page).toMatchObject({ id: 'timesheets', route: '/timesheets', auth: { require: ['timesheets.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'timesheets' });
    expect(page.components[0].default_filters).toEqual({ work_date: 'this_week' });
    expect(String(source.query)).toContain("t.work_date BETWEEN DATE '2026-01-12' AND DATE '2026-01-18'");
    expect(source.permission).toBe('timesheets.read');
    expect(detail.actions.find((action: any) => action.id === 'edit_timesheet_detail').mutation.concurrency).toEqual({ required: true });
    expect(odoo).toContain('<record id="act_hr_timesheet_line" model="ir.actions.act_window">');
    expect(odoo).toContain('<field name="path">timesheets</field>');
    expect(odoo).toContain("'search_default_week':1");
    expect(odoo).toContain('"is_my_timesheets": 1');
  });

  test('returns only the deterministic current-week rows for the active actor and company', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_my_week_default', ['schema', 'data']);
      const source = yaml('api/entries.yaml').datasources.find((candidate: any) => candidate.id === 'timesheet_entries');
      const result = await repository.querySource(source, valid, 0, 100);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((row: any) => row.work_date >= '2026-01-12' && row.work_date <= '2026-01-18')).toBe(true);
      expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 100)).data).toEqual([]);
      expect((await repository.querySource(source, { ...valid, current_user_name: 'Unknown User' }, 0, 100)).data).toEqual([]);
    } finally {
      database.close();
    }
  });

  test('keeps the read/write boundary and stale detail guard explicit', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_my_week_guards', ['schema', 'data']);
      const api = yaml('api/entries.yaml');
      const detail = yaml('api/entry-detail.yaml');
      expect(api.datasources.find((source: any) => source.id === 'timesheet_entries').permission).toBe('timesheets.read');
      expect(api.actions.find((action: any) => action.id === 'create_timesheet_entry').permission).toBe('timesheets.write');
      const edit = detail.actions.find((action: any) => action.id === 'edit_timesheet_detail');
      await expect(repository.executeMutation(edit.mutation, {
        id: 'timesheet-my-009',
        expected_row_version: 99,
        current_user_name: 'Admin User',
        current_company_name: 'Core3 Demo Company',
        values: { work_date: '2026-01-15', project_name: 'Core3 Implementation', description: 'stale write', hours: 2 },
      })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    } finally {
      database.close();
    }
  });

  test('preserves the default-week result through migration replay and file restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-week-'));
    const path = join(directory, 'timesheets.duckdb');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      const migrations = join(serviceRoot, 'migrations');
      await migrateDatabase(repository, migrations, undefined, 'timesheets_my_week_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_my_week_restart', ['schema', 'data']);
      const source = yaml('api/entries.yaml').datasources.find((candidate: any) => candidate.id === 'timesheet_entries');
      const before = await repository.querySource(source, valid, 0, 100);
      first.close();
      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      const after = await reopened.querySource(source, valid, 0, 100);
      expect(after.data.map((row: any) => row.id)).toEqual(before.data.map((row: any) => row.id));
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

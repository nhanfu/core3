import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const params = { q: null, state: null, work_date: 'this_week', fixture_state: null };

async function openTimesheets(name: string, path = ':memory:') {
  const database = await DuckDbDatabase.open(path);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
}

describe('Timesheets All Timesheets default week action', () => {
  test('maps Odoo timesheet_action_all week context to the separate page/API pair', () => {
    const page = yaml('pages/all-timesheets.yaml');
    const api = yaml('api/all-timesheets.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'all_timesheet_entries');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(page.page).toMatchObject({ id: 'all-timesheets', route: '/all-timesheets', auth: { require: ['timesheets.manage'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'all-timesheets' });
    expect(page.components[0].default_filters).toEqual({ work_date: 'this_week' });
    expect(source.permission).toBe('timesheets.manage');
    expect(String(source.query)).toContain("t.work_date BETWEEN DATE '2026-01-12' AND DATE '2026-01-18'");
    expect(odoo).toContain('<record id="timesheet_action_all" model="ir.actions.act_window">');
    expect(odoo).toContain('<field name="path">all-timesheets</field>');
    expect(odoo).toContain("'search_default_week':1");
  });

  test('returns only the deterministic current-week rows for the approver scope', async () => {
    const { database, repository } = await openTimesheets('timesheets_all_week_default');
    try {
      const source = yaml('api/all-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'all_timesheet_entries');
      const result = await repository.querySource(source, params, 0, 50);
      expect(result.data.length).toBe(7);
      expect(result.data.every((row: any) => row.work_date >= '2026-01-12' && row.work_date <= '2026-01-18')).toBe(true);
      expect((await repository.querySource(source, { ...params, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
      expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    } finally {
      database.close();
    }
  });

  test('keeps the manager permission and transport error boundary explicit', async () => {
    const { database, repository } = await openTimesheets('timesheets_all_week_default_guards');
    try {
      const api = yaml('api/all-timesheets.yaml');
      const source = api.datasources.find((candidate: any) => candidate.id === 'all_timesheet_entries');
      expect(source.permission).toBe('timesheets.manage');
      expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'TIMESHEETS_ALL_ENTRIES_UNAVAILABLE' });
      await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'TIMESHEETS_ALL_ENTRIES_UNAVAILABLE' });
    } finally {
      database.close();
    }
  });

  test('preserves the default-week result through migration replay and file restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-all-week-'));
    const path = join(directory, 'timesheets.duckdb');
    try {
      const first = await openTimesheets('timesheets_all_week_default_restart', path);
      const source = yaml('api/all-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'all_timesheet_entries');
      const before = await first.repository.querySource(source, params, 0, 50);
      await migrateDatabase(first.repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_all_week_default_restart', ['schema', 'data']);
      first.database.close();
      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      const after = await reopened.querySource(source, params, 0, 50);
      expect(after.data.map((row: any) => row.id)).toEqual(before.data.map((row: any) => row.id));
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

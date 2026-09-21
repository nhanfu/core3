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
  current_user_name: 'Admin User',
  current_company_name: 'Core3 Demo Company',
  fixture_state: null,
};

describe('Timesheets favorite project prefill parity', () => {
  test('maps Odoo default_get to separate page/API source-backed New Timesheet contracts', () => {
    const page = yaml('pages/entries.yaml');
    const api = yaml('api/entries.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'create_timesheet_entry');
    const source = api.datasources.find((candidate: any) => candidate.id === 'timesheet_entry_defaults');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/models/hr_timesheet.py', 'utf8');

    expect(page.page).toMatchObject({ id: 'timesheets', route: '/timesheets' });
    expect(api.page).toEqual({ id: 'timesheets' });
    expect(page.components[0].header_actions).toContainEqual({ id: 'create_timesheet_entry', label: 'New Timesheet', permission: 'timesheets.write', variant: 'primary' });
    expect(action).toMatchObject({ type: 'server_form', permission: 'timesheets.write', prefill: 'source', prefill_source: 'timesheet_entry_defaults' });
    expect(source).toMatchObject({ id: 'timesheet_entry_defaults', single: true, permission: 'timesheets.write' });
    expect(String(source.query)).toContain('ROW_NUMBER() OVER');
    expect(String(source.query)).toContain('recent_rank <= 5');
    expect(odoo).toContain('def _get_favorite_project_id');
    expect(odoo).toContain('limit=5');
    expect(odoo).toContain("result['project_id'] = favorite_project_id");
  });

  test('derives the mode of the active employee recent projects and fails closed by scope', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_favorite_project', ['schema', 'data']);
      const source = yaml('api/entries.yaml').datasources.find((candidate: any) => candidate.id === 'timesheet_entry_defaults');

      expect((await repository.querySource(source, valid, 0, 1)).data).toMatchObject({ project_id: 'project-demo-001', project_name: 'Core3 Implementation' });
      await repository.query("UPDATE timesheet_entries SET project_id = CASE id WHEN 'timesheet-my-009' THEN 'project-demo-002' WHEN 'timesheet-my-010' THEN 'project-demo-002' WHEN 'timesheet-my-011' THEN 'project-demo-001' WHEN 'timesheet-my-013' THEN 'project-demo-002' WHEN 'timesheet-my-015' THEN 'project-demo-001' ELSE project_id END, work_date = CASE id WHEN 'timesheet-my-009' THEN DATE '2026-02-05' WHEN 'timesheet-my-010' THEN DATE '2026-02-04' WHEN 'timesheet-my-011' THEN DATE '2026-02-03' WHEN 'timesheet-my-013' THEN DATE '2026-02-02' WHEN 'timesheet-my-015' THEN DATE '2026-02-01' ELSE work_date END WHERE id IN ('timesheet-my-009', 'timesheet-my-010', 'timesheet-my-011', 'timesheet-my-013', 'timesheet-my-015')");
      expect((await repository.querySource(source, valid, 0, 1)).data).toMatchObject({ project_id: 'project-demo-002', project_name: 'Customer Delivery' });
      expect((await repository.querySource(source, { ...valid, current_user_name: 'Morgan Taylor' }, 0, 1)).data).toMatchObject({ project_id: 'project-demo-001', project_name: 'Core3 Implementation' });
      expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
      expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    } finally {
      database.close();
    }
  });

  test('retains the durable favorite after migration replay and file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-favorite-project-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const source = yaml('api/entries.yaml').datasources.find((candidate: any) => candidate.id === 'timesheet_entry_defaults');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_favorite_project_restart', ['schema', 'data']);
      await repository.query("UPDATE timesheet_entries SET project_id = 'project-demo-002', work_date = DATE '2026-03-01' WHERE id = 'timesheet-my-009'");
      const before = await repository.querySource(source, valid, 0, 1);
      expect(before.data).toMatchObject({ project_id: 'project-demo-002' });
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_favorite_project_restart', ['schema', 'data']);
      const after = await reopened.querySource(source, valid, 0, 1);
      expect(after.data).toMatchObject({ project_id: 'project-demo-002', project_name: 'Customer Delivery' });
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

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
  employee_id: null,
  project_id: 'project-demo-001',
  state: null,
  work_date: null,
  fixture_state: null,
  current_user_name: 'Admin User',
  current_company_name: 'Core3 Demo Company',
};

describe('Timesheets All Timesheets Project filter parity', () => {
  test('maps the Odoo Project search field to paired page/API contracts', () => {
    const page = yaml('pages/all-timesheets.yaml');
    const api = yaml('api/all-timesheets.yaml');
    const list = page.components.find((item: any) => item.type === 'ListView');
    const source = api.datasources.find((item: any) => item.id === 'all_timesheet_entries');
    const projects = api.datasources.find((item: any) => item.id === 'all_timesheet_projects');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(odoo).toContain('<field name="project_id"/>');
    expect(odoo).toContain('<record id="timesheet_action_all" model="ir.actions.act_window">');
    expect(page.page).toMatchObject({ id: 'all-timesheets', route: '/all-timesheets', auth: { require: ['timesheets.manage'] } });
    expect(api.page).toEqual({ id: 'all-timesheets' });
    expect(list.filters).toContainEqual({ field: 'project_id', label: 'Project', options_source: 'all_timesheet_projects' });
    expect(projects).toMatchObject({ id: 'all_timesheet_projects', permission: 'timesheets.manage' });
    expect(source).toMatchObject({ id: 'all_timesheet_entries', permission: 'timesheets.manage', workflow: 'timesheet_entries' });
    expect(String(source.query)).toContain('(:project_id IS NULL OR t.project_id = :project_id)');
  });

  test('filters durable rows by project and preserves project options, company, and empty guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_all_project_filter', ['schema', 'data']);
    const api = yaml('api/all-timesheets.yaml');
    const source = api.datasources.find((item: any) => item.id === 'all_timesheet_entries');
    const projects = api.datasources.find((item: any) => item.id === 'all_timesheet_projects');

    const filtered = await repository.querySource(source, valid, 0, 50);
    expect(filtered.data.length).toBeGreaterThan(0);
    expect(filtered.data.every((row: any) => row.project_id === 'project-demo-001')).toBe(true);
    expect(new Set(filtered.data.map((row: any) => row.project_name))).toEqual(new Set(['Core3 Implementation']));
    expect((await repository.querySource(source, { ...valid, project_id: 'project-demo-002' }, 0, 50)).data.every((row: any) => row.project_id === 'project-demo-002')).toBe(true);

    const options = await repository.querySource(projects, { current_company_name: 'Core3 Demo Company' }, 0, 50);
    expect(options.data.map((row: any) => row.value)).toEqual(['project-demo-001', 'project-demo-002']);
    expect((await repository.querySource(projects, { current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('retains the project filter after a file-backed restart and keeps the manager permission', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-all-project-filter-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const source = yaml('api/all-timesheets.yaml').datasources.find((item: any) => item.id === 'all_timesheet_entries');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_all_project_filter_restart', ['schema', 'data']);
      expect(source.permission).toBe('timesheets.manage');
      expect((await repository.querySource(source, valid, 0, 50)).data.every((row: any) => row.project_id === 'project-demo-001')).toBe(true);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_all_project_filter_restart', ['schema', 'data']);
      const filtered = await reopened.querySource(source, valid, 0, 50);
      expect(filtered.data.length).toBeGreaterThan(0);
      expect(filtered.data.every((row: any) => row.project_id === 'project-demo-001')).toBe(true);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

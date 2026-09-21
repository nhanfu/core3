import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const context = { project_id: 'project-demo-001', current_company_name: 'Core3 Demo Company', fixture_state: null };

describe('Timesheets project-context default parity', () => {
  test('maps the Odoo project action context to separate page/API source-prefilled create contracts', () => {
    const page = yaml('pages/project-timesheets.yaml');
    const api = yaml('api/project-timesheets.yaml');
    const projectPage = yaml('../project/pages/project-detail.yaml');
    const projectApi = yaml('../project/api/project-detail.yaml');
    const create = api.actions.find((candidate: any) => candidate.id === 'create_project_timesheet_entry');
    const defaults = api.datasources.find((candidate: any) => candidate.id === 'project_timesheet_entry_defaults');
    const odooModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/models/project_project.py', 'utf8');
    const odooView = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');

    expect(page.page).toMatchObject({ id: 'project-timesheets', route: '/project-timesheets' });
    expect(api.page).toEqual({ id: 'project-timesheets' });
    expect(page).not.toHaveProperty('datasources');
    expect(projectPage.components[0].action_menu.actions).toContainEqual(expect.objectContaining({ id: 'open_project_timesheets', permission: 'timesheets.read' }));
    expect(projectApi.actions).toContainEqual(expect.objectContaining({ id: 'open_project_timesheets', navigate_to: '/project-timesheets', params: { project_id: '{state.id}' } }));
    expect(create).toMatchObject({ type: 'server_form', permission: 'timesheets.write', prefill: 'source', prefill_source: 'project_timesheet_entry_defaults', params: { context_project_id: '{state.project_id}' } });
    expect(defaults).toMatchObject({ id: 'project_timesheet_entry_defaults', single: true, permission: 'timesheets.write' });
    expect(String(defaults.query)).toContain('allow_timesheets');
    expect(create.mutation.fields).toContain('company_name');
    expect(odooModel).toContain('def action_project_timesheets');
    expect(odooView).toContain('"default_project_id": active_id');
    expect(odooView).toContain('act_hr_timesheet_line_by_project');
  });

  test('resolves only an active timesheetable project in the current company', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_project_context_default', ['schema', 'data']);
      const defaults = yaml('api/project-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'project_timesheet_entry_defaults');

      expect(await repository.querySource(defaults, context, 0, 1)).toMatchObject({ data: { project_id: 'project-demo-001', project_name: 'Core3 Implementation', company_name: 'Core3 Demo Company' } });
      expect((await repository.querySource(defaults, { ...context, project_id: 'project-demo-closed' }, 0, 1)).data).toEqual({});
      expect((await repository.querySource(defaults, { ...context, current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
      expect((await repository.querySource(defaults, { ...context, fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    } finally {
      database.close();
    }
  });

  test('creates a durable project-context entry and rejects stale project or company values', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_project_context_mutation', ['schema', 'data']);
      const create = yaml('api/project-timesheets.yaml').actions.find((candidate: any) => candidate.id === 'create_project_timesheet_entry').mutation;
      const values = {
        name: 'TS/2026/PROJECT-CONTEXT', employee_id: 'employee-demo-001', employee_name: 'Admin User',
        project_id: 'project-demo-001', project_name: 'Core3 Implementation', work_date: '2026-01-15',
        description: 'Project context default', hours: 2, current_company_name: 'Core3 Demo Company', context_project_id: 'project-demo-001',
      };

      expect(await repository.executeMutation(create, { id: 'timesheet-project-context', values })).toMatchObject({ id: 'timesheet-project-context', project_id: 'project-demo-001', company_name: 'Core3 Demo Company', state: 'Draft' });
      await expect(repository.executeMutation(create, { id: 'timesheet-project-context-foreign', values: { ...values, name: 'TS/2026/PROJECT-CONTEXT-FOREIGN', project_id: 'project-demo-002', project_name: 'Customer Delivery' } })).rejects.toMatchObject({ status: 403, code: 'PROJECT_TIMESHEET_CONTEXT_SCOPE' });
      await expect(repository.executeMutation(create, { id: 'timesheet-project-context-company', values: { ...values, name: 'TS/2026/PROJECT-CONTEXT-COMPANY', current_company_name: 'Other Company' } })).rejects.toMatchObject({ status: 403, code: 'PROJECT_TIMESHEET_PROJECT_SCOPE' });
    } finally {
      database.close();
    }
  });

  test('keeps project defaults and created data after migration replay and file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-project-context-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const defaults = yaml('api/project-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'project_timesheet_entry_defaults');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_project_context_restart', ['schema', 'data']);
      const before = await repository.querySource(defaults, context, 0, 1);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_project_context_restart', ['schema', 'data']);
      expect(await reopened.querySource(defaults, context, 0, 1)).toEqual(before);
      expect((await reopened.query("SELECT COUNT(*) AS count FROM timesheet_entries WHERE project_id = 'project-demo-001' AND company_name = 'Core3 Demo Company'")).at(0)?.count).toBeGreaterThan(0);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

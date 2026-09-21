import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const sampleRoot = join(import.meta.dir, '..');
const serviceRoot = join(sampleRoot, 'services/timesheets');
const yaml = (root: string, file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const valid = {
  project_id: 'project-demo-001',
  project_ids: 'project-demo-001,project-demo-002',
  current_company_name: 'Core3 Demo Company',
  fixture_state: null,
  q: null,
  state: null,
  work_date: null,
};

describe('Timesheets project multi-context action parity', () => {
  test('maps Odoo active_ids project action to the existing page/API pair', () => {
    const page = yaml(serviceRoot, 'pages/project-timesheets.yaml');
    const api = yaml(serviceRoot, 'api/project-timesheets.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');
    const projectScope = api.datasources.find((candidate: any) => candidate.id === 'project_timesheet_scope');
    const create = api.actions.find((candidate: any) => candidate.id === 'create_project_timesheet_entry');

    expect(page.page).toMatchObject({ id: 'project-timesheets', route: '/project-timesheets' });
    expect(page).not.toHaveProperty('datasources');
    expect(api.page).toEqual({ id: 'project-timesheets' });
    expect(source).toContain('<record id="timesheet_action_project" model="ir.actions.act_window">');
    expect(source).toContain("[('project_id', 'in', active_ids)]");
    expect(source).toContain("'is_timesheet': 1");
    expect(projectScope).toMatchObject({ id: 'project_timesheet_scope', single: true, permission: 'timesheets.read' });
    expect(projectScope.query).toContain('string_split');
    expect(create.params).toEqual({ context_project_id: '{state.project_id}', context_project_ids: '{state.project_ids}' });
    expect(create.mutation.guards).toContainEqual(expect.objectContaining({ code: 'PROJECT_TIMESHEET_MULTI_CONTEXT_SCOPE' }));
  });

  test('reads a deterministic multi-project scope only from active current-company projects', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_project_multi_scope', ['schema', 'data']);
      const api = yaml(serviceRoot, 'api/project-timesheets.yaml');
      const entries = api.datasources.find((candidate: any) => candidate.id === 'project_timesheet_entries');
      const scope = api.datasources.find((candidate: any) => candidate.id === 'project_timesheet_scope');

      const rows = await repository.querySource(entries, valid, 0, 50);
      expect(rows.data.length).toBeGreaterThan(8);
      expect(new Set(rows.data.map((row: any) => row.project_id))).toEqual(new Set(['project-demo-001', 'project-demo-002']));
      expect(await repository.querySource(scope, valid, 0, 1)).toMatchObject({ data: { project_ids: 'project-demo-001,project-demo-002', project_count: 2 } });
      expect((await repository.querySource(entries, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
      expect((await repository.querySource(entries, { ...valid, project_ids: 'project-demo-closed' }, 0, 50)).data).toEqual([]);
      expect((await repository.querySource(scope, { ...valid, fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    } finally {
      database.close();
    }
  });

  test('persists a selected project inside a multi-project context and rejects stale selection', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_project_multi_scope_mutation', ['schema', 'data']);
      const create = yaml(serviceRoot, 'api/project-timesheets.yaml').actions.find((candidate: any) => candidate.id === 'create_project_timesheet_entry').mutation;
      const values = {
        name: 'TS/2026/MULTI-PROJECT', employee_id: 'employee-demo-001', employee_name: 'Admin User',
        project_id: 'project-demo-002', project_name: 'Customer Delivery',
        context_project_id: 'project-demo-001', context_project_ids: 'project-demo-001,project-demo-002',
        work_date: '2026-01-15', description: 'Multi-project context', hours: 2,
        current_company_name: 'Core3 Demo Company',
      };

      expect(await repository.executeMutation(create, { id: 'timesheet-project-multi-context', values })).toMatchObject({ id: 'timesheet-project-multi-context', project_id: 'project-demo-002', company_name: 'Core3 Demo Company', state: 'Draft' });
      await expect(repository.executeMutation(create, { id: 'timesheet-project-multi-stale', values: { ...values, name: 'TS/2026/MULTI-PROJECT-STALE', project_id: 'project-demo-closed' } })).rejects.toMatchObject({ status: 403, code: 'PROJECT_TIMESHEET_MULTI_CONTEXT_SCOPE' });
      await expect(repository.executeMutation(create, { id: 'timesheet-project-multi-foreign', values: { ...values, name: 'TS/2026/MULTI-PROJECT-FOREIGN', current_company_name: 'Other Company' } })).rejects.toMatchObject({ status: 403, code: 'PROJECT_TIMESHEET_PROJECT_SCOPE' });
    } finally {
      database.close();
    }
  });

  test('keeps multi-project scope and created rows after migration replay and file restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-project-multi-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const scope = yaml(serviceRoot, 'api/project-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'project_timesheet_scope');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_project_multi_restart', ['schema', 'data']);
      const before = await repository.querySource(scope, valid, 0, 1);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_project_multi_restart', ['schema', 'data']);
      expect(await reopened.querySource(scope, valid, 0, 1)).toEqual(before);
      expect((await reopened.query("SELECT COUNT(*) AS count FROM timesheet_entries WHERE project_id IN ('project-demo-001', 'project-demo-002') AND company_name = 'Core3 Demo Company'")).at(0)?.count).toBeGreaterThan(0);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

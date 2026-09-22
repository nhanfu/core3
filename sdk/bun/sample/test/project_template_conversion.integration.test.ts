import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

async function setup(name: string, databasePath = ':memory:') {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
}

describe('Project template conversion parity', () => {
  test('binds the Odoo form server action to the page-matched Project detail API', () => {
    const page = yaml('pages/project-detail.yaml');
    const api = yaml('api/project-detail.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'convert_project_to_template');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const odooView = readFileSync('/home/nhanjs/projects/odoo/addons/project/views/project_project_views.xml', 'utf8');
    const odooModel = readFileSync('/home/nhanjs/projects/odoo/addons/project/models/project_project.py', 'utf8');

    expect(page.page).toMatchObject({ id: 'project-detail', route: '/projects/detail' });
    expect(api.page).toEqual({ id: 'project-detail' });
    expect(page.datasources).toBeUndefined();
    expect(discovered.pageDatasources.get('project-detail')).toContain('project_detail');
    expect(page.components[0].action_menu.actions).toContainEqual(expect.objectContaining({ id: 'convert_project_to_template', label: 'Convert to Template', permission: 'project.manage' }));
    expect(action).toMatchObject({
      type: 'server_form',
      permission: 'project.manage',
      title: 'Convert to Template',
      action: 'project.projects.convert_to_template',
      handler: 'yaml_mutation',
      operation: 'convert_to_template',
    });
    expect(action.fields).toEqual([expect.objectContaining({ field: 'confirm_conversion', required: true })]);
    expect(action.mutation.steps).toHaveLength(3);
    expect(odooView).toContain('id="action_server_convert_project_to_template"');
    expect(odooView).toContain('<field name="name">Convert to Template</field>');
    expect(odooView).toContain('<field name="binding_view_types">form</field>');
    expect(odooModel).toContain('def action_toggle_project_template_mode(self):');
    expect(odooModel).toContain('def action_create_template_from_project(self):');
  });

  test('creates a durable template copy, copies top-level task templates, and archives the source', async () => {
    const { database, repository } = await setup('project_template_conversion_mutation');
    const action = yaml('api/project-detail.yaml').actions.find((candidate: any) => candidate.id === 'convert_project_to_template');
    const [source] = await repository.query('SELECT row_version FROM projects WHERE id = ?', ['project-demo-001']);

    const converted = await repository.executeMutation(action.mutation, {
      project_id: 'project-demo-001', expected_row_version: source.row_version,
      values: { confirm_conversion: true },
    }) as any;

    expect(converted).toMatchObject({
      source_project_id: 'project-demo-001',
      template_id: `project-template-project-demo-001-${source.row_version}`,
      template_name: 'Core3 Implementation Template',
      source_archived: true,
      source_row_version: source.row_version + 1,
    });
    expect(await repository.query('SELECT archived, is_template, row_version FROM projects WHERE id = ?', ['project-demo-001']))
      .toEqual([{ archived: true, is_template: false, row_version: source.row_version + 1 }]);
    expect(await repository.query('SELECT name, is_template, archived, customer_name, state FROM projects WHERE id = ?', [converted.template_id]))
      .toEqual([{ name: 'Core3 Implementation Template', is_template: true, archived: false, customer_name: null, state: 'Draft' }]);
    const copiedTasks = await repository.query('SELECT id, project_id, is_template, state FROM project_tasks WHERE project_id = ? ORDER BY id', [converted.template_id]);
    expect(copiedTasks.length).toBe(7);
    expect(copiedTasks.every((task: any) => task.is_template === true && task.state === 'Todo')).toBe(true);
    const allTasks = yaml('api/all-tasks.yaml').datasources.find((source: any) => source.id === 'project_all_tasks');
    const visibleTasks = await repository.querySource(allTasks, { fixture_state: null, q: null, state: null, priority: null, stage: null }, 0, 100);
    expect(visibleTasks.data.every((task: any) => task.project_id !== converted.template_id)).toBe(true);
    database.close();
  });

  test('rejects missing, invalid, unconfirmed, stale, and replayed conversions', async () => {
    const { database, repository } = await setup('project_template_conversion_guards');
    const action = yaml('api/project-detail.yaml').actions.find((candidate: any) => candidate.id === 'convert_project_to_template');
    const [source] = await repository.query('SELECT row_version FROM projects WHERE id = ?', ['project-demo-001']);

    await expect(repository.executeMutation(action.mutation, {
      project_id: 'project-demo-001', expected_row_version: source.row_version, values: { confirm_conversion: false },
    })).rejects.toMatchObject({ status: 422, code: 'PROJECT_TEMPLATE_CONFIRMATION_REQUIRED' });
    await expect(repository.executeMutation(action.mutation, {
      project_id: 'missing-project', expected_row_version: 1, values: { confirm_conversion: true },
    })).rejects.toMatchObject({ status: 404, code: 'PROJECT_TEMPLATE_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, {
      project_id: 'project-demo-003', expected_row_version: 1, values: { confirm_conversion: true },
    })).rejects.toMatchObject({ status: 409, code: 'PROJECT_TEMPLATE_INVALID_STATE' });
    await expect(repository.executeMutation(action.mutation, {
      project_id: 'project-demo-001', expected_row_version: 99, values: { confirm_conversion: true },
    })).rejects.toMatchObject({ status: 409, code: 'PROJECT_TEMPLATE_STALE_PROJECT' });

    const converted = await repository.executeMutation(action.mutation, {
      project_id: 'project-demo-001', expected_row_version: source.row_version, values: { confirm_conversion: true },
    }) as any;
    await expect(repository.executeMutation(action.mutation, {
      project_id: 'project-demo-001', expected_row_version: source.row_version, values: { confirm_conversion: true },
    })).rejects.toMatchObject({ status: 409, code: 'PROJECT_TEMPLATE_INVALID_STATE' });
    expect(converted.template_id).toBe('project-template-project-demo-001-1');
    database.close();
  });

  test('keeps the conversion durable across DuckDB close, reopen, and migration replay', async () => {
    const databasePath = `/tmp/core3-project-template-conversion-${crypto.randomUUID()}.duckdb`;
    const migrationName = `project_template_conversion_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const action = yaml('api/project-detail.yaml').actions.find((candidate: any) => candidate.id === 'convert_project_to_template');
    const first = await setup(migrationName, databasePath);
    await first.repository.executeMutation(action.mutation, {
      project_id: 'project-demo-002', expected_row_version: 1, values: { confirm_conversion: true },
    });
    first.database.close();

    const second = await setup(migrationName, databasePath);
    expect(await second.repository.query('SELECT id, is_template, archived FROM projects WHERE id = ?', ['project-template-project-demo-002-1']))
      .toEqual([{ id: 'project-template-project-demo-002-1', is_template: true, archived: false }]);
    expect(await second.repository.query('SELECT archived FROM projects WHERE id = ?', ['project-demo-002']))
      .toEqual([{ archived: true }]);
    second.database.close();
    rmSync(databasePath, { force: true });
  });
});

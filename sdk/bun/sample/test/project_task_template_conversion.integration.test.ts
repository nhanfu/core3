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

describe('Project task template conversion parity', () => {
  test('binds the Odoo form action to the page-matched task API', () => {
    const page = yaml('pages/project-task-detail.yaml');
    const api = yaml('api/task-detail.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'convert_task_to_template');
    const detail = api.datasources.find((candidate: any) => candidate.id === 'project_task_detail');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const odooView = readFileSync('/home/nhanjs/projects/odoo/addons/project/views/project_task_views.xml', 'utf8');
    const odooModel = readFileSync('/home/nhanjs/projects/odoo/addons/project/models/project_task.py', 'utf8');

    expect(page.page).toMatchObject({ id: 'project-task-detail', route: '/tasks/detail' });
    expect(api.page).toEqual({ id: 'project-task-detail' });
    expect(page.datasources).toBeUndefined();
    expect(discovered.pageDatasources.get('project-task-detail')).toContain('project_task_detail');
    expect(page.components[0].action_menu.actions).toContainEqual(expect.objectContaining({ id: 'convert_task_to_template', label: 'Convert to Template', permission: 'project.manage' }));
    expect(action).toMatchObject({
      type: 'server_form',
      permission: 'project.manage',
      title: 'Convert to Template',
      action: 'project.tasks.convert_to_template',
      handler: 'yaml_mutation',
      operation: 'convert_to_template',
    });
    expect(action.fields).toEqual([expect.objectContaining({ field: 'confirm_conversion', required: true })]);
    expect(detail.query).toContain('AS is_template');
    expect(odooView).toContain('id="action_server_convert_to_template"');
    expect(odooView).toContain('<field name="name">Convert to Template</field>');
    expect(odooView).toContain('<field name="binding_view_types">form</field>');
    expect(odooModel).toContain('def action_convert_to_template(self):');
    expect(odooModel).toContain("message': _('Private tasks cannot be converted into templates')");
    expect(odooModel).toContain('self.is_template = True');
  });

  test('converts a project task durably and advances its optimistic version', async () => {
    const { database, repository } = await setup('project_task_template_conversion');
    const action = yaml('api/task-detail.yaml').actions.find((candidate: any) => candidate.id === 'convert_task_to_template');

    expect(await repository.executeMutation(action.mutation, {
      id: 'task-demo-001', expected_row_version: 1, current_company_name: 'Core3 Demo Company',
      values: { confirm_conversion: true },
    })).toMatchObject({ id: 'task-demo-001', project_id: 'project-demo-001', row_version: 2, active: true, is_template: true });
    expect(await repository.query('SELECT is_template, row_version FROM project_tasks WHERE id = ?', ['task-demo-001']))
      .toEqual([{ is_template: true, row_version: 2 }]);
    database.close();
  });

  test('rejects missing, private, cross-company, unconfirmed, templated, and stale conversions', async () => {
    const databasePath = `/tmp/core3-project-task-template-${crypto.randomUUID()}.duckdb`;
    const migrationName = `project_task_template_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await setup(migrationName, databasePath);
    const action = yaml('api/task-detail.yaml').actions.find((candidate: any) => candidate.id === 'convert_task_to_template');
    const base = { id: 'task-demo-001', expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { confirm_conversion: true } };

    await expect(first.repository.executeMutation(action.mutation, { ...base, values: { confirm_conversion: false } }))
      .rejects.toMatchObject({ status: 422, code: 'PROJECT_TASK_TEMPLATE_CONFIRMATION_REQUIRED' });
    await expect(first.repository.executeMutation(action.mutation, { ...base, id: 'missing-task' }))
      .rejects.toMatchObject({ status: 404, code: 'PROJECT_TASK_TEMPLATE_NOT_FOUND' });
    await expect(first.repository.executeMutation(action.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 403, code: 'PROJECT_TASK_TEMPLATE_COMPANY_SCOPE_REQUIRED' });
    await first.repository.query("UPDATE project_tasks SET project_id = NULL WHERE id = 'task-demo-001'");
    await expect(first.repository.executeMutation(action.mutation, base))
      .rejects.toMatchObject({ status: 409, code: 'PROJECT_TASK_TEMPLATE_INVALID_STATE' });
    await first.repository.query("UPDATE project_tasks SET project_id = 'project-demo-001' WHERE id = 'task-demo-001'");
    await first.repository.executeMutation(action.mutation, base);
    await expect(first.repository.executeMutation(action.mutation, base))
      .rejects.toMatchObject({ status: 409, code: 'PROJECT_TASK_TEMPLATE_INVALID_STATE' });
    first.database.close();

    const second = await setup(migrationName, databasePath);
    expect(await second.repository.query('SELECT is_template, row_version FROM project_tasks WHERE id = ?', ['task-demo-001']))
      .toEqual([{ is_template: true, row_version: 2 }]);
    await expect(second.repository.executeMutation(action.mutation, { ...base, expected_row_version: 2 }))
      .rejects.toMatchObject({ status: 409, code: 'PROJECT_TASK_TEMPLATE_INVALID_STATE' });
    second.database.close();
    rmSync(databasePath, { force: true });
  });
});

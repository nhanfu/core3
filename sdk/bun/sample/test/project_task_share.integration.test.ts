import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
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

describe('Project Share Task action parity', () => {
  test('binds the Odoo task portal-share action to the page-matched API', () => {
    const page = yaml('pages/project-task-detail.yaml');
    const api = yaml('api/task-detail.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'share_project_task');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/project/views/project_task_views.xml', 'utf8');
    const sourceWizard = readFileSync('/home/nhanjs/projects/odoo/addons/project/wizard/project_task_share_wizard.py', 'utf8');

    expect(page.page).toMatchObject({ id: 'project-task-detail', route: '/tasks/detail' });
    expect(api.page).toEqual({ id: 'project-task-detail' });
    expect(page.datasources).toBeUndefined();
    expect(api.datasources).toContainEqual(expect.objectContaining({ id: 'project_task_shares', permission: 'project.task.publish' }));
    expect(page.components[0].action_menu.actions).toContainEqual(expect.objectContaining({ id: 'share_project_task', label: 'Share Task', permission: 'project.task.publish' }));
    expect(action).toMatchObject({ type: 'server_form', permission: 'project.task.publish', title: 'Share Task', action: 'project.tasks.share', handler: 'yaml_mutation', operation: 'share' });
    expect(action.fields.map((field: any) => field.field)).toEqual(['recipient_email', 'note', 'send_invitation']);
    expect(action.mutation.concurrency).toBeUndefined();
    expect(sourceView).toContain('name="%(project.portal_share_action)d"');
    expect(sourceView).toContain('Share Task');
    expect(sourceWizard).toContain("_name = 'task.share.wizard'");
    expect(sourceWizard).toContain("_inherit = ['portal.share']");
  });

  test('persists a normalized task share, advances the task version, and returns a portal link', async () => {
    const { database, repository } = await setup('project_task_share_create');
    const api = yaml('api/task-detail.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'share_project_task');
    const shares = api.datasources.find((source: any) => source.id === 'project_task_shares');
    const [task] = await repository.query('SELECT row_version FROM project_tasks WHERE id = ?', ['task-demo-001']);

    const created = await repository.executeMutation(action.mutation, {
      task_id: 'task-demo-001', expected_task_row_version: task.row_version, current_company_name: 'Core3 Demo Company',
      values: { recipient_email: '  Viewer@Example.com ', note: '  Please review.  ', send_invitation: true },
    }) as any;

    expect(created).toMatchObject({
      task_id: 'task-demo-001', recipient_email: 'viewer@example.com', note: 'Please review.', send_invitation: true,
      active: true, share_link: '/my/projects/task/detail?project_id=project-demo-001&task_id=task-demo-001', row_version: 1,
    });
    expect(await repository.query('SELECT row_version FROM project_tasks WHERE id = ?', ['task-demo-001'])).toEqual([{ row_version: task.row_version + 1 }]);
    expect((await repository.querySource(shares, { id: 'task-demo-001', current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 50)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: created.id, recipient_email: 'viewer@example.com' })]));
    database.close();
  });

  test('enforces task, company, privacy, duplicate, invalid-recipient, stale, and replay persistence guards', async () => {
    const databasePath = `/tmp/core3-project-task-share-${crypto.randomUUID()}.duckdb`;
    const first = await setup(`project_task_share_guards_${crypto.randomUUID().replaceAll('-', '_')}`, databasePath);
    const action = yaml('api/task-detail.yaml').actions.find((candidate: any) => candidate.id === 'share_project_task');
    const [task] = await first.repository.query('SELECT row_version FROM project_tasks WHERE id = ?', ['task-demo-001']);
    const base = { task_id: 'task-demo-001', expected_task_row_version: task.row_version, current_company_name: 'Core3 Demo Company', values: { recipient_email: 'new@example.com', note: '', send_invitation: true } };

    await expect(first.repository.executeMutation(action.mutation, { ...base, values: { ...base.values, recipient_email: 'task.customer@example.com' } })).rejects.toMatchObject({ status: 409, code: 'PROJECT_TASK_SHARE_ALREADY_EXISTS' });
    await expect(first.repository.executeMutation(action.mutation, { ...base, values: { ...base.values, recipient_email: 'invalid' } })).rejects.toMatchObject({ status: 422, code: 'PROJECT_TASK_SHARE_RECIPIENT_INVALID' });
    await expect(first.repository.executeMutation(action.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'PROJECT_TASK_SHARE_COMPANY_SCOPE_REQUIRED' });
    await expect(first.repository.executeMutation(action.mutation, { ...base, task_id: 'missing-task' })).rejects.toMatchObject({ status: 404, code: 'PROJECT_TASK_SHARE_NOT_FOUND' });
    await first.repository.query("UPDATE projects SET privacy_visibility = 'employees' WHERE id = 'project-demo-001'");
    await expect(first.repository.executeMutation(action.mutation, base)).rejects.toMatchObject({ status: 404, code: 'PROJECT_TASK_SHARE_NOT_FOUND' });
    await first.repository.query("UPDATE projects SET privacy_visibility = 'portal' WHERE id = 'project-demo-001'");
    const created = await first.repository.executeMutation(action.mutation, base) as any;
    await expect(first.repository.executeMutation(action.mutation, base)).rejects.toMatchObject({ status: 409, code: 'PROJECT_TASK_SHARE_STALE_TASK' });
    await first.database.close();

    const second = await setup(`project_task_share_reopen_${crypto.randomUUID().replaceAll('-', '_')}`, databasePath);
    expect(await second.repository.query('SELECT recipient_email, active FROM project_task_shares WHERE id = ?', [created.id])).toEqual([{ recipient_email: 'new@example.com', active: true }]);
    second.database.close();
    rmSync(databasePath, { force: true });
  });
});

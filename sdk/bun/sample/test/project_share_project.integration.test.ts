import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = () => yaml('api/project-detail.yaml').actions.find((candidate: any) => candidate.id === 'share_project');

async function setup(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
}

describe('Project Share Project action parity', () => {
  test('joins the Odoo project form action to a page-id matched API modal', () => {
    const page = yaml('pages/project-detail.yaml');
    const api = yaml('api/project-detail.yaml');
    const share = action();

    expect(page.page).toMatchObject({ id: 'project-detail', route: '/projects/detail' });
    expect(api.page).toEqual({ id: 'project-detail' });
    expect(page.components[0].header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'share_project', label: 'Share Project', permission: 'project.manage' }),
    ]));
    expect(share).toMatchObject({
      id: 'share_project',
      type: 'server_form',
      permission: 'project.manage',
      title: 'Share Project',
      action: 'project.projects.share',
      handler: 'yaml_mutation',
    });
    expect(share.fields.map((field: any) => field.field)).toEqual(['recipient_email', 'access_mode', 'send_invitation']);
    const odooForm = readFileSync('/home/nhanjs/projects/odoo/addons/project/views/project_project_views.xml', 'utf8');
    const odooModel = readFileSync('/home/nhanjs/projects/odoo/addons/project/models/project_project.py', 'utf8');
    const odooWizard = readFileSync('/home/nhanjs/projects/odoo/addons/project/wizard/project_share_wizard_views.xml', 'utf8');
    expect(odooForm).toContain('action_open_share_project_wizard');
    expect(odooForm).toContain('string="Share Project"');
    expect(odooModel).toContain('project.project_share_wizard_action');
    expect(odooWizard).toContain('collaborator_ids');
    expect(odooWizard).toContain('Grant Portal Access');
  });

  test('persists a normalized collaborator share and increments the project version', async () => {
    const { database, repository } = await setup('project_share_create');
    const share = action();
    const [project] = await repository.query('SELECT id, row_version FROM projects WHERE id = ?', ['project-demo-001']);

    const created = await repository.executeMutation(share.mutation, {
      project_id: 'project-demo-001',
      expected_project_row_version: project.row_version,
      values: { recipient_email: '  Partner@Example.com ', access_mode: 'edit_limited', send_invitation: true },
    }) as any;

    expect(created).toMatchObject({
      project_id: 'project-demo-001',
      recipient_email: 'partner@example.com',
      access_mode: 'edit_limited',
      send_invitation: true,
      active: true,
      share_link: '/my/projects/detail?id=project-demo-001',
      row_version: 1,
    });
    const [updatedProject] = await repository.query('SELECT row_version FROM projects WHERE id = ?', ['project-demo-001']);
    expect(updatedProject.row_version).toBe(project.row_version + 1);
    database.close();
  });

  test('rejects duplicate, invalid, missing, restricted, and stale share requests', async () => {
    const { database, repository } = await setup('project_share_guards');
    const share = action();
    const [project] = await repository.query('SELECT row_version FROM projects WHERE id = ?', ['project-demo-001']);

    await expect(repository.executeMutation(share.mutation, {
      project_id: 'project-demo-001', expected_project_row_version: project.row_version,
      values: { recipient_email: 'customer@example.com', access_mode: 'read', send_invitation: false },
    })).rejects.toMatchObject({ status: 409, code: 'PROJECT_SHARE_ALREADY_EXISTS' });
    await expect(repository.executeMutation(share.mutation, {
      project_id: 'project-demo-001', expected_project_row_version: project.row_version,
      values: { recipient_email: 'not-an-email', access_mode: 'read', send_invitation: true },
    })).rejects.toMatchObject({ status: 422, code: 'PROJECT_SHARE_RECIPIENT_INVALID' });
    await expect(repository.executeMutation(share.mutation, {
      project_id: 'project-does-not-exist', expected_project_row_version: 1,
      values: { recipient_email: 'new@example.com', access_mode: 'read', send_invitation: true },
    })).rejects.toMatchObject({ status: 404, code: 'PROJECT_SHARE_PROJECT_NOT_FOUND' });
    await repository.query("UPDATE projects SET privacy_visibility = 'employees' WHERE id = 'project-demo-001'");
    await expect(repository.executeMutation(share.mutation, {
      project_id: 'project-demo-001', expected_project_row_version: project.row_version,
      values: { recipient_email: 'new@example.com', access_mode: 'read', send_invitation: true },
    })).rejects.toMatchObject({ status: 404, code: 'PROJECT_SHARE_PROJECT_NOT_FOUND' });
    await repository.query("UPDATE projects SET privacy_visibility = 'portal' WHERE id = 'project-demo-001'");
    await expect(repository.executeMutation(share.mutation, {
      project_id: 'project-demo-001', expected_project_row_version: project.row_version - 1,
      values: { recipient_email: 'new@example.com', access_mode: 'read', send_invitation: true },
    })).rejects.toMatchObject({ status: 409, code: 'PROJECT_SHARE_STALE_PROJECT' });
    database.close();
  });
});

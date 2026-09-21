import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const sampleRoot = join(import.meta.dir, '..');
const serviceRoot = join(sampleRoot, 'services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const valid = {
  project_id: 'project-demo-001',
  current_company_name: 'Core3 Demo Company',
  from_embedded_action: false,
  fixture_state: null,
};

describe('Timesheets project action display-name parity', () => {
  test('binds the Odoo action label datasource to the layout-only project page', () => {
    const page = yaml('pages/project-timesheets.yaml');
    const api = yaml('api/project-timesheets.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/models/project_project.py', 'utf8');
    const actionContext = api.datasources.find((candidate: any) => candidate.id === 'project_timesheet_action_context');

    expect(page.page).toMatchObject({ id: 'project-timesheets', route: '/project-timesheets' });
    expect(page).not.toHaveProperty('datasources');
    const actionContextCard = page.components.find((component: any) => component.type === 'StatRow' && component.source === 'project_timesheet_action_context');
    expect(actionContextCard).toBeDefined();
    expect(actionContextCard.stats).toContainEqual({ label: 'Action title', field: 'action_label' });
    expect(api.page).toEqual({ id: 'project-timesheets' });
    expect(source).toContain('def action_project_timesheets(self):');
    expect(source).toContain('action[\'display_name\'] = _("%(name)s\'s Timesheets", name=self.name)');
    expect(source).toContain("if not self.env.context.get('from_embedded_action'):");
    expect(actionContext).toMatchObject({ id: 'project_timesheet_action_context', single: true, permission: 'timesheets.read' });
    expect(actionContext.query).toContain(':from_embedded_action');
    expect(actionContext.query).toContain('p.allow_timesheets');
  });

  test('returns standalone and embedded labels from the durable current-company project', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_project_action_display_name', ['schema', 'data']);
      const source = yaml('api/project-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'project_timesheet_action_context');

      expect(await repository.querySource(source, valid, 0, 1)).toMatchObject({ data: { id: 'project-demo-001', project_name: 'Core3 Implementation', action_label: "Core3 Implementation's Timesheets" } });
      expect(await repository.querySource(source, { ...valid, from_embedded_action: true }, 0, 1)).toMatchObject({ data: { id: 'project-demo-001', action_label: 'Timesheets' } });
      expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
      expect((await repository.querySource(source, { ...valid, project_id: 'project-demo-closed' }, 0, 1)).data).toEqual({});
      expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    } finally {
      database.close();
    }
  });

  test('keeps the action label stable across a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-project-action-label-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const source = yaml('api/project-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'project_timesheet_action_context');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_project_action_label_restart', ['schema', 'data']);
      const before = await repository.querySource(source, valid, 0, 1);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_project_action_label_restart', ['schema', 'data']);
      expect(await reopened.querySource(source, valid, 0, 1)).toEqual(before);
      expect((await reopened.query("SELECT name, company_name FROM timesheet_projects WHERE id = 'project-demo-001'")).at(0)).toMatchObject({ name: 'Core3 Implementation', company_name: 'Core3 Demo Company' });
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

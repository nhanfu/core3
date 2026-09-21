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
  task_id: 'task-demo-001',
  current_company_name: 'Core3 Demo Company',
  fixture_state: null,
};

describe('Timesheets task action display-name parity', () => {
  test('binds the Odoo task action label to the layout-only task page', () => {
    const page = yaml('pages/task-timesheets.yaml');
    const api = yaml('api/task-timesheets.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');
    const actionContext = api.datasources.find((candidate: any) => candidate.id === 'task_timesheet_action_context');
    const actionCard = page.components.find((component: any) => component.type === 'StatRow' && component.source === 'task_timesheet_action_context');

    expect(page.page).toMatchObject({ id: 'task-timesheets', route: '/task-timesheets' });
    expect(page).not.toHaveProperty('datasources');
    expect(actionCard).toMatchObject({ type: 'StatRow', title: 'Task action context' });
    expect(actionCard.stats).toContainEqual({ label: 'Action title', field: 'action_label' });
    expect(api.page).toEqual({ id: 'task-timesheets' });
    expect(source).toContain('<record id="timesheet_action_task" model="ir.actions.act_window">');
    expect(source).toContain('<field name="name">Task\'s Timesheets</field>');
    expect(source).toContain("[('task_id', 'in', active_ids)]");
    expect(actionContext).toMatchObject({ id: 'task_timesheet_action_context', single: true, permission: 'timesheets.read' });
    expect(actionContext.query).toContain("'Task''s Timesheets'");
    expect(actionContext.query).toContain('t.company_name = COALESCE');
  });

  test('returns the source action title only for the durable current-company task', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_task_action_display_name', ['schema', 'data']);
      const source = yaml('api/task-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'task_timesheet_action_context');

      expect(await repository.querySource(source, valid, 0, 1)).toMatchObject({ data: { id: 'task-demo-001', task_name: 'Complete module migration', action_label: "Task's Timesheets" } });
      expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 1)).data).toEqual({});
      expect((await repository.querySource(source, { ...valid, task_id: 'missing-task' }, 0, 1)).data).toEqual({});
      expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    } finally {
      database.close();
    }
  });

  test('keeps the task action title stable across a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-task-action-label-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const source = yaml('api/task-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'task_timesheet_action_context');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_task_action_label_restart', ['schema', 'data']);
      const before = await repository.querySource(source, valid, 0, 1);
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_task_action_label_restart', ['schema', 'data']);
      expect(await reopened.querySource(source, valid, 0, 1)).toEqual(before);
      expect((await reopened.query("SELECT name, company_name FROM timesheet_tasks WHERE id = 'task-demo-001'")).at(0)).toMatchObject({ name: 'Complete module migration', company_name: 'Core3 Demo Company' });
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

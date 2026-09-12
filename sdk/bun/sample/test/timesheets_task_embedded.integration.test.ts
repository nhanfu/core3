import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const sampleRoot = join(import.meta.dir, '..');
const timesheetsRoot = join(sampleRoot, 'services/timesheets');
const yaml = (root: string, file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Timesheets task embedded tab parity', () => {
  test('adds the Odoo task-form tab without promoting it to a menu route', () => {
    const discovered = discoverPages(sampleRoot);
    const page = yaml(join(sampleRoot, 'services/project'), 'pages/project-task-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const embedded = page.components.find((component: any) => component.source === 'project_task_timesheets');
    const source = yaml(join(sampleRoot, 'services/project'), 'api/task-detail.yaml').datasources
      .find((candidate: any) => candidate.id === 'project_task_timesheets');

    expect(form.notebook.tabs).toContainEqual({ id: 'timesheets', label: 'Timesheets', content_slot: true });
    expect(embedded).toMatchObject({ type: 'LineItemGrid', variant: 'odoo_x2many', parent_source: 'project_task_detail' });
    expect(embedded.columns.map((column: any) => column.label)).toEqual(['Date', 'Employee', 'Entry', 'Description', 'Time Spent', 'Status']);
    expect(source).toMatchObject({ type: 'service', service: 'yaml.service.timesheets', operation: 'timesheets.entries.by_task', permission: 'timesheets.read' });
    expect(discovered.pages.get('project-task-detail')?.config.page.route).toBe('/tasks/detail');
    expect(Array.from(discovered.menus.values())).not.toContainEqual(expect.objectContaining({ path: '/task-timesheets' }));
  });

  test('uses the Timesheets service boundary and returns deterministic task rows', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(timesheetsRoot, 'migrations'), undefined, 'timesheets_task_embedded_migrations', ['schema', 'data']);
    const operation = yaml(timesheetsRoot, 'operations.yaml').operations['timesheets.entries.by_task'];
    const statement = operation.query.replaceAll(':fixture_state', '?').replaceAll(':task_id', '?');
    const query = await repository.query(statement, [null, 'task-demo-001']);

    expect(query).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'timesheet-demo-001', task_id: 'task-demo-001', work_date: '2026-01-15', time_spent_display: '08:00' })]));
    expect(query.every((row: any) => row.task_id === 'task-demo-001')).toBe(true);
    expect(await repository.query(statement, ['empty', 'task-demo-001'])).toEqual([]);
    database.close();
  });
});

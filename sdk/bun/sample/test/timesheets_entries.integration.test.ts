import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

const action = (file: string, id: string) => {
  const found = yaml(file).actions.find((candidate: any) => candidate.id === id);
  expect(found).toBeDefined();
  return found;
};

const values = {
  name: 'TS/2026/QA-CRUD', employee_id: 'employee-demo-002', employee_name: 'Demo Employee',
  project_id: 'project-demo-001', project_name: 'Core3 Implementation', task_id: 'task-demo-002',
  task_name: 'Quality analysis', work_date: '2026-01-15', description: 'QA implementation',
  hours: 2.5, billable: true, unit_amount: 60,
};

describe('Timesheets entry CRUD parity slice', () => {
  test('keeps CRUD in page-bound API fragments with relational selectors', () => {
    const entries = yaml('api/entries.yaml');
    const detail = yaml('api/entry-detail.yaml');
    expect(entries.page.id).toBe('timesheets');
    expect(detail.page.id).toBe('timesheet-detail');
    expect(entries.datasources.map((source: any) => source.id)).toEqual(expect.arrayContaining(['timesheet_employees', 'timesheet_projects', 'timesheet_tasks']));
    expect(action('api/entries.yaml', 'create_timesheet_entry')).toMatchObject({ type: 'server_form', permission: 'timesheets.write', handler: 'yaml_mutation' });
    expect(action('api/entry-detail.yaml', 'edit_timesheet_detail').mutation.concurrency).toEqual({ required: true });
    expect(action('api/entry-detail.yaml', 'delete_timesheet_detail').mutation.operation).toBe('delete');
  });

  test('is idempotent and persists valid create, update, and delete', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_crud_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_crud_schema_migrations', ['schema', 'data']);

    const projects = await repository.querySource(yaml('api/entries.yaml').datasources.find((source: any) => source.id === 'timesheet_projects'), {}, 0, 20);
    expect(projects.data).toEqual(expect.arrayContaining([{ value: 'project-demo-001', label: 'Core3 Implementation' }]));

    const create = action('api/entries.yaml', 'create_timesheet_entry');
    const created = await repository.executeMutation(create.mutation, { values }) as any;
    expect(created).toMatchObject({ name: values.name, state: 'Draft', hours: 2.5, row_version: 1 });

    const edit = action('api/entry-detail.yaml', 'edit_timesheet_detail');
    const updated = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...values, description: 'Updated QA implementation', hours: 3 } }) as any;
    expect(updated).toMatchObject({ id: created.id, description: 'Updated QA implementation', hours: 3, row_version: 2 });

    const remove = action('api/entry-detail.yaml', 'delete_timesheet_detail');
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    expect(await repository.query('SELECT id FROM timesheet_entries WHERE id = ?', [created.id])).toHaveLength(0);
  });

  test('rejects invalid relations, amounts, locked records, and stale writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_crud_validation_migrations', ['schema', 'data']);
    const create = action('api/entries.yaml', 'create_timesheet_entry');

    await expect(repository.executeMutation(create.mutation, { values: { ...values, project_id: 'project-demo-closed', project_name: 'Archived Project' } })).rejects.toMatchObject({ status: 422, code: 'TIMESHEET_PROJECT_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, hours: 24.01 } })).rejects.toMatchObject({ status: 422, code: 'TIMESHEET_ENTRY_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, task_id: 'task-demo-closed', task_name: 'Closed delivery task', project_id: 'project-demo-002', project_name: 'Customer Delivery' } })).rejects.toMatchObject({ status: 422, code: 'TIMESHEET_TASK_INVALID' });

    const created = await repository.executeMutation(create.mutation, { values: { ...values, name: 'TS/2026/QA-LOCK' } }) as any;
    const edit = action('api/entry-detail.yaml', 'edit_timesheet_detail');
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 99, values })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    const submit = yaml('pages/timesheet-workflow.yaml').workflow.transitions.find((transition: any) => transition.id === 'submit');
    await repository.executeMutation(submit.mutation, { id: created.id });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 2, values })).rejects.toMatchObject({ status: 409, code: 'TIMESHEET_ENTRY_LOCKED' });
  });
});

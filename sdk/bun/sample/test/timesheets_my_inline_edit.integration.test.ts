import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const context = { current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company' };

async function fresh(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
}

describe('Timesheets Odoo editable-top parity slice', () => {
  test('binds the editable-top source view to a separate page/API contract', () => {
    const page = yaml('pages/entries.yaml');
    const api = yaml('api/entries.yaml');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');
    const list = page.components[0];

    expect(page.page).toMatchObject({ id: 'timesheets', route: '/timesheets' });
    expect(api.page).toEqual({ id: 'timesheets' });
    expect(page.datasources).toBeUndefined();
    expect(list.inline_edit).toMatchObject({ create_action: 'create_timesheet_entry_inline', update_action: 'edit_timesheet_entry_inline' });
    expect(list.inline_edit.fields.map((field: any) => field.field)).toEqual(['work_date', 'project_name', 'task_name', 'name', 'hours']);
    expect(api.actions.find((action: any) => action.id === 'create_timesheet_entry_inline')).toMatchObject({ permission: 'timesheets.write', handler: 'yaml_mutation' });
    expect(api.actions.find((action: any) => action.id === 'edit_timesheet_entry_inline').mutation.concurrency).toEqual({ required: true });
    expect(odoo).toContain('<list editable="top"');
    expect(odoo).toContain('<field name="project_id" options="{\'no_create_edit\': True}"');
    expect(odoo).toContain('decoration-danger="unit_amount &gt; 24 or unit_amount &lt; 0"');
  });

  test('creates and updates inline rows with actor, company, relation, and stale guards', async () => {
    const { database, repository } = await fresh('timesheets_inline_crud');
    try {
      const api = yaml('api/entries.yaml');
      const create = api.actions.find((action: any) => action.id === 'create_timesheet_entry_inline').mutation;
      const update = api.actions.find((action: any) => action.id === 'edit_timesheet_entry_inline').mutation;
      const created = await repository.executeMutation(create, {
        ...context,
        values: {
          work_date: '2026-01-16', project_name: 'Core3 Implementation', task_name: 'Complete module migration',
          name: 'Inline parity proof', hours: 2.5,
        },
      }) as any;
      expect(created).toMatchObject({ employee_name: 'Admin User', company_name: 'Core3 Demo Company', project_name: 'Core3 Implementation', task_name: 'Complete module migration', state: 'Draft', hours: 2.5, row_version: 1 });
      const updated = await repository.executeMutation(update, {
        ...context,
        id: created.id,
        expected_row_version: 1,
        values: { work_date: '2026-01-16', project_name: 'Core3 Implementation', task_name: 'Complete module migration', name: 'Inline parity updated', hours: 3 },
      }) as any;
      expect(updated).toMatchObject({ id: created.id, name: 'Inline parity updated', description: 'Inline parity updated', hours: 3, row_version: 2 });
      await expect(repository.executeMutation(update, {
        ...context,
        id: created.id,
        expected_row_version: 1,
        values: { work_date: '2026-01-16', project_name: 'Core3 Implementation', task_name: 'Complete module migration', name: 'stale', hours: 1 },
      })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
      await expect(repository.executeMutation(update, {
        ...context,
        id: created.id,
        expected_row_version: 2,
        values: { work_date: '2026-01-16', project_name: 'Archived Project', task_name: 'Complete module migration', name: 'closed project', hours: 1 },
      })).rejects.toMatchObject({ status: 422, code: 'TIMESHEET_INLINE_PROJECT_INVALID' });
      await expect(repository.executeMutation(update, {
        ...context,
        current_user_name: 'Morgan Taylor',
        id: created.id,
        expected_row_version: 2,
        values: { work_date: '2026-01-16', project_name: 'Core3 Implementation', task_name: 'Complete module migration', name: 'wrong actor', hours: 1 },
      })).rejects.toMatchObject({ status: 403, code: 'TIMESHEET_INLINE_ENTRY_SCOPE' });
    } finally {
      database.close();
    }
  });

  test('fails closed for another company and invalid task or time', async () => {
    const { database, repository } = await fresh('timesheets_inline_boundaries');
    try {
      const create = yaml('api/entries.yaml').actions.find((action: any) => action.id === 'create_timesheet_entry_inline').mutation;
      const values = { work_date: '2026-01-16', project_name: 'Core3 Implementation', task_name: 'Complete module migration', name: 'Invalid boundary', hours: 2 };
      await expect(repository.executeMutation(create, { ...context, current_company_name: 'Other Company', values })).rejects.toMatchObject({ status: 403, code: 'TIMESHEET_INLINE_EMPLOYEE_SCOPE' });
      await expect(repository.executeMutation(create, { ...context, values: { ...values, task_name: 'Closed delivery task' } })).rejects.toMatchObject({ status: 422, code: 'TIMESHEET_INLINE_TASK_INVALID' });
      await expect(repository.executeMutation(create, { ...context, values: { ...values, hours: 25 } })).rejects.toMatchObject({ status: 422, code: 'TIMESHEET_INLINE_ENTRY_INVALID' });
    } finally {
      database.close();
    }
  });

  test('keeps inline-created state through idempotent migration and file restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-inline-'));
    const path = join(directory, 'timesheets.duckdb');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      const migrations = join(serviceRoot, 'migrations');
      await migrateDatabase(repository, migrations, undefined, 'timesheets_inline_restart', ['schema', 'data']);
      const create = yaml('api/entries.yaml').actions.find((action: any) => action.id === 'create_timesheet_entry_inline').mutation;
      const created = await repository.executeMutation(create, {
        ...context,
        values: { work_date: '2026-01-17', project_name: 'Core3 Implementation', task_name: 'Complete module migration', name: 'Restart inline proof', hours: 1.25 },
      }) as any;
      const before = await repository.query('SELECT id, description, hours, row_version FROM timesheet_entries WHERE id = ?', [created.id]);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_inline_restart', ['schema', 'data']);
      first.close();
      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      expect(await reopened.query('SELECT id, description, hours, row_version FROM timesheet_entries WHERE id = ?', [created.id])).toEqual(before);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

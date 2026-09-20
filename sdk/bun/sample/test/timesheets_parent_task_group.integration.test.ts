import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const valid = { q: null, state: null, work_date: null, fixture_state: null, current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company' };

describe('Timesheets parent task grouping parity', () => {
  test('maps Odoo Parent Task grouping to separate page/API YAML', () => {
    const page = yaml('pages/entries.yaml');
    const api = yaml('api/entries.yaml');
    const list = page.components.find((item: any) => item.type === 'ListView');
    const source = api.datasources.find((item: any) => item.id === 'timesheet_entries');
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');
    const migration = readFileSync(join(serviceRoot, 'migrations/20260921120000-017-timesheets-parent-task-group.yaml'), 'utf8');

    expect(odoo).toContain('<field name="parent_task_id"/>');
    expect(odoo).toContain("context=\"{'group_by': 'parent_task_id'}\"");
    expect(page.page).toMatchObject({ id: 'timesheets', route: '/timesheets', auth: { require: ['timesheets.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'timesheets' });
    expect(list.group_by).toContainEqual({ field: 'parent_task_name', label: 'Parent Task' });
    expect(source).toMatchObject({ id: 'timesheet_entries', permission: 'timesheets.read', workflow: 'timesheet_entries' });
    expect(source.pivot.fields).toEqual(expect.arrayContaining(['parent_task_id', 'parent_task_name']));
    expect(String(source.query)).toContain('t.parent_task_name');
    expect(migration).toContain('parent-task-implementation');
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });

  test('returns durable parent task context only for the active actor and company', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_parent_task_values', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');
    const result = await repository.querySource(source, valid, 0, 50);
    expect(result.meta.total).toBe(10);
    expect(result.data[0]).toMatchObject({ id: 'timesheet-demo-001', parent_task_id: 'parent-task-implementation', parent_task_name: 'Implementation rollout' });
    expect([...new Set(result.data.map((row: any) => row.parent_task_name))]).toEqual(['Implementation rollout', 'Delivery operations']);
    expect((await repository.querySource(source, { ...valid, current_user_name: 'Morgan Taylor' }, 0, 50)).data.every((row: any) => row.employee_name === 'Morgan Taylor')).toBe(true);
    expect((await repository.querySource(source, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('retains permission, relation, and stale-write boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_parent_task_guards', ['schema', 'data']);
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');
    const page = yaml('pages/entries.yaml');
    const update = yaml('api/entry-detail.yaml').actions.find((action: any) => action.id === 'edit_timesheet_detail').mutation;
    expect(source.permission).toBe('timesheets.read');
    expect(page.page.auth.require).toEqual(['timesheets.read']);
    expect(update.concurrency).toEqual({ required: true });
    expect(update.guards).toEqual(expect.arrayContaining([expect.objectContaining({ status: 403 })]));
    await expect(repository.executeMutation(update, {
      id: 'timesheet-my-009', expected_row_version: 99, current_company_name: 'Core3 Demo Company', current_user_name: 'Admin User',
      values: { work_date: '2026-01-14', project_name: 'Core3 Implementation', description: 'Stale parent grouping edit', hours: 2 },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    database.close();
  });

  test('preserves parent task grouping through replay and file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-parent-task-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const source = yaml('api/entries.yaml').datasources.find((item: any) => item.id === 'timesheet_entries');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_parent_task_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_parent_task_restart', ['schema', 'data']);
      expect((await repository.querySource(source, valid, 0, 50)).data[0]).toMatchObject({ parent_task_name: 'Implementation rollout' });
      first.close();
      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_parent_task_restart', ['schema', 'data']);
      expect((await reopened.querySource(source, valid, 0, 50)).data[3]).toMatchObject({ parent_task_name: 'Delivery operations' });
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

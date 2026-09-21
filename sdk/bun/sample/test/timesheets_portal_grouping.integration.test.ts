import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const valid = {
  q: null,
  work_date: 'all',
  sortby: 'date_desc',
  project_id: null,
  fixture_state: null,
  current_user_name: 'Portal User',
  current_company_name: 'Core3 Demo Company',
  expected_project_row_version: '1',
};

const groupRows = (rows: any[], field: string) => {
  const groups = new Map<string, { count: number; hours: number }>();
  for (const row of rows) {
    const key = String(row[field] ?? '');
    const current = groups.get(key) ?? { count: 0, hours: 0 };
    current.count += 1;
    current.hours += Number(row.hours);
    groups.set(key, current);
  }
  return groups;
};

describe('Timesheets portal grouping parity', () => {
  test('maps Odoo portal group-by choices and grouped parent-task presentation', () => {
    const page = yaml('pages/portal-timesheets.yaml');
    const api = yaml('api/portal-timesheets.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'portal_timesheet_entries');
    const controller = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/controllers/portal.py', 'utf8');
    const template = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_portal_templates.xml', 'utf8');
    const list = page.components.find((item: any) => item.type === 'ListView');

    expect(controller).toContain("'parent_task_id': {'label': _('Parent Task'), 'sequence': 40}");
    expect(controller).toContain("groupby='none'");
    expect(template).toContain("groupby == 'parent_task_id'");
    expect(template).toContain('No Parent Task');
    expect(template).toContain('Total:');
    expect(page.page).toMatchObject({ id: 'timesheets-portal', route: '/my/timesheets' });
    expect(api.page).toEqual({ id: 'timesheets-portal' });
    expect(page.datasources).toBeUndefined();
    expect(list.group_by).toEqual([
      { field: 'work_date', label: 'Date' },
      { field: 'project_name', label: 'Project' },
      { field: 'parent_task_name', label: 'Parent Task' },
      { field: 'task_name', label: 'Task' },
      { field: 'employee_name', label: 'Employee' },
    ]);
    expect(source.pivot.fields).toEqual(expect.arrayContaining(['parent_task_id', 'parent_task_name']));
    expect(source.meta.group_by_contracts).toEqual([
      { field: 'work_date', label: 'Date', source: 'timesheet_entries.work_date' },
      { field: 'project_name', label: 'Project', source: 'timesheet_entries.project_name' },
      { field: 'parent_task_name', label: 'Parent Task', source: 'timesheet_entries.parent_task_name' },
      { field: 'task_name', label: 'Task', source: 'timesheet_entries.task_name' },
      { field: 'employee_name', label: 'Employee', source: 'timesheet_entries.employee_name' },
    ]);
    expect(source.query).toContain("COALESCE(NULLIF(t.parent_task_name, ''), 'No Parent Task') AS parent_task_name");
    expect(source.query).toContain("COALESCE(t.parent_task_name, 'No Parent Task') ILIKE");
  });

  test('returns deterministic durable groups and Odoo-compatible parent labels', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_portal_grouping', ['schema', 'data']);
      const source = yaml('api/portal-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'portal_timesheet_entries');
      const result = await repository.querySource(source, valid, 0, 100);

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((row: any) => row.parent_task_name)).toBe(true);
      expect(new Set(result.data.map((row: any) => row.parent_task_name))).toEqual(new Set(['Implementation rollout', 'Delivery operations']));
      for (const contract of source.meta.group_by_contracts) {
        const groups = groupRows(result.data, contract.field);
        expect(groups.size).toBeGreaterThan(0);
        expect([...groups.values()].reduce((count, group) => count + group.count, 0)).toBe(result.data.length);
        expect([...groups.values()].reduce((hours, group) => hours + group.hours, 0)).toBeCloseTo(result.data.reduce((hours: number, row: any) => hours + Number(row.hours), 0));
      }
      expect(groupRows(result.data, 'parent_task_name').get('Implementation rollout')?.hours).toBeGreaterThan(0);
      expect(groupRows(result.data, 'parent_task_name').get('Delivery operations')?.hours).toBeGreaterThan(0);
      expect((await repository.querySource(source, { ...valid, q: 'Delivery operations' }, 0, 100)).data.every((row: any) => row.parent_task_name === 'Delivery operations')).toBe(true);
      expect((await repository.querySource(source, { ...valid, current_user_name: 'Other Portal User' }, 0, 100)).data).toEqual([]);
      expect((await repository.querySource(source, { ...valid, fixture_state: 'empty' }, 0, 100)).data).toEqual([]);
    } finally {
      database.close();
    }
  });

  test('replays and reopens portal parent-task grouping without losing durable values', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-portal-grouping-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    const source = yaml('api/portal-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'portal_timesheet_entries');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_portal_grouping_restart', ['schema', 'data']);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_portal_grouping_restart', ['schema', 'data']);
      const before = await repository.querySource(source, valid, 0, 100);
      expect(before.data.some((row: any) => row.parent_task_name === 'Implementation rollout')).toBe(true);
      first.close();

      const reopened = await DuckDbDatabase.open(path);
      const repositoryAfterRestart = new YamlRepository(reopened);
      await migrateDatabase(repositoryAfterRestart, migrations, undefined, 'timesheets_portal_grouping_restart', ['schema', 'data']);
      const after = await repositoryAfterRestart.querySource(source, valid, 0, 100);
      expect(after.data.map((row: any) => [row.id, row.parent_task_name])).toEqual(before.data.map((row: any) => [row.id, row.parent_task_name]));
      reopened.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

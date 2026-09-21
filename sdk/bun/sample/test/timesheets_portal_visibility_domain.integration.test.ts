import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const valid = { q: null, work_date: 'all', sortby: 'date_desc', project_id: null, fixture_state: null, current_user_name: 'Portal User', current_company_name: 'Core3 Demo Company', expected_project_row_version: '1' };

describe('Timesheets portal visibility domain parity', () => {
  test('maps Odoo partner/privacy visibility domain to the existing page/API pair', () => {
    const page = yaml('pages/portal-timesheets.yaml');
    const api = yaml('api/portal-timesheets.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/models/hr_timesheet.py', 'utf8');
    const controller = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/controllers/portal.py', 'utf8');
    const migration = readFileSync(join(serviceRoot, 'migrations/20260921210000-030-timesheets-portal-visibility-domain.yaml'), 'utf8');
    const sourceDefinition = api.datasources.find((candidate: any) => candidate.id === 'portal_timesheet_entries');

    expect(source).toContain('def _timesheet_get_portal_domain(self):');
    expect(source).toContain("Domain('message_partner_ids', 'child_of'");
    expect(source).toContain("Domain('partner_id', 'child_of'");
    expect(source).toContain("Domain('project_id.privacy_visibility', 'in', ['invited_users', 'portal'])");
    expect(controller).toContain('domain = Domain(Timesheet._timesheet_get_portal_domain())');
    expect(page.page).toMatchObject({ id: 'timesheets-portal', route: '/my/timesheets' });
    expect(api.page).toEqual({ id: 'timesheets-portal' });
    expect(page.datasources).toBeUndefined();
    expect(sourceDefinition).toMatchObject({ id: 'portal_timesheet_entries', permission: 'timesheets.read' });
    expect(sourceDefinition.query).toContain('timesheet_portal_visibility');
    expect(sourceDefinition.query).toContain("p.privacy_visibility IN ('invited_users', 'portal')");
    expect(sourceDefinition.query).toContain('expected_project_row_version');
    expect(migration).toContain('privacy_visibility VARCHAR');
    expect(migration).toContain('timesheet_portal_visibility');
  });

  test('returns portal-user rows only through active project/task relations and privacy', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_portal_visibility_scope', ['schema', 'data']);
      const source = yaml('api/portal-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'portal_timesheet_entries');
      const result = await repository.querySource(source, valid, 0, 100);
      const projectIds = new Set(result.data.map((row: any) => row.project_id));

      expect(result.data.length).toBeGreaterThan(0);
      expect(projectIds).toEqual(new Set(['project-demo-001', 'project-demo-002']));
      expect(result.data.every((row: any) => row.company_name === 'Core3 Demo Company')).toBe(true);
      expect(result.data.some((row: any) => row.employee_name !== 'Portal User')).toBe(true);
    } finally {
      database.close();
    }
  });

  test('refreshes visibility relations and fails closed for actor, company, empty, missing, and stale context', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_portal_visibility_guards', ['schema', 'data']);
      const source = yaml('api/portal-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'portal_timesheet_entries');

      await repository.query("UPDATE timesheet_portal_visibility SET active = FALSE WHERE project_id = 'project-demo-002'");
      const projectOne = await repository.querySource(source, valid, 0, 100);
      expect(new Set(projectOne.data.map((row: any) => row.project_id))).toEqual(new Set(['project-demo-001']));

      for (const context of [
        { ...valid, current_user_name: 'Other Portal User' },
        { ...valid, current_company_name: 'Other Company' },
        { ...valid, fixture_state: 'empty' },
        { ...valid, project_id: 'missing-project' },
        { ...valid, expected_project_row_version: '2' },
      ]) {
        expect((await repository.querySource(source, context, 0, 100)).data).toEqual([]);
      }
    } finally {
      database.close();
    }
  });

  test('preserves project privacy and visibility relations after file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-portal-visibility-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_portal_visibility_restart', ['schema', 'data']);
      const source = yaml('api/portal-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'portal_timesheet_entries');
      const before = await repository.querySource(source, valid, 0, 100);
      expect(before.data.length).toBeGreaterThan(0);
      await repository.query("UPDATE timesheet_projects SET privacy_visibility = 'internal', row_version = 2 WHERE id = 'project-demo-002'");
      expect(new Set((await repository.querySource(source, valid, 0, 100)).data.map((row: any) => row.project_id))).toEqual(new Set(['project-demo-001']));
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_portal_visibility_restart', ['schema', 'data']);
      expect(new Set((await reopened.querySource(source, valid, 0, 100)).data.map((row: any) => row.project_id))).toEqual(new Set(['project-demo-001']));
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

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
const valid = { task_id: 'task-demo-001', current_user_name: 'Portal User', current_company_name: 'Core3 Demo Company', expected_task_row_version: '1', fixture_state: null };

describe('Timesheets task action portal views parity', () => {
  test('maps Odoo non-internal task action views to a portal page/API pair', () => {
    const page = yaml('pages/portal-task-timesheets.yaml');
    const detailPage = yaml('pages/portal-task-timesheet-detail.yaml');
    const api = yaml('api/portal-task-timesheets.yaml');
    const detailApi = yaml('api/portal-task-timesheet-detail.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/models/project_task.py', 'utf8');
    const portalViews = readFileSync('/home/nhanjs/projects/odoo/addons/hr_timesheet/views/hr_timesheet_views.xml', 'utf8');
    const accessMigration = readFileSync(join(serviceRoot, 'migrations/20260921194000-028-timesheets-task-action-portal-views.yaml'), 'utf8');
    const list = page.components.find((component: any) => component.type === 'ListView' && component.source === 'portal_task_timesheet_entries');

    expect(source).toContain("if (not is_internal_user or self.env.context.get('is_project_sharing')) and view[1] not in ['tree', 'kanban', 'form']");
    expect(source).toContain("hr_timesheet_line_portal_tree");
    expect(source).toContain("timesheet_view_form_portal_user");
    expect(source).toContain("view_kanban_account_analytic_line_portal_user");
    expect(portalViews).toContain('<record id="timesheet_view_form_portal_user" model="ir.ui.view">');
    expect(portalViews).toContain('<record id="view_kanban_account_analytic_line_portal_user" model="ir.ui.view">');
    expect(page.page).toMatchObject({ id: 'portal-task-timesheets', route: '/my/projects/task/timesheets', auth: { require: ['project.portal'] } });
    expect(detailPage.page).toMatchObject({ id: 'portal-task-timesheet-detail', route: '/my/projects/task/timesheet/detail' });
    expect(api.page).toEqual({ id: 'portal-task-timesheets' });
    expect(detailApi.page).toEqual({ id: 'portal-task-timesheet-detail' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'form']);
    expect(list.form_view).toEqual({ page: 'apps/services/timesheets/pages/portal-task-timesheet-detail.yaml', side_panel: true });
    expect(api.datasources.find((candidate: any) => candidate.id === 'portal_task_timesheet_entries')).toMatchObject({ permission: 'project.portal' });
    expect(detailApi.datasources.find((candidate: any) => candidate.id === 'portal_task_timesheet_detail')).toMatchObject({ permission: 'project.portal', single: true });
    expect(detailApi.actions.find((action: any) => action.id === 'back_to_portal_task_timesheets')).toMatchObject({ permission: 'project.portal', navigate_to: '/my/projects/task/timesheets' });
    expect(accessMigration).toContain('timesheet_task_portal_access');
  });

  test('shows only granted current-company portal task rows and fails closed for actor, missing, empty, and stale context', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    try {
      const repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_task_portal_scope', ['schema', 'data']);
      const entries = yaml('api/portal-task-timesheets.yaml').datasources.find((candidate: any) => candidate.id === 'portal_task_timesheet_entries');

      const rows = await repository.querySource(entries, valid, 0, 50);
      expect(rows.data.map((row: any) => row.id)).toEqual(['timesheet-demo-001', 'timesheet-report-004']);
      expect((await repository.querySource(entries, { ...valid, current_user_name: 'Other Portal User' }, 0, 50)).data).toEqual([]);
      expect((await repository.querySource(entries, { ...valid, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
      expect((await repository.querySource(entries, { ...valid, task_id: 'missing-task' }, 0, 50)).data).toEqual([]);
      expect((await repository.querySource(entries, { ...valid, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
      expect((await repository.querySource(entries, { ...valid, expected_task_row_version: '2' }, 0, 50)).data).toEqual([]);
    } finally {
      database.close();
    }
  });

  test('keeps the portal Form detail durable and actor/company guarded across restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-timesheets-task-portal-'));
    const path = join(directory, 'timesheets.duckdb');
    const migrations = join(serviceRoot, 'migrations');
      const detail = yaml('api/portal-task-timesheet-detail.yaml').datasources.find((candidate: any) => candidate.id === 'portal_task_timesheet_detail');
    try {
      const first = await DuckDbDatabase.open(path);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, migrations, undefined, 'timesheets_task_portal_restart', ['schema', 'data']);
      const before = await repository.querySource(detail, { ...valid, id: 'timesheet-demo-001' }, 0, 1);
      expect(before.data).toMatchObject({ id: 'timesheet-demo-001', task_id: 'task-demo-001', state: 'Approved' });
      expect((await repository.querySource(detail, { ...valid, id: 'timesheet-demo-001', current_user_name: 'Other Portal User' }, 0, 1)).data).toEqual({});
      first.close();

      const second = await DuckDbDatabase.open(path);
      const reopened = new YamlRepository(second);
      await migrateDatabase(reopened, migrations, undefined, 'timesheets_task_portal_restart', ['schema', 'data']);
      expect(await reopened.querySource(detail, { ...valid, id: 'timesheet-demo-001' }, 0, 1)).toEqual(before);
      expect((await reopened.query("SELECT COUNT(*) AS count FROM timesheet_task_portal_access WHERE task_id = 'task-demo-001' AND portal_user_name = 'Portal User'")).at(0)?.count).toBe(1);
      second.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

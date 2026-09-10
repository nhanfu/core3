import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const apiYaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, `api/${file}`), 'utf8')) as any;

describe('Time Off Odoo view navigation', () => {
  test('uses visible tabs for every multi-view list', () => {
    const pages = readdirSync(join(root, 'pages')).filter(file => file.endsWith('.yaml'));
    const multiViewPages: string[] = [];
    for (const file of pages) {
      const page = yaml(`pages/${file}`);
      for (const component of page.components || []) {
        if (component.type !== 'ListView' || !Array.isArray(component.views) || component.views.length < 2) continue;
        multiViewPages.push(file);
        expect(component.view_navigation, file).toBe('tabs');
        expect(component.views.every((view: any) => typeof view.label === 'string' && view.label.length > 0), file).toBe(true);
        if (file === 'time-off-dashboard.yaml') {
          expect(component.views.find((view: any) => view.id === 'calendar'), file).toMatchObject({ mode: 'year', date_field: 'date_from' });
        }
      }
    }
    expect(multiViewPages.sort()).toEqual([
      'accrual-plans.yaml',
      'allocations.yaml',
      'analysis.yaml',
      'my-allocations.yaml',
      'my-time-off.yaml',
      'report-by-employee.yaml',
      'requests.yaml',
      'time-off-approval.yaml',
      'time-off-dashboard.yaml',
      'time-off-overview.yaml',
      'types.yaml',
    ]);
  });

  test('keeps all Time Off screen data in page-id API fragments', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const pages = readdirSync(join(root, 'pages')).filter(file => file.endsWith('.yaml'));
    for (const file of pages) {
      const page = yaml(`pages/${file}`);
      if (!page.page) continue;
      expect(page.datasources, file).toBeUndefined();
      const pageId = String(page.page?.id || '');
      expect(pageId, file).not.toBe('');
      if (readdirSync(join(root, 'api')).some(apiFile => apiFile.replace(/\.ya?ml$/, '') === file.replace(/\.ya?ml$/, ''))) {
        expect(discovered.pageDatasources.has(pageId), file).toBe(true);
      }
    }
  });

  test('declares the analysis pivot fields on its API datasource', () => {
    const analysis = yaml('api/analysis.yaml');
    expect(analysis.datasources.find((source: any) => source.id === 'time_off_analysis_states')?.pivot.fields)
      .toEqual(['category', 'request_count']);
  });

  test('guards new requests against reversed dates', () => {
    const page = yaml('pages/requests.yaml');
    const action = page.actions.find((candidate: any) => candidate.id === 'create_leave_request');
    expect(action.mutation.guards[0].query).toContain('CAST(:date_to AS DATE) >= CAST(:date_from AS DATE)');
    expect(action.mutation.guards[0].message).toContain('valid dates');
  });

  test('covers configuration list to form contracts and the Odoo activity columns', () => {
    const configuration = [
      ['types.yaml', 'leave-type-detail.yaml', 'leave_types', 'leave_type_detail', '/leave-types/detail'],
      ['accrual-plans.yaml', 'accrual-plan-detail.yaml', 'accrual_plans', 'accrual_plan_detail', '/accrual-plans/detail'],
      ['public-holidays.yaml', 'public-holiday-detail.yaml', 'public_holidays', 'public_holiday_detail', '/public-holidays/detail'],
    ] as const;

    for (const [listFile, detailFile, listSource, detailSource, detailRoute] of configuration) {
      const list = yaml(`pages/${listFile}`);
      const listView = list.components.find((component: any) => component.type === 'ListView');
      expect(listView.source, listFile).toBe(listSource);
      expect(listView.empty_state?.title, listFile).toBeTruthy();
      expect(listView.search?.placeholder, listFile).toBeTruthy();
      expect(listView.row_open_action, listFile).toBeTruthy();
      expect(apiYaml(listFile).actions.find((candidate: any) => candidate.id === listView.row_open_action)?.navigate_to, listFile).toBe(detailRoute);

      const detail = yaml(`pages/${detailFile}`);
      const form = detail.components.find((component: any) => component.type === 'OdooFormView');
      expect(form.source, detailFile).toBe(detailSource);
      expect(form.header_actions?.map((action: any) => action.label), detailFile).toContain('Edit');
      expect(apiYaml(detailFile).datasources.find((source: any) => source.id === detailSource)?.single, detailFile).toBe(true);
      const update = apiYaml(detailFile).actions.find((candidate: any) => candidate.operation === 'update');
      expect(update?.permission, detailFile).toBe('time_off.manage');
      expect(update?.mutation?.guards?.some((guard: any) => guard.status === 422), detailFile).toBe(true);
    }

    const activityTypes = yaml('pages/my-time-off.yaml').components
      .find((component: any) => component.type === 'ListView')
      .views.find((view: any) => view.id === 'activity').activity_types
      .map((activity: any) => activity.label);
    expect(activityTypes).toEqual([
      'To-Do', 'Email', 'Call', 'Meeting', 'Time Off Approval',
      'Time Off Second Approve', 'Document',
    ]);
    expect(activityTypes).not.toContain('Trip with Family');
    expect(activityTypes).not.toContain('Doctor Appointment');
  });

  test('covers allocation approval workflow, row-version guards, and detail routing', async () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const list = yaml('pages/allocations.yaml');
    const listView = list.components.find((component: any) => component.type === 'ListView');
    const detail = yaml('pages/allocation-detail.yaml');
    const detailForm = detail.components.find((component: any) => component.type === 'OdooFormView');
    const api = apiYaml('allocations.yaml');
    const detailApi = apiYaml('allocation-detail.yaml');
    const workflow = yaml('pages/allocation-workflow.yaml').workflow;

    expect(discovered.pageDatasources.get('allocation-detail')).toEqual(['allocation_states_detail', 'allocation_detail']);
    expect(list.page.datasources).toBeUndefined();
    expect(listView.empty_state).toMatchObject({ title: 'No allocation requests found' });
    expect(listView.filters[0]).toMatchObject({ field: 'state', options_source: 'allocation_states' });
    expect(listView.row_open_action).toBe('view_allocation');
    expect(api.datasources.find((source: any) => source.id === 'time_off_allocations')?.query).toContain('row_version');
    expect(detailForm.statusbar.map((state: any) => state.value)).toEqual(['Draft', 'Submitted', 'Approved', 'Refused', 'Cancelled']);
    expect(detailApi.page.id).toBe('allocation-detail');
    expect(detailApi.datasources.find((source: any) => source.id === 'allocation_detail')?.single).toBe(true);
    expect(workflow.transitions.map((transition: any) => transition.id)).toEqual(['submit', 'approve', 'refuse', 'cancel']);
    expect(workflow.transitions.every((transition: any) => transition.mutation.guards[0].status === 409)).toBe(true);
    expect(workflow.transitions.every((transition: any) => String(transition.mutation.guards[0].query).includes('expected_row_version'))).toBe(true);

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`CREATE TABLE leave_allocations(
      id VARCHAR PRIMARY KEY, name VARCHAR, employee_id VARCHAR, employee_name VARCHAR,
      leave_type_id VARCHAR, leave_type_name VARCHAR, days DECIMAL(18,3), date_from DATE,
      date_to DATE, state VARCHAR, reason VARCHAR, row_version BIGINT DEFAULT 1
    );`);
    const submit = workflow.transitions.find((transition: any) => transition.id === 'submit').mutation;
    const approve = workflow.transitions.find((transition: any) => transition.id === 'approve').mutation;
    await repository.run("INSERT INTO leave_allocations VALUES ('allocation-test', 'ALLOC/TEST', 'employee-1', 'Admin User', 'leave-type-annual', 'Annual Leave', 5, '2026-01-15', '2026-01-19', 'Draft', 'Test', 1)");
    await repository.executeMutation(submit, { id: 'allocation-test', expected_row_version: 1 });
    expect(await repository.query("SELECT state, row_version FROM leave_allocations WHERE id = 'allocation-test'")).toEqual([{ state: 'Submitted', row_version: 2 }]);
    await expect(repository.executeMutation(submit, { id: 'allocation-test', expected_row_version: 2 })).rejects.toMatchObject({ status: 409 });
    await repository.executeMutation(approve, { id: 'allocation-test', expected_row_version: 2 });
    await expect(repository.executeMutation(approve, { id: 'allocation-test', expected_row_version: 2 })).rejects.toMatchObject({ status: 409 });
    database.close();
  });

  test('covers the next Odoo reporting action: Time Off by Employee', () => {
    const manifest = yaml('manifest.yaml');
    const reporting = manifest.menu.groups.find((group: any) => group.id === 'reporting');
    expect(reporting.items).toContainEqual(expect.objectContaining({
      path: '/time-off-reporting/by-employee',
      label: 'By Employee',
      permission: 'time_off.read',
    }));

    const page = yaml('pages/report-by-employee.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    expect(page.page).toMatchObject({ id: 'time-off-report-by-employee', route: '/time-off-reporting/by-employee' });
    expect(page.page.datasources).toBeUndefined();
    expect(list.source).toBe('time_off_employee_report');
    expect(list.view_navigation).toBe('tabs');
    expect(list.views.map((view: any) => view.id)).toEqual(['pivot', 'list', 'graph', 'calendar']);
    expect(list.views[0].pivot.default).toMatchObject({
      rows: ['employee_name', 'leave_type_name'],
      columns: ['date_from'],
    });
    expect(list.views[0].pivot.date_ranges).toEqual({ date_from: 'month' });

    const api = apiYaml('report-by-employee.yaml');
    expect(api.page.id).toBe('time-off-report-by-employee');
    expect(api.datasources.find((source: any) => source.id === 'time_off_employee_report')?.pivot.fields)
      .toEqual(['employee_name', 'leave_type_name', 'date_from', 'days', 'request_count', 'state']);
    expect(api.datasources.find((source: any) => source.id === 'time_off_employee_report')?.query)
      .toContain("r.state IN ('Submitted', 'Approved')");
    expect(api.datasources.find((source: any) => source.id === 'time_off_employee_report')?.query)
      .toContain("r.date_from >= DATE '2026-01-01'");
    expect(api.datasources.every((source: any) => source.permission === 'time_off.read')).toBe(true);

    const migration = yaml('migrations/20260910223000-006-report-by-employee.yaml');
    expect(migration.type.postgres.up).toContain('leave_requests_report_date_state_idx');
  });
});

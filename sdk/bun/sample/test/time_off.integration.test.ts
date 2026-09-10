import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';

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
      }
    }
    expect(multiViewPages.sort()).toEqual([
      'accrual-plans.yaml',
      'allocations.yaml',
      'analysis.yaml',
      'my-allocations.yaml',
      'my-time-off.yaml',
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
});

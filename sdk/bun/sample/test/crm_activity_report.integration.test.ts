import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';

const sampleRoot = join(import.meta.dir, '..');
const crmRoot = join(sampleRoot, 'services/crm');
const parseYaml = (file: string) => Bun.YAML.parse(readFileSync(join(crmRoot, file), 'utf8')) as any;

describe('CRM Activities report parity', () => {
  it('maps Odoo crm_activity_report_action to a dedicated page and menu', () => {
    const page = parseYaml('pages/activity-report.yaml');
    const api = parseYaml('api/activity-report.yaml');
    const list = page.components[0];
    const reporting = parseYaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'reporting');
    const menu = reporting.items.find((item: any) => item.label === 'Activities');
    const discovered = discoverPages(sampleRoot);

    expect(page.page).toMatchObject({ id: 'crm-activity-report', route: '/activity-analysis' });
    expect(api.page.id).toBe(page.page.id);
    expect(menu).toMatchObject({ path: '/activity-analysis', label: 'Activities', permission: 'crm.read' });
    expect(discovered.pageDatasources.get('crm-activity-report')).toContain('crm_activity_report');
    expect(list.view_navigation).toBe('tabs');
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'pivot', 'list']);
    expect(list.views[0]).toMatchObject({ category_field: 'activity_type', measure_field: 'activity_count', type: 'bar' });
    expect(list.views[1].pivot.default).toMatchObject({ rows: ['completion_month'], columns: ['activity_type'] });
    expect(list.empty_state).toEqual({
      title: "Let's get to work!",
      description: 'Activities marked as Done on Leads will appear here, providing an overview of lead interactions.',
    });
  });

  it('migrates idempotent report fixtures and applies default, filtered, and empty states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(crmRoot, 'migrations'), undefined, 'crm_activity_report_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(crmRoot, 'migrations'), undefined, 'crm_activity_report_migrations', ['schema', 'data']);

    const page = parseYaml('pages/activity-report.yaml');
    const source = parseYaml('api/activity-report.yaml').datasources.find((item: any) => item.id === 'crm_activity_report');
    const params = { fixture_state: null, completion_period: 'trailing_12_months', q: null, activity_type: null, lead_type: null, team: null, author: null, stage: null, from_date: null, to_date: null };
    const report = await repository.querySource(source, params, 0, 50);
    expect(report.meta.total).toBe(6);
    expect(report.data.map((row: any) => row.id)).toEqual([
      'crm-activity-report-001', 'crm-activity-report-002', 'crm-activity-report-003',
      'crm-activity-report-004', 'crm-activity-report-005', 'crm-activity-report-006',
    ]);
    expect(report.data[0]).toMatchObject({ activity_type: 'Call', opportunity: 'Website renewal opportunity', activity_count: 1 });

    const filtered = await repository.querySource(source, { ...params, activity_type: 'Meeting' }, 0, 50);
    expect(filtered.meta.total).toBe(2);
    expect(filtered.data.every((row: any) => row.activity_type === 'Meeting')).toBe(true);

    const empty = await repository.querySource(source, { ...params, fixture_state: 'no_results' }, 0, 50);
    expect(empty.data).toEqual([]);
    expect(empty.meta.total).toBe(0);
    expect(page.components[0].filters).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'activity_type', options_source: 'crm_activity_report_types' }),
      expect.objectContaining({ field: 'completion_period' }),
    ]));
  });

  it('declares permission and report failure contracts', () => {
    const source = parseYaml('api/activity-report.yaml').datasources.find((item: any) => item.id === 'crm_activity_report');
    expect(source.permission).toBe('crm.read');
    expect(source.error_states).toMatchObject({
      unauthorized: { status: 401, code: 'CRM_ACTIVITY_REPORT_UNAUTHORIZED' },
      forbidden: { status: 403, code: 'CRM_ACTIVITY_REPORT_FORBIDDEN' },
      conflict: { status: 409, code: 'CRM_ACTIVITY_REPORT_CONFLICT' },
      transport_error: { status: 503, code: 'CRM_ACTIVITY_REPORT_UNAVAILABLE' },
    });
  });
});

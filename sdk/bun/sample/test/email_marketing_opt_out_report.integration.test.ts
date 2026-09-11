import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/email-marketing');
const read = (file: string) => readFileSync(join(serviceRoot, file), 'utf8');
const yaml = (file: string) => Bun.YAML.parse(read(file)) as any;
const report = () => yaml('api/opt-out-report.yaml').datasources.find((source: any) => source.id === 'email_opt_out_report');

describe('Email Marketing Opt-Out Report action 483 parity', () => {
  test('keeps the Odoo report menu, read-only modes, filters, and page/API boundary', () => {
    const page = yaml('pages/opt-out-report.yaml');
    const api = yaml('api/opt-out-report.yaml');
    const manifest = yaml('manifest.yaml');
    const reporting = manifest.menu['email-marketing'].groups.find((group: any) => group.id === 'reporting');
    const list = page.components.find((component: any) => component.type === 'ListView');

    expect(reporting.items).toContainEqual({ path: '/email-opt-out-report', label: 'Opt-Out Report', icon: 'chart', permission: 'email_marketing.read' });
    expect(page.title).toBe('Opt-Out Report');
    expect(page.page).toMatchObject({ id: 'email-opt-out-report', route: '/email-opt-out-report', auth: { require: ['email_marketing.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'email-opt-out-report' });
    expect(list).toMatchObject({ source: 'email_opt_out_report', variant: 'odoo', default_group_by: 'opt_out_reason', view_navigation: 'tabs' });
    expect(list.create_action).toBeUndefined();
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'pivot', 'list', 'form']);
    expect(list.form_view).toEqual({ page: 'apps/services/email-marketing/pages/opt-out-report-detail.yaml', side_panel: true });
    expect(list.row_open_action).toBe('view_email_opt_out_subscription');
    expect(list.views[0]).toMatchObject({ category_field: 'opt_out_reason', measure_field: 'subscription_count', type: 'pie' });
    expect(list.group_by.map((group: any) => group.label)).toEqual(['Reason', 'Mailing List', 'Mailing Contact', 'Unsubscription Date', 'Subscription Date']);
    expect(list.columns.map((column: any) => column.label)).toEqual(['Subscription Date', 'Mailing Contact', 'Blacklisted', 'Mailing List', 'Unsubscription Date', 'Opt-out Reason', 'Bounces']);
  });

  test('seeds deterministic opt-outs and applies report domain, filters, and empty results', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'email_opt_out_report_seed_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'email_opt_out_report_seed_test', ['schema', 'data']);
    const source = report();
    const params = { q: null, list_id: null, contact_id: null, opt_out_reason_id: null, from_date: null, to_date: null, fixture_state: null };
    const populated = await repository.querySource(source, params, 0, 50);

    expect(populated.data).toHaveLength(4);
    expect(populated.data.map((row: any) => row.contact_name)).toEqual(['David Dawson', 'Elsa Ericson', 'Gilbert Gilson', 'Aristide Antario']);
    expect(populated.data.every((row: any) => row.opt_out === true)).toBe(true);
    expect(populated.data.map((row: any) => row.opt_out_reason)).toEqual(['I changed my mind', 'The content of these emails is not relevant to me', 'I receive too many emails from this list', 'I changed my mind']);
    expect((await repository.querySource(source, { ...params, q: 'Aristide' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['mailing-subscription-aristide-imported-optout']);
    expect((await repository.querySource(source, { ...params, list_id: 'mailing-list-imported-001' }, 0, 50)).data).toHaveLength(2);
    expect((await repository.querySource(source, { ...params, opt_out_reason_id: 'email-optout-changed-mind' }, 0, 50)).data).toHaveLength(2);
    expect((await repository.querySource(source, { ...params, from_date: '2026-01-15', to_date: '2026-01-15' }, 0, 50)).data).toHaveLength(4);
    expect((await repository.querySource(source, { ...params, q: 'not-found' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('declares permission, error boundaries, opt-out-only read contract, and deterministic migration', async () => {
    const source = report();
    expect(source.permission).toBe('email_marketing.read');
    expect(source.error_states).toMatchObject({
      unauthorized: { status: 401, code: 'EMAIL_OPTOUT_REPORT_UNAUTHORIZED' },
      forbidden: { status: 403, code: 'EMAIL_OPTOUT_REPORT_FORBIDDEN' },
      transport_error: { status: 503, code: 'EMAIL_OPTOUT_REPORT_UNAVAILABLE' },
    });
    expect(String(source.query)).toContain('s.opt_out = true');
    expect(String(source.query)).toContain(':opt_out_reason_id');
    expect(String(source.query)).toContain(':from_date');
    expect(String(source.query)).toContain(':to_date');
    expect(yaml('api/opt-out-report.yaml').actions).toEqual([
      { id: 'view_email_opt_out_subscription', type: 'navigate', permission: 'email_marketing.read', navigate_to: '/email-opt-out-report/detail', params: { id: '{row.id}' } },
    ]);
    expect(yaml('pages/opt-out-report-detail.yaml').page).toMatchObject({ id: 'opt-out-report-detail', route: '/email-opt-out-report/detail' });
    expect(yaml('pages/opt-out-report-detail.yaml').components[0]).toMatchObject({ type: 'OdooFormView', source: 'email_opt_out_report_detail', editable: false });
    expect(yaml('api/opt-out-report-detail.yaml').page).toEqual({ id: 'opt-out-report-detail' });
    expect(yaml('api/opt-out-report-detail.yaml').datasources[0].permission).toBe('email_marketing.read');
    expect(read('migrations/20260911150000-012-email-opt-out-report-demo.yaml')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid|random_uuid/i);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('email-opt-out-report')).toEqual(['email_opt_out_report_lists', 'email_opt_out_report_contacts', 'email_opt_out_report_reasons', 'email_opt_out_report']);

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_opt_out_report_error_test', ['schema', 'data']);
    const params = { q: null, list_id: null, contact_id: null, opt_out_reason_id: null, from_date: null, to_date: null, fixture_state: null };
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'EMAIL_OPTOUT_REPORT_UNAVAILABLE' });
    await expect(repository.querySource(source, { ...params, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'EMAIL_OPTOUT_REPORT_FORBIDDEN' });
    await expect(repository.querySource(source, { ...params, fixture_state: 'unauthorized' }, 0, 50)).rejects.toMatchObject({ status: 401, code: 'EMAIL_OPTOUT_REPORT_UNAUTHORIZED' });
    database.close();
  });
});

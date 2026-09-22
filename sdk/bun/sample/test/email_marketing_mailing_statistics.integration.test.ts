import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/email-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Email Marketing mailing-scoped Mail Statistics action parity', () => {
  test('maps Odoo action_view_mail_mail_statistics_mailing through separate page/API contracts', () => {
    const page = yaml('pages/mailing-statistics.yaml');
    const detailPage = yaml('pages/mailing-statistics-detail.yaml');
    const api = yaml('api/mailing-statistics.yaml');
    const detailApi = yaml('api/mailing-statistics-detail.yaml');
    const mailingApi = yaml('api/mailing-detail.yaml');
    const mailingPage = yaml('pages/mailing-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/mass_mailing/views/mailing_trace_views.xml', 'utf8');
    const access = readFileSync('/home/nhanjs/projects/odoo/addons/mass_mailing/security/ir.model.access.csv', 'utf8');
    const action = mailingApi.actions.find((candidate: any) => candidate.id === 'view_email_mailing_statistics');

    expect(page.page).toMatchObject({ id: 'email-mailing-statistics', route: '/email-mailings/statistics', auth: { require: ['email_marketing.read'] } });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['graph', 'list', 'form', 'pivot']);
    expect(detailPage.page.id).toBe('email-mailing-statistics-detail');
    expect(api.page.id).toBe('email-mailing-statistics');
    expect(detailApi.page.id).toBe('email-mailing-statistics-detail');
    expect(discovered.pageDatasources.get('email-mailing-statistics')).toContain('email_mailing_statistics');
    expect(discovered.pageDatasources.get('email-mailing-statistics-detail')).toContain('email_mailing_statistics_detail');
    expect(action).toMatchObject({
      id: 'view_email_mailing_statistics',
      type: 'navigate',
      permission: 'email_marketing.read',
      navigate_to: '/email-mailings/statistics',
      params: { mass_mailing_id: '{state.email_mailing_detail.id}' },
    });
    expect(mailingPage.components[0].header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'view_email_mailing_statistics', permission: 'email_marketing.read' }),
    ]));
    expect(source).toMatch(/<record id="action_view_mail_mail_statistics_mailing" model="ir\.actions\.act_window">[\s\S]*<field name="view_mode">graph,list,form,pivot<\/field>[\s\S]*<field name="context">\{'search_default_mass_mailing_id': active_id\}<\/field>/);
    expect(access).toMatch(/access_mailing_trace_mm_user,[^\n]*mass_mailing\.group_mass_mailing_user,1,1,1,1/);
  });

  test('scopes persisted deterministic traces to the selected mailing and supports empty/error boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'email_mailing_statistics_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'email_mailing_statistics_test', ['schema', 'data']);

    const source = yaml('api/mailing-statistics.yaml').datasources[0];
    const all = await repository.querySource(source, {
      mass_mailing_id: 'email-mailing-newsletter',
      q: null,
      trace_status: null,
      is_test_trace: null,
      fixture_state: null,
    }, 0, 50);
    expect(all.data.map((row: any) => row.id)).toEqual([
      'email-trace-newsletter-beverly',
      'email-trace-newsletter-aristide',
      'email-trace-test-elsa',
    ]);
    expect((await repository.querySource(source, {
      mass_mailing_id: 'email-mailing-newsletter',
      q: null,
      trace_status: 'reply',
      is_test_trace: null,
      fixture_state: null,
    }, 0, 50)).data[0]).toMatchObject({ id: 'email-trace-newsletter-beverly', trace_status: 'reply' });
    expect((await repository.querySource(source, {
      mass_mailing_id: 'email-mailing-spring',
      q: null,
      trace_status: null,
      is_test_trace: null,
      fixture_state: null,
    })).data.map((row: any) => row.id)).toEqual(['email-trace-offer-david', 'email-trace-offer-carol']);
    expect((await repository.querySource(source, {
      mass_mailing_id: 'email-mailing-missing',
      q: null,
      trace_status: null,
      is_test_trace: null,
      fixture_state: null,
    })).data).toEqual([]);
    expect((await repository.querySource(source, {
      mass_mailing_id: 'email-mailing-newsletter',
      q: null,
      trace_status: null,
      is_test_trace: null,
      fixture_state: 'empty',
    })).data).toEqual([]);
    const detail = yaml('api/mailing-statistics-detail.yaml').datasources[0];
    expect((await repository.querySource(detail, { id: 'email-trace-newsletter-aristide', fixture_state: null }, 0, 1)).data).toMatchObject({
      id: 'email-trace-newsletter-aristide',
      mass_mailing_id: 'email-mailing-newsletter',
    });
    await expect(repository.querySource(detail, { id: 'missing-trace', fixture_state: 'not_found' }, 0, 1)).rejects.toMatchObject({ status: 404, code: 'EMAIL_MAILING_STATISTICS_DETAIL_NOT_FOUND' });
    database.close();
  });

  test('keeps read-only user permissions and stable detail states', () => {
    const api = yaml('api/mailing-statistics.yaml');
    const detail = yaml('api/mailing-statistics-detail.yaml');
    expect(api.datasources[0]).toMatchObject({ permission: 'email_marketing.read', error_states: { unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } } });
    expect(detail.datasources[0]).toMatchObject({ permission: 'email_marketing.read', error_states: { not_found: { status: 404 }, transport_error: { status: 503 } } });
    expect(api.actions.some((action: any) => action.type === 'mutation')).toBe(false);
    expect(detail.actions.some((action: any) => action.type === 'mutation')).toBe(false);
    expect(api.datasources[0].query).toContain('mass_mailing_id = :mass_mailing_id');
    expect(readFileSync(join(root, 'migrations/20260912160000-019-email-mailing-traces.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random_uuid|gen_random_uuid/i);
  });
});

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/email-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Email Marketing failed mailing traces action parity', () => {
  test('maps Odoo action_view_traces_failed through the mailing detail page/API seam', () => {
    const page = yaml('pages/mailing-detail.yaml');
    const api = yaml('api/mailing-detail.yaml');
    const tracesApi = yaml('api/traces.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/mass_mailing/models/mailing.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/mass_mailing/views/mailing_mailing_views.xml', 'utf8');
    const detailAction = api.actions.find((candidate: any) => candidate.id === 'view_failed_email_mailing');
    const statButton = page.components[0].stat_buttons.find((candidate: any) => candidate.id === 'view_failed_email_mailing');

    expect(page.page.id).toBe('mailing-detail');
    expect(api.page.id).toBe('mailing-detail');
    expect(discovered.pageDatasources.get('mailing-detail')).toContain('email_mailing_detail');
    expect(detailAction).toMatchObject({
      id: 'view_failed_email_mailing',
      type: 'navigate',
      permission: 'email_marketing.settings',
      navigate_to: '/email-traces',
      params: { mass_mailing_id: '{state.email_mailing_detail.id}', trace_status: 'error' },
    });
    expect(statButton).toMatchObject({ id: 'view_failed_email_mailing', permission: 'email_marketing.settings' });
    expect(statButton.show_if).toContain('failed > 0');
    expect(tracesApi.datasources[0].query).toContain('mass_mailing_id = :mass_mailing_id');
    expect(source).toMatch(/def action_view_traces_failed\(self\):[\s\S]*return self\._action_view_traces_filtered\('failed'\)/);
    expect(source).toMatch(/filter_key = 'search_default_filter_%s' % \(view_filter\)/);
    expect(sourceView).toMatch(/name="action_view_traces_failed"[\s\S]*name="failed_text"/);
  });

  test('scopes the existing trace datasource to one mailing and failed status', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'email_failed_traces_test', ['schema', 'data']);

    const source = yaml('api/traces.yaml').datasources[0];
    const result = await repository.querySource(source, {
      mass_mailing_id: 'email-mailing-newsletter',
      trace_status: 'error',
      q: null,
      is_test_trace: null,
      fixture_state: null,
    }, 0, 50);

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: 'email-trace-test-elsa',
      mass_mailing_id: 'email-mailing-newsletter',
      trace_status: 'error',
    });
    expect((await repository.querySource(source, {
      mass_mailing_id: 'email-mailing-spring',
      trace_status: 'error',
      q: null,
      is_test_trace: null,
      fixture_state: null,
    }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('keeps the read-only navigation permissioned and preserves empty/error boundaries', () => {
    const api = yaml('api/traces.yaml');
    const datasource = api.datasources[0];
    const page = yaml('pages/traces.yaml');

    expect(datasource.permission).toBe('email_marketing.settings');
    expect(page.page.auth.require).toEqual(['email_marketing.settings']);
    expect(datasource.error_states).toMatchObject({
      unauthorized: { status: 401 },
      forbidden: { status: 403 },
      transport_error: { status: 503 },
    });
    expect(datasource.query).toContain("COALESCE(:fixture_state, '') IN ('empty', 'not_found', 'no_results')");
  });
});

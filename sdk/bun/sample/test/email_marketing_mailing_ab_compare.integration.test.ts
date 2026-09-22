import { describe, expect, test } from 'bun:test';
import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/email-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const page = yaml('pages/ab-tests.yaml');
const api = yaml('api/ab-tests.yaml');
const detailApi = yaml('api/mailing-detail.yaml');
const compare = detailApi.actions.find((candidate: any) => candidate.id === 'compare_ab_versions_email_mailing');
const isolatedDiscovery = () => {
  const sandbox = join(tmpdir(), `core3-email-marketing-ab-compare-discovery-${crypto.randomUUID()}`);
  mkdirSync(join(sandbox, 'services'), { recursive: true });
  cpSync(serviceRoot, join(sandbox, 'services/email-marketing'), { recursive: true });
  const discovered = discoverPages(sandbox);
  rmSync(sandbox, { recursive: true, force: true });
  return discovered;
};

describe('Email Marketing A/B comparison parity', () => {
  test('maps Odoo action_compare_versions to a read-only page/API contract', () => {
    const discovered = isolatedDiscovery();
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/mass_mailing/models/mailing.py', 'utf8');
    const viewSource = readFileSync('/home/nhanjs/projects/odoo/addons/mass_mailing/views/mailing_mailing_views.xml', 'utf8');

    expect(page.page).toMatchObject({ id: 'email-mailing-ab-tests', route: '/email-mailings/ab-tests', auth: { require: ['email_marketing.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pageDatasources.get('email-mailing-ab-tests')).toEqual(['email_mailing_ab_tests']);
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'form', 'calendar', 'graph']);
    expect(compare).toMatchObject({
      type: 'navigate',
      permission: 'email_marketing.read',
      navigate_to: '/email-mailings/ab-tests',
      params: { campaign_name: '{state.email_mailing_detail.campaign_name}' },
    });
    expect(page.components[0].empty_state).toMatchObject({ title: 'No A/B Tests yet!' });
    expect(detailApi.datasources[0].query).toContain('ab_testing_variant_count');
    expect(readFileSync(join(serviceRoot, 'pages/mailing-detail.yaml'), 'utf8')).toContain('ab_testing_variant_count >= 2');
    expect(page.components[0].row_open_action).toBe('view_ab_test_mailing');
    expect(source).toMatch(/def action_compare_versions\(self\):[\s\S]*'name': _\('A\/B Tests'\)[\s\S]*'view_mode': 'list,kanban,form,calendar,graph'/);
    expect(source).toMatch(/\('campaign_id', '=', self\.campaign_id\.id\)[\s\S]*\('ab_testing_enabled', '=', True\)/);
    expect(viewSource).toMatch(/name="action_compare_versions"[\s\S]*Compare Version/);
  });

  test('scopes comparison rows to the selected campaign and supports deterministic filters', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_ab_compare_test', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_ab_compare_test', ['schema', 'data']);

    const source = api.datasources[0];
    const params = { campaign_name: 'Newsletter', q: null, state: null, fixture_state: null };
    const rows = await repository.querySource(source, params, 0, 50);
    expect(rows.data.map((row: any) => row.id)).toEqual([
      'email-mailing-ab-newsletter-a',
      'email-mailing-ab-newsletter-b',
    ]);
    expect(rows.data.every((row: any) => row.ab_testing_enabled === true && row.campaign_name === 'Newsletter')).toBe(true);
    expect((await repository.querySource(source, { ...params, q: 'Variant B' }, 0, 50)).data.map((row: any) => row.subject))
      .toEqual(['Newsletter Variant B']);
    expect((await repository.querySource(source, { ...params, state: 'Draft' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, campaign_name: 'Product Launch' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('keeps comparison read-only, permissioned, and deterministic', () => {
    expect(api.datasources[0]).toMatchObject({ permission: 'email_marketing.read' });
    expect(api.actions).toEqual([expect.objectContaining({ id: 'view_ab_test_mailing', type: 'navigate', permission: 'email_marketing.read' })]);
    expect(api.actions.some((candidate: any) => candidate.type === 'server' || candidate.type === 'server_form')).toBe(false);
    expect(api.datasources[0].error_states).toMatchObject({
      unauthorized: { status: 401, code: 'EMAIL_AB_TESTS_UNAUTHORIZED' },
      forbidden: { status: 403, code: 'EMAIL_AB_TESTS_FORBIDDEN' },
      transport_error: { status: 503, code: 'EMAIL_AB_TESTS_UNAVAILABLE' },
    });
  });
});

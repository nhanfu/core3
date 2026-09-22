import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/email-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const campaignsApi = yaml('api/utm-campaigns.yaml');
const detailApi = yaml('api/utm-campaign-detail.yaml');
const action = (id: string) => [...campaignsApi.actions, ...detailApi.actions].find((candidate: any) => candidate.id === id);

describe('Email Marketing Odoo UTM Campaigns action', () => {
  test('maps action_view_utm_campaigns to a page/API-joined kanban, list, and form contract', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/utm-campaigns.yaml');
    const detail = yaml('pages/utm-campaign-detail.yaml');

    expect(page.page).toMatchObject({ id: 'email-utm-campaigns', route: '/email-marketing/campaigns', auth: { require: ['email_marketing.manage'] } });
    expect(detail.page).toMatchObject({ id: 'email-utm-campaign-detail', route: '/email-marketing/campaigns/detail' });
    expect(page.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(campaignsApi.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detail.page.id);
    expect(discovered.pageDatasources.get('email-utm-campaigns')).toEqual(expect.arrayContaining(['email_utm_campaign_stages', 'email_utm_campaigns']));
    expect(discovered.pageDatasources.get('email-utm-campaign-detail')).toContain('email_utm_campaign_detail');
    expect(yaml('manifest.yaml').menu['email-marketing'].groups.find((group: any) => group.id === 'campaigns').items)
      .toContainEqual({ path: '/email-marketing/campaigns', label: 'Campaigns', icon: 'mail', permission: 'email_marketing.manage' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['kanban', 'list']);
    expect(action('create_utm_campaign')).toMatchObject({ type: 'server_form', permission: 'email_marketing.manage', operation: 'create' });
    expect(action('utm_campaign_mailings')).toMatchObject({ navigate_to: '/email-mailings', params: { campaign_name: '{state.email_utm_campaign_detail.title}' } });
    expect(readFileSync('/home/nhanjs/projects/odoo/addons/mass_mailing/views/utm_campaign_views.xml', 'utf8'))
      .toMatch(/id="action_view_utm_campaigns"[\s\S]*<field name="view_mode">kanban,list,form<\/field>[\s\S]*<field name="domain">\[\('is_auto_campaign', '=', False\)\]<\/field>/);
  });

  test('seeds deterministic campaigns idempotently and supports search, stage filtering, and empty data', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'email_utm_campaigns_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'email_utm_campaigns_test', ['schema', 'data']);

    const source = campaignsApi.datasources.find((candidate: any) => candidate.id === 'email_utm_campaigns');
    expect((await repository.querySource(source, { q: null, active: null, stage_id: null, user_name: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.title))
      .toEqual(['Event Follow-up', 'Newsletter', 'Product Launch']);
    expect((await repository.querySource(source, { q: 'product', active: null, stage_id: null, user_name: null, fixture_state: null }, 0, 50)).data)
      .toEqual([expect.objectContaining({ id: 'email-utm-campaign-product-launch', stage_name: 'Design', tag_names: 'Product, Newsletter' })]);
    expect((await repository.querySource(source, { q: null, active: null, stage_id: 'email-campaign-stage-sent', user_name: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.title))
      .toEqual(['Event Follow-up']);
    expect((await repository.querySource(source, { q: null, active: 'false', stage_id: null, user_name: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.title))
      .toEqual(['Archived Campaign']);
    expect((await repository.querySource(source, { q: null, active: null, stage_id: null, user_name: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
  });

  test('enforces stage/name validation, durable CRUD, optimistic concurrency, and archive restore', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_utm_campaigns_workflow_test', ['schema', 'data']);

    const create = action('create_utm_campaign');
    await expect(repository.executeMutation(create.mutation, { values: { title: 'Launch QA', stage_id: 'missing-stage' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMAIL_UTM_CAMPAIGN_STAGE_REQUIRED' });
    const created = await repository.executeMutation(create.mutation, {
      values: { title: 'Launch QA', user_name: 'QA User', stage_id: 'email-campaign-stage-design', tag_names: 'Product', color: 3 },
    });
    expect(created).toMatchObject({ id: 'email-utm-campaign-launch-qa', name: 'launch-qa', title: 'Launch QA', stage_name: 'Design', row_version: 1, active: true });
    await expect(repository.executeMutation(create.mutation, { values: { title: ' launch  QA ', stage_id: 'email-campaign-stage-new' } }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_UTM_CAMPAIGN_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { title: ' ', stage_id: 'email-campaign-stage-new' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMAIL_UTM_CAMPAIGN_TITLE_REQUIRED' });

    const edit = action('edit_utm_campaign_detail');
    const updated = await repository.executeMutation(edit.mutation, {
      id: created.id,
      expected_row_version: 1,
      values: { title: 'Launch QA v2', user_name: 'QA User', stage_id: 'email-campaign-stage-sent', tag_names: 'Event', color: 5 },
    });
    expect(updated).toMatchObject({ title: 'Launch QA v2', name: 'launch-qa-v2', stage_name: 'Sent', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, {
      id: created.id,
      expected_row_version: 1,
      values: { title: 'Stale', stage_id: 'email-campaign-stage-new' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const archive = action('archive_utm_campaign_detail');
    await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect(await repository.query('SELECT active, row_version FROM email_marketing_utm_campaigns WHERE id = ?', [created.id]))
      .toEqual([{ active: false, row_version: 3 }]);
    await repository.executeMutation(action('restore_utm_campaign_detail').mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    expect(await repository.query('SELECT active, row_version FROM email_marketing_utm_campaigns WHERE id = ?', [created.id]))
      .toEqual([{ active: true, row_version: 4 }]);
  });

  test('keeps permissions, error states, fixed seed dates, and source separation explicit', () => {
    expect(campaignsApi.datasources.find((source: any) => source.id === 'email_utm_campaigns')).toMatchObject({
      permission: 'email_marketing.manage',
      error_states: { transport_error: { status: 503, code: 'EMAIL_UTM_CAMPAIGNS_UNAVAILABLE' } },
    });
    expect(detailApi.datasources[0].permission).toBe('email_marketing.manage');
    for (const id of ['create_utm_campaign', 'edit_utm_campaign_detail', 'archive_utm_campaign_detail', 'restore_utm_campaign_detail']) {
      expect(action(id), id).toMatchObject({ permission: 'email_marketing.manage', handler: 'yaml_mutation' });
    }
    expect(readFileSync(join(serviceRoot, 'migrations/20260922180000-021-email-utm-campaigns.yaml'), 'utf8'))
      .not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid|random_uuid/i);
  });
});

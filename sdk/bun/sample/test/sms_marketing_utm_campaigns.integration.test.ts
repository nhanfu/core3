import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/sms-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const campaignsApi = yaml('api/utm-campaigns.yaml');
const mailingApi = yaml('api/campaigns.yaml');
const detailApi = yaml('api/utm-campaign-detail.yaml');
const action = (id: string) => [...campaignsApi.actions, ...detailApi.actions].find((candidate: any) => candidate.id === id);

describe('SMS Marketing Odoo UTM Campaigns action', () => {
  test('maps action_view_utm_campaigns to a page/API-joined kanban, list, and form contract', () => {
    const page = yaml('pages/utm-campaigns.yaml');
    const detail = yaml('pages/utm-campaign-detail.yaml');
    const manifest = yaml('manifest.yaml');
    const menu = manifest.menu.groups.find((group: any) => group.id === 'campaigns');

    expect(page.page).toMatchObject({ id: 'sms-utm-campaigns', route: '/sms-marketing/campaigns', auth: { require: ['sms_marketing.manage'] } });
    expect(detail.page).toMatchObject({ id: 'sms-utm-campaign-detail', route: '/sms-marketing/campaigns/detail' });
    expect(campaignsApi.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detail.page.id);
    expect(campaignsApi.datasources.map((source: any) => source.id)).toEqual(expect.arrayContaining(['sms_utm_campaign_stages', 'sms_utm_campaigns']));
    expect(detailApi.datasources.map((source: any) => source.id)).toContain('sms_utm_campaign_detail');
    expect(detailApi.datasources.map((source: any) => source.id)).toContain('sms_utm_campaign_sms_lists');
    expect(menu.items).toContainEqual({ path: '/sms-marketing/campaigns', label: 'Campaigns', icon: 'mail', permission: 'sms_marketing.manage' });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['kanban', 'list']);
    expect(action('create_sms_utm_campaign')).toMatchObject({ type: 'server_form', permission: 'sms_marketing.manage', operation: 'create' });
    expect(action('create_sms_from_utm_campaign')).toMatchObject({ type: 'server_form', permission: 'sms_marketing.write', action: 'mass_mailing.action_create_mass_sms', operation: 'create' });
    expect(action('create_sms_from_utm_campaign').mutation.fields).toContain('campaign_id');
    expect(action('sms_utm_campaign_mailings')).toMatchObject({ navigate_to: '/sms-campaigns', params: { campaign_name: '{state.sms_utm_campaign_detail.title}' } });
    expect(readFileSync('/home/nhanjs/projects/odoo/addons/mass_mailing/views/utm_campaign_views.xml', 'utf8'))
      .toMatch(/id="action_view_utm_campaigns"[\s\S]*<field name="view_mode">kanban,list,form<\/field>[\s\S]*<field name="domain">\[\('is_auto_campaign', '=', False\)\]<\/field>/);
    expect(readFileSync('/home/nhanjs/projects/odoo/addons/mass_mailing_sms/views/mailing_sms_menus.xml', 'utf8'))
      .toMatch(/id="menu_email_campaigns"[\s\S]*name="Campaigns"[\s\S]*action="mass_mailing\.action_view_utm_campaigns"/);
    expect(readFileSync('/home/nhanjs/projects/odoo/addons/mass_mailing_sms/views/utm_campaign_views.xml', 'utf8'))
      .toMatch(/name="action_create_mass_sms"[\s\S]*string="Send SMS"/);
    expect(readFileSync('/home/nhanjs/projects/odoo/addons/mass_mailing_sms/models/utm.py', 'utf8'))
      .toMatch(/def action_create_mass_sms[\s\S]*default_mailing_type.*sms[\s\S]*default_campaign_id/);
  });

  test('seeds deterministic SMS campaigns idempotently and supports search, stage filtering, archived data, and empty state', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'sms_utm_campaigns_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'sms_utm_campaigns_test', ['schema', 'data']);

    const source = campaignsApi.datasources.find((candidate: any) => candidate.id === 'sms_utm_campaigns');
    expect((await repository.querySource(source, { q: null, active: null, stage_id: null, user_name: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.title))
      .toEqual(['Event Follow-up', 'Product Update', 'Summer SMS Sale']);
    expect((await repository.querySource(source, { q: 'product', active: null, stage_id: null, user_name: null, fixture_state: null }, 0, 50)).data)
      .toEqual([expect.objectContaining({ id: 'sms-utm-campaign-product-update', stage_name: 'Design', tag_names: 'Product, Release' })]);
    expect((await repository.querySource(source, { q: null, active: null, stage_id: 'sms-campaign-stage-sent', user_name: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.title))
      .toEqual(['Event Follow-up']);
    expect((await repository.querySource(source, { q: null, active: 'false', stage_id: null, user_name: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.title))
      .toEqual(['Archived SMS Campaign']);
    expect((await repository.querySource(source, { q: null, active: null, stage_id: null, user_name: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('enforces stage/name validation, durable CRUD, optimistic concurrency, and archive restore', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'sms_utm_campaigns_workflow_test', ['schema', 'data']);

    const create = action('create_sms_utm_campaign');
    await expect(repository.executeMutation(create.mutation, { values: { title: 'Launch QA', stage_id: 'missing-stage' } }))
      .rejects.toMatchObject({ status: 422, code: 'SMS_UTM_CAMPAIGN_STAGE_REQUIRED' });
    const created = await repository.executeMutation(create.mutation, {
      values: { title: 'Launch QA', user_name: 'QA User', stage_id: 'sms-campaign-stage-design', tag_names: 'Product', color: 3 },
    });
    expect(created).toMatchObject({ id: 'sms-utm-campaign-launch-qa', name: 'launch-qa', title: 'Launch QA', stage_name: 'Design', row_version: 1, active: true });
    await expect(repository.executeMutation(create.mutation, { values: { title: ' launch  QA ', stage_id: 'sms-campaign-stage-new' } }))
      .rejects.toMatchObject({ status: 409, code: 'SMS_UTM_CAMPAIGN_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { title: ' ', stage_id: 'sms-campaign-stage-new' } }))
      .rejects.toMatchObject({ status: 422, code: 'SMS_UTM_CAMPAIGN_TITLE_REQUIRED' });

    const edit = action('edit_sms_utm_campaign_detail');
    const updated = await repository.executeMutation(edit.mutation, {
      id: created.id,
      expected_row_version: 1,
      values: { title: 'Launch QA v2', user_name: 'QA User', stage_id: 'sms-campaign-stage-sent', tag_names: 'Event', color: 5 },
    });
    expect(updated).toMatchObject({ title: 'Launch QA v2', name: 'launch-qa-v2', stage_name: 'Sent', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, {
      id: created.id,
      expected_row_version: 1,
      values: { title: 'Stale', stage_id: 'sms-campaign-stage-new' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const archive = action('archive_sms_utm_campaign_detail');
    await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect(await repository.query('SELECT active, row_version FROM sms_marketing_utm_campaigns WHERE id = ?', [created.id]))
      .toEqual([{ active: false, row_version: 3 }]);
    await repository.executeMutation(action('restore_sms_utm_campaign_detail').mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    expect(await repository.query('SELECT active, row_version FROM sms_marketing_utm_campaigns WHERE id = ?', [created.id]))
      .toEqual([{ active: true, row_version: 4 }]);
    database.close();
  });

  test('creates a durable SMS mailing from a campaign and rejects stale parent versions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'sms_utm_campaign_send_test', ['schema', 'data']);

    const send = action('create_sms_from_utm_campaign');
    const created = await repository.executeMutation(send.mutation, {
      campaign_id: 'sms-utm-campaign-summer-sale',
      expected_campaign_row_version: 1,
      values: {
        campaign_id: 'sms-utm-campaign-summer-sale',
        name: 'SMS/2026/0097',
        title: 'Summer SMS Sale - VIP',
        sender_name: 'Core3',
        list_id: 'sms-list-demo-001',
        message: 'Your summer offer is ready.',
        recipient_count: 840,
      },
    });
    expect(created).toMatchObject({
      campaign_id: 'sms-utm-campaign-summer-sale',
      list_name: 'Opt-in Customers',
      state: 'Draft',
      row_version: 1,
    });
    expect(await repository.query('SELECT mailing_sms_count, row_version FROM sms_marketing_utm_campaigns WHERE id = ?', ['sms-utm-campaign-summer-sale']))
      .toEqual([{ mailing_sms_count: 3, row_version: 2 }]);
    expect((await repository.querySource(mailingApi.datasources.find((source: any) => source.id === 'sms_marketing_mailings'), {
      q: null,
      state: null,
      campaign_id: 'sms-utm-campaign-summer-sale',
      fixture_state: null,
    }, 0, 50)).data.map((row: any) => row.id)).toEqual(['sms-campaign-demo-001', 'sms-campaign-demo-004', created.id]);

    await expect(repository.executeMutation(send.mutation, {
      campaign_id: 'sms-utm-campaign-summer-sale',
      expected_campaign_row_version: 2,
      values: { campaign_id: 'sms-utm-campaign-summer-sale', name: 'SMS/2026/0098', title: 'Invalid list', list_id: 'sms-list-missing', message: 'This must not be created.', recipient_count: 1 },
    })).rejects.toMatchObject({ status: 422, code: 'SMS_UTM_CAMPAIGN_LIST_REQUIRED' });
    await expect(repository.executeMutation(send.mutation, {
      campaign_id: 'sms-utm-campaign-summer-sale',
      expected_campaign_row_version: 2,
      values: { campaign_id: 'sms-utm-campaign-summer-sale', name: 'SMS/2026/0097', title: 'Duplicate mailing', list_id: 'sms-list-demo-001', message: 'This must not be created.', recipient_count: 1 },
    })).rejects.toMatchObject({ status: 409, code: 'SMS_UTM_CAMPAIGN_MAILING_EXISTS' });

    await expect(repository.executeMutation(send.mutation, {
      campaign_id: 'sms-utm-campaign-summer-sale',
      expected_campaign_row_version: 1,
      values: {
        campaign_id: 'sms-utm-campaign-summer-sale',
        name: 'SMS/2026/0096',
        title: 'Stale campaign send',
        list_id: 'sms-list-demo-001',
        message: 'This must not be created.',
        recipient_count: 1,
      },
    })).rejects.toMatchObject({ status: 409, code: 'SMS_UTM_CAMPAIGN_STALE' });
    expect(await repository.query('SELECT COUNT(*) AS count FROM sms_campaigns WHERE name = ?', ['SMS/2026/0096']))
      .toEqual([{ count: 0 }]);
    database.close();
  });

  test('keeps manager permissions, transport errors, fixed seed dates, and source separation explicit', () => {
    const api = yaml('api/utm-campaigns.yaml');
    const detail = yaml('api/utm-campaign-detail.yaml');
    expect(api.datasources.find((source: any) => source.id === 'sms_utm_campaigns')).toMatchObject({
      permission: 'sms_marketing.manage',
      error_states: { transport_error: { status: 503, code: 'SMS_UTM_CAMPAIGNS_UNAVAILABLE' } },
    });
    expect(detail.datasources.find((source: any) => source.id === 'sms_utm_campaign_detail')).toMatchObject({
      permission: 'sms_marketing.manage',
      error_states: { transport_error: { status: 503, code: 'SMS_UTM_CAMPAIGN_DETAIL_UNAVAILABLE' } },
    });
    for (const id of ['create_sms_utm_campaign', 'edit_sms_utm_campaign_detail', 'archive_sms_utm_campaign_detail', 'restore_sms_utm_campaign_detail']) {
      expect(action(id), id).toMatchObject({ permission: 'sms_marketing.manage', handler: 'yaml_mutation' });
    }
    expect(action('create_sms_from_utm_campaign')).toMatchObject({ permission: 'sms_marketing.write', handler: 'yaml_mutation', mutation: { operation: 'insert', table: 'sms_campaigns' } });
    expect(action('create_sms_from_utm_campaign').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SMS_UTM_CAMPAIGN_STALE', status: 409 }),
      expect.objectContaining({ code: 'SMS_UTM_CAMPAIGN_LIST_REQUIRED', status: 422 }),
      expect.objectContaining({ code: 'SMS_UTM_CAMPAIGN_MAILING_EXISTS', status: 409 }),
    ]));
    expect(readFileSync(join(serviceRoot, 'migrations/20260922131000-016-sms-utm-campaigns-demo.yaml'), 'utf8'))
      .not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid|random_uuid/i);
    expect(readFileSync(join(serviceRoot, 'migrations/20260922141000-018-sms-utm-campaign-mailings-demo.yaml'), 'utf8'))
      .not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid|random_uuid/i);
  });
});

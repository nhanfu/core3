import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/sms-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const detailApi = yaml('api/utm-campaign-detail.yaml');
const detailPage = yaml('pages/utm-campaign-detail.yaml');
const duplicate = detailApi.actions.find((action: any) => action.id === 'duplicate_sms_utm_campaign_mailing');

describe('SMS Marketing UTM campaign SMS mailing tab', () => {
  test('maps the Odoo SMS notebook relation to a page/API-joined list', () => {
    const form = detailPage.components.find((component: any) => component.type === 'OdooFormView');
    const mailingList = detailPage.components.find((component: any) => component.type === 'ListView');
    const mailingSource = detailApi.datasources.find((source: any) => source.id === 'sms_utm_campaign_mailings');
    const odooSource = readFileSync('/home/nhanjs/projects/odoo/addons/mass_mailing_sms/views/utm_campaign_views.xml', 'utf8');

    expect(detailPage.page.id).toBe('sms-utm-campaign-detail');
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(form).toMatchObject({ type: 'OdooFormView', content_slot: true });
    expect(form.notebook).toMatchObject({ active: 'sms' });
    expect(form.notebook.tabs).toContainEqual({ id: 'sms', label: 'SMS', content_slot: true });
    expect(mailingList).toMatchObject({ mount_in: 'previous-panel', source: 'sms_utm_campaign_mailings', row_open_action: 'view_sms_campaign_from_utm_campaign' });
    expect(mailingList.columns.map((column: any) => column.field)).toEqual(expect.arrayContaining(['calendar_date', 'subject', 'recipient_model_label', 'responsible', 'sent', 'clicked', 'bounced', 'ab_testing_enabled', 'state']));
    expect(mailingSource).toMatchObject({ permission: 'sms_marketing.read', error_states: { transport_error: { status: 503, code: 'SMS_UTM_CAMPAIGN_MAILINGS_UNAVAILABLE' } } });
    expect(odooSource).toMatch(/<page string="SMS" name="sms"[\s\S]*<field name="mailing_sms_ids">[\s\S]*<field name="calendar_date" string="Date"\/>[\s\S]*<button name="action_duplicate" type="object" string="Duplicate"/);
  });

  test('reads deterministic linked SMS mailings and the A/B projection after replaying migrations', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'sms_utm_campaign_mailing_tab_read_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'sms_utm_campaign_mailing_tab_read_test', ['schema', 'data']);

    const detailSource = detailApi.datasources.find((source: any) => source.id === 'sms_utm_campaign_detail');
    const mailingSource = detailApi.datasources.find((source: any) => source.id === 'sms_utm_campaign_mailings');
    const detail = await repository.querySource(detailSource, { id: 'sms-utm-campaign-summer-sale', fixture_state: null }, 0, 1);
    const mailings = await repository.querySource(mailingSource, { id: 'sms-utm-campaign-summer-sale', fixture_state: null }, 0, 50);

    expect(detail.data).toMatchObject({ id: 'sms-utm-campaign-summer-sale', mailing_sms_count: 2, ab_testing_mailings_sms_count: 1 });
    expect(mailings.data).toEqual([
      expect.objectContaining({ id: 'sms-campaign-demo-001', subject: 'Service update', state: 'Draft', ab_testing_enabled: false }),
      expect.objectContaining({ id: 'sms-campaign-demo-004', subject: 'New customer welcome', state: 'Draft', ab_testing_enabled: true }),
    ]);
    expect(mailings.data.every((row: any) => row.campaign_id === 'sms-utm-campaign-summer-sale')).toBe(true);
    expect((await repository.querySource(mailingSource, { id: 'sms-utm-campaign-summer-sale', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('duplicates a linked SMS mailing with parent count/version and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'sms_utm_campaign_mailing_tab_duplicate_test', ['schema', 'data']);
    const source = detailApi.datasources.find((candidate: any) => candidate.id === 'sms_utm_campaign_mailings');
    const row = (await repository.querySource(source, { id: 'sms-utm-campaign-summer-sale', fixture_state: null }, 0, 50)).data[0];

    const created = await repository.executeMutation(duplicate.mutation, {
      id: row.id,
      expected_row_version: row.row_version,
      campaign_id: row.campaign_id,
      expected_campaign_row_version: row.campaign_row_version,
      values: row,
    });
    expect(created).toMatchObject({ id: 'sms-campaign-copy-sms-campaign-demo-001-1', campaign_id: row.campaign_id, title: row.subject, state: 'Draft', row_version: 1, ab_testing_enabled: false });
    expect(await repository.query('SELECT mailing_sms_count, row_version FROM sms_marketing_utm_campaigns WHERE id = ?', [row.campaign_id]))
      .toEqual([{ mailing_sms_count: 3, row_version: 2 }]);
    await expect(repository.executeMutation(duplicate.mutation, {
      id: row.id,
      expected_row_version: row.row_version,
      campaign_id: row.campaign_id,
      expected_campaign_row_version: row.campaign_row_version,
      values: row,
    })).rejects.toMatchObject({ status: 409, code: 'SMS_UTM_CAMPAIGN_STALE' });
    expect(await repository.query('SELECT COUNT(*) AS count FROM sms_campaigns WHERE id LIKE ?', ['sms-campaign-copy-sms-campaign-demo-001-%']))
      .toEqual([{ count: 1 }]);
    database.close();
  });

  test('keeps the duplicate permission, migration dates, and source separation explicit', () => {
    expect(duplicate).toMatchObject({ type: 'server', permission: 'sms_marketing.write', action: 'mass_mailing.action_duplicate', handler: 'yaml_mutation', mutation: { operation: 'insert', table: 'sms_campaigns' } });
    expect(duplicate.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SMS_UTM_CAMPAIGN_MAILING_STALE', status: 409 }),
      expect.objectContaining({ code: 'SMS_UTM_CAMPAIGN_STALE', status: 409 }),
      expect.objectContaining({ code: 'SMS_UTM_CAMPAIGN_LIST_REQUIRED', status: 422 }),
    ]));
    expect(readFileSync(join(serviceRoot, 'migrations/20260922150000-019-sms-utm-campaign-mailing-tab.yaml'), 'utf8'))
      .not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid|random_uuid/i);
    expect(readFileSync(join(serviceRoot, 'migrations/20260922151000-020-sms-utm-campaign-mailing-tab-demo.yaml'), 'utf8'))
      .not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid|random_uuid/i);
  });
});

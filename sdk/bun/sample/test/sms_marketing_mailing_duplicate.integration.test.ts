import { describe, expect, test } from 'bun:test';
import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/sms-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/campaign-detail.yaml');
const page = yaml('pages/sms-campaign-detail.yaml');
const duplicate = api.actions.find((action: any) => action.id === 'duplicate_sms_mailing');
const isolatedDiscovery = () => {
  const sandbox = join(tmpdir(), `core3-sms-marketing-duplicate-discovery-${crypto.randomUUID()}`);
  mkdirSync(join(sandbox, 'services'), { recursive: true });
  cpSync(serviceRoot, join(sandbox, 'services/sms-marketing'), { recursive: true });
  const discovered = discoverPages(sandbox);
  rmSync(sandbox, { recursive: true, force: true });
  return discovered;
};

describe('SMS Marketing mailing duplicate parity', () => {
  test('maps Odoo action_duplicate to the existing SMS detail page/API join', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/mass_mailing/views/mailing_mailing_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/mass_mailing/models/mailing.py', 'utf8');

    expect(api.page.id).toBe(page.page.id);
    expect(page.datasources).toBeUndefined();
    expect(sourceView).toMatch(/name="action_duplicate"[^>]*string="Duplicate"/);
    expect(sourceModel).toMatch(/def action_duplicate\(self\):[\s\S]*view_mode.*form[\s\S]*res_model.*mailing\.mailing/);
    expect(duplicate).toMatchObject({
      type: 'server_form',
      title: 'Duplicate Mailing',
      permission: 'sms_marketing.write',
      action: 'mass_mailing.action_duplicate',
      handler: 'yaml_mutation',
      operation: 'duplicate',
      prefill: 'state.sms_marketing_mailing_detail',
    });
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({
      id: 'duplicate_sms_mailing',
      label: 'Duplicate',
      show_if: "state.sms_marketing_mailing_detail.state === 'Sent' && state.sms_marketing_mailing_detail.active === true",
    }));
  });

  test('creates a deterministic independent Draft copy and preserves the Sent source', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'sms_mailing_duplicate_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'sms_mailing_duplicate_test', ['schema', 'data']);

    const source = (await repository.query('SELECT * FROM sms_campaigns WHERE id = ?', ['sms-campaign-demo-003']))[0] as any;
    const values = {
      title: source.title,
      sender_name: source.sender_name,
      list_id: source.list_id,
      list_name: source.list_name,
      message: source.message,
      recipient_count: source.recipient_count,
      scheduled_at: null,
      company_name: source.company_name,
      campaign_id: source.campaign_id,
    };
    const copy = await repository.executeMutation(duplicate.mutation, {
      id: source.id,
      expected_row_version: source.row_version,
      company_name: source.company_name,
      values,
    }) as any;

    expect(copy).toMatchObject({
      id: 'sms-mailing-copy-sms-campaign-demo-003-1',
      name: 'SMS/2026/0003 (copy 1)',
      title: source.title,
      list_id: source.list_id,
      message: source.message,
      state: 'Draft',
      active: true,
      row_version: 1,
      delivered_count: 0,
      failed_count: 0,
      sent_at: null,
      last_test_valid_count: 0,
    });
    expect(await repository.query('SELECT id, state, active, row_version, delivered_count, failed_count FROM sms_campaigns WHERE id IN (?, ?) ORDER BY id', [source.id, copy.id])).toEqual([
      { id: source.id, state: 'Sent', active: true, row_version: 1, delivered_count: 116, failed_count: 4 },
      { id: copy.id, state: 'Draft', active: true, row_version: 1, delivered_count: 0, failed_count: 0 },
    ]);

    const replay = await repository.executeMutation(duplicate.mutation, {
      id: source.id,
      expected_row_version: source.row_version,
      company_name: source.company_name,
      values,
    }) as any;
    expect(replay.id).toBe('sms-mailing-copy-sms-campaign-demo-003-2');
    database.close();
  });

  test('blocks draft, archived, missing, wrong-company, stale, inactive-list, and invalid copies', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'sms_mailing_duplicate_guards', ['schema', 'data']);
    const values = { title: 'Copy', sender_name: 'Core3', list_id: 'sms-list-demo-001', list_name: 'Opt-in Customers', message: 'Copy', recipient_count: 1, scheduled_at: null, company_name: 'Core3 Demo Company', campaign_id: null };

    await expect(repository.executeMutation(duplicate.mutation, { id: 'sms-campaign-demo-004', expected_row_version: 1, company_name: 'Core3 Demo Company', values }))
      .rejects.toMatchObject({ status: 409, code: 'SMS_MAILING_DUPLICATE_BLOCKED' });
    await expect(repository.executeMutation(duplicate.mutation, { id: 'sms-campaign-demo-003', expected_row_version: 1, company_name: 'Other Company', values }))
      .rejects.toMatchObject({ status: 409, code: 'SMS_MAILING_DUPLICATE_BLOCKED' });
    await expect(repository.executeMutation(duplicate.mutation, { id: 'missing-mailing', expected_row_version: 1, company_name: 'Core3 Demo Company', values }))
      .rejects.toMatchObject({ status: 409, code: 'SMS_MAILING_DUPLICATE_BLOCKED' });
    await repository.run("UPDATE sms_campaigns SET active = false WHERE id = 'sms-campaign-demo-003'");
    await expect(repository.executeMutation(duplicate.mutation, { id: 'sms-campaign-demo-003', expected_row_version: 1, company_name: 'Core3 Demo Company', values }))
      .rejects.toMatchObject({ status: 409, code: 'SMS_MAILING_DUPLICATE_BLOCKED' });
    await repository.run("UPDATE sms_campaigns SET active = true WHERE id = 'sms-campaign-demo-003'");
    await repository.run("UPDATE sms_lists SET state = 'Archived' WHERE id = 'sms-list-demo-001'");
    await expect(repository.executeMutation(duplicate.mutation, { id: 'sms-campaign-demo-003', expected_row_version: 1, company_name: 'Core3 Demo Company', values }))
      .rejects.toMatchObject({ status: 422, code: 'SMS_MAILING_DUPLICATE_LIST_REQUIRED' });
    await repository.run("UPDATE sms_lists SET state = 'Active' WHERE id = 'sms-list-demo-001'");
    await expect(repository.executeMutation(duplicate.mutation, { id: 'sms-campaign-demo-003', expected_row_version: 0, company_name: 'Core3 Demo Company', values }))
      .rejects.toMatchObject({ status: 409, code: 'SMS_MAILING_DUPLICATE_BLOCKED' });
    await expect(repository.executeMutation(duplicate.mutation, { id: 'sms-campaign-demo-003', expected_row_version: 1, company_name: 'Core3 Demo Company', values: { ...values, message: '' } }))
      .rejects.toMatchObject({ status: 422, code: 'SMS_MAILING_DUPLICATE_REQUIRED_FIELDS' });
    database.close();
  });

  test('keeps discovery, permission, migration, and source boundaries explicit', () => {
    const discovered = isolatedDiscovery();
    expect(discovered.pageDatasources.get('sms-campaign-detail')).toContain('sms_marketing_mailing_detail');
    expect(duplicate.permission).toBe('sms_marketing.write');
    expect(duplicate.mutation).toMatchObject({ table: 'sms_campaigns' });
    expect(duplicate.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SMS_MAILING_DUPLICATE_BLOCKED', status: 409 }),
      expect.objectContaining({ code: 'SMS_MAILING_DUPLICATE_LIST_REQUIRED', status: 422 }),
      expect.objectContaining({ code: 'SMS_MAILING_DUPLICATE_REQUIRED_FIELDS', status: 422 }),
    ]));
    expect(readFileSync(join(serviceRoot, 'migrations/20260922170000-022-sms-mailing-duplicate.yaml'), 'utf8'))
      .not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid|random_uuid/i);
  });
});

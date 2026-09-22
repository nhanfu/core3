import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/sms-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const api = yaml('api/campaign-detail.yaml');
const page = yaml('pages/sms-campaign-detail.yaml');
const testAction = api.actions.find((action: any) => action.id === 'test_sms_mailing');

describe('SMS Marketing mailing test wizard', () => {
  test('maps the Odoo SMS test wizard to the existing page/API contract', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/mass_mailing_sms/models/mailing_mailing.py', 'utf8');
    const wizard = readFileSync('/home/nhanjs/projects/odoo/addons/mass_mailing_sms/wizard/mailing_sms_test_views.xml', 'utf8');

    expect(api.page.id).toBe(page.page.id);
    expect(source).toMatch(/def action_test\(self\):[\s\S]*res_model.*mailing\.sms\.test/);
    expect(wizard).toContain('id="mailing_sms_test_action"');
    expect(wizard).toContain('<field name="res_model">mailing.sms.test</field>');
    expect(wizard).toMatch(/string="Send Test" name="action_send_sms"/);
    expect(testAction).toMatchObject({
      type: 'server_form',
      permission: 'sms_marketing.write',
      title: 'Send a Sample SMS',
      action: 'mass_mailing_sms.mailing_sms_test_action',
      handler: 'yaml_mutation',
      operation: 'update',
      prefill: 'state.sms_marketing_mailing_detail',
      fields: [{ field: 'numbers', label: 'Number(s)', type: 'textarea', required: true }],
    });
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'test_sms_mailing', label: 'Test' }));
  });

  test('normalizes multiline numbers, records valid and skipped recipients, and persists the result', async () => {
    const repository = new YamlRepository(await DuckDbDatabase.open(':memory:'));
    await migrateDatabase(repository, root + '/migrations', undefined, 'sms_mailing_test_wizard', ['schema', 'data']);
    await migrateDatabase(repository, root + '/migrations', undefined, 'sms_mailing_test_wizard', ['schema', 'data']);

    const sent = await repository.executeMutation(testAction.mutation, {
      id: 'sms-campaign-demo-004',
      expected_row_version: 1,
      company_name: 'Core3 Demo Company',
      values: { numbers: ' +32 495 85 85 77\r\nnot-a-number\n+33 545 55 55 55 ' },
    });
    expect(sent).toMatchObject({
      id: 'sms-campaign-demo-004',
      last_test_numbers: '+32 495 85 85 77\nnot-a-number\n+33 545 55 55 55',
      last_test_valid_count: 2,
      last_test_invalid_numbers: 'not-a-number',
      last_test_status: 'Sent',
      row_version: 2,
    });
    expect((await repository.query('SELECT last_test_valid_count, last_test_status, row_version FROM sms_campaigns WHERE id = ?', ['sms-campaign-demo-004']))[0])
      .toEqual({ last_test_valid_count: 2, last_test_status: 'Sent', row_version: 2 });
    repository.db.close();
  });

  test('records an all-invalid sample as skipped and rejects empty, wrong-company, and stale requests', async () => {
    const repository = new YamlRepository(await DuckDbDatabase.open(':memory:'));
    await migrateDatabase(repository, root + '/migrations', undefined, 'sms_mailing_test_guards', ['schema', 'data']);
    const values = { id: 'sms-campaign-demo-004', expected_row_version: 1, company_name: 'Core3 Demo Company' };

    await expect(repository.executeMutation(testAction.mutation, { ...values, values: { numbers: 'bad-number' } }))
      .resolves.toMatchObject({ last_test_valid_count: 0, last_test_invalid_numbers: 'bad-number', last_test_status: 'Skipped', row_version: 2 });
    await expect(repository.executeMutation(testAction.mutation, { ...values, values: { numbers: '   ' } }))
      .rejects.toMatchObject({ status: 422, code: 'SMS_MAILING_TEST_NUMBERS_REQUIRED' });
    await expect(repository.executeMutation(testAction.mutation, { ...values, company_name: 'Other Company', values: { numbers: '+32495858577' } }))
      .rejects.toMatchObject({ status: 404, code: 'SMS_MAILING_NOT_FOUND' });
    await expect(repository.executeMutation(testAction.mutation, { ...values, values: { numbers: '+32495858577' } }))
      .rejects.toMatchObject({ status: 409 });
    repository.db.close();
  });

  test('keeps the bounded permission, fixed timestamp, and source separation explicit', () => {
    expect(testAction.permission).toBe('sms_marketing.write');
    expect(testAction.mutation.concurrency).toEqual({ required: true });
    expect(testAction.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SMS_MAILING_NOT_FOUND', status: 404 }),
      expect.objectContaining({ code: 'SMS_MAILING_TEST_NUMBERS_REQUIRED', status: 422 }),
    ]));
    expect(readFileSync(join(root, 'migrations/20260922160000-021-sms-mailing-test.yaml'), 'utf8'))
      .not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid|random_uuid/i);
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
  });
});

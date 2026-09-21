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
const api = yaml('api/mailing-detail.yaml');
const duplicate = api.actions.find((candidate: any) => candidate.id === 'duplicate_email_mailing');
const isolatedDiscovery = () => {
  const sandbox = join(tmpdir(), `core3-email-marketing-duplicate-discovery-${crypto.randomUUID()}`);
  mkdirSync(join(sandbox, 'services'), { recursive: true });
  cpSync(serviceRoot, join(sandbox, 'services/email-marketing'), { recursive: true });
  const discovered = discoverPages(sandbox);
  rmSync(sandbox, { recursive: true, force: true });
  return discovered;
};

describe('Email Marketing mailing duplicate parity', () => {
  test('binds the source Duplicate action to the detail page/API contract', () => {
    const page = yaml('pages/mailing-detail.yaml');
    const discovered = isolatedDiscovery();

    expect(page.page.id).toBe('mailing-detail');
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe('mailing-detail');
    expect(discovered.pageDatasources.get('mailing-detail')).toContain('email_mailing_detail');
    expect(page.components[0].header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'duplicate_email_mailing', label: 'Duplicate', show_if: "state.email_mailing_detail.state === 'Sent'" }),
    ]));
    expect(duplicate).toMatchObject({
      type: 'server_form',
      title: 'Duplicate Mailing',
      permission: 'email_marketing.write',
      action: 'email_marketing.mailings.duplicate',
      operation: 'create',
      handler: 'yaml_mutation',
      prefill: 'state.email_mailing_detail',
    });
    expect(duplicate.mutation.operation).toBe('insert');
    expect(duplicate.mutation.guards[0].code).toBe('EMAIL_MAILING_DUPLICATE_BLOCKED');
  });

  test('creates an independent durable Draft copy and leaves the Sent source unchanged', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_mailing_duplicate_test', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_mailing_duplicate_test', ['schema', 'data']);

    const source = (await repository.query('SELECT * FROM email_mailings WHERE id = ?', ['email-mailing-monthly-newsletter']))[0] as any;
    const values = Object.fromEntries(['subject', 'preview', 'email_from', 'reply_to', 'recipient_model', 'recipient_model_label', 'recipient_domain', 'responsible', 'recipient_count', 'schedule_date', 'mailing_list_names', 'campaign_name', 'body', 'ab_testing_enabled'].map((field) => [field, source[field]]));
    const copy = await repository.executeMutation(duplicate.mutation, { id: source.id, expected_row_version: source.row_version, values }) as any;

    expect(copy).toMatchObject({
      id: 'email-mailing-copy-email-mailing-monthly-newsletter-1',
      subject: source.subject,
      email_from: source.email_from,
      body: source.body,
      mailing_list_names: source.mailing_list_names,
      state: 'Draft',
      schedule_type: 'now',
      row_version: 1,
      favorite: false,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      failed: 0,
      sent_date: null,
      calendar_date: null,
    });
    expect(await repository.query('SELECT id, state, row_version, sent, delivered FROM email_mailings WHERE id IN (?, ?) ORDER BY id', [source.id, copy.id])).toEqual([
      { id: copy.id, state: 'Draft', row_version: 1, sent: 0, delivered: 0 },
      { id: source.id, state: 'Sent', row_version: 1, sent: 6, delivered: 5 },
    ]);

    const replay = await repository.executeMutation(duplicate.mutation, { id: source.id, expected_row_version: source.row_version, values }) as any;
    expect(replay.id).toBe('email-mailing-copy-email-mailing-monthly-newsletter-2');
    await expect(repository.executeMutation(duplicate.mutation, { id: source.id, expected_row_version: 0, values }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_DUPLICATE_BLOCKED' });
    database.close();
  });

  test('blocks non-Sent, inactive, missing, and invalid duplicate sources', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_mailing_duplicate_guards', ['schema', 'data']);
    const values = { subject: 'Copy', email_from: 'copy@example.com', recipient_model: 'mailing.list', recipient_model_label: 'Mailing Contact', responsible: 'QA', recipient_count: 1, body: '<p>Copy</p>' };

    await expect(repository.executeMutation(duplicate.mutation, { id: 'email-mailing-lead-feedback', expected_row_version: 1, values }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_DUPLICATE_BLOCKED' });
    await repository.run("UPDATE email_mailings SET active = false WHERE id = 'email-mailing-monthly-newsletter'");
    await expect(repository.executeMutation(duplicate.mutation, { id: 'email-mailing-monthly-newsletter', expected_row_version: 1, values }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_DUPLICATE_BLOCKED' });
    await expect(repository.executeMutation(duplicate.mutation, { id: 'missing-mailing', expected_row_version: 1, values }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_DUPLICATE_BLOCKED' });
    await repository.run("UPDATE email_mailings SET active = true WHERE id = 'email-mailing-monthly-newsletter'");
    await expect(repository.executeMutation(duplicate.mutation, { id: 'email-mailing-monthly-newsletter', expected_row_version: 1, values: { ...values, body: '' } }))
      .rejects.toMatchObject({ status: 400 });
    database.close();
  });
});

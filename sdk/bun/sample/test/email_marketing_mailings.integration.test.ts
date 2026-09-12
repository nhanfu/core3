import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/email-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const listApi = yaml('api/mailings.yaml');
const detailApi = yaml('api/mailing-detail.yaml');
const action = (id: string) => [...(listApi.actions ?? []), ...(detailApi.actions ?? [])]
  .find((candidate: any) => candidate.id === id);

describe('Email Marketing Mailings parity action', () => {
  test('keeps list and form layouts presentation-only and binds page APIs by id', () => {
    const listPage = yaml('pages/mailings.yaml');
    const detailPage = yaml('pages/mailing-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(listPage.page.id).toBe('email-mailings');
    expect(detailPage.page.id).toBe('mailing-detail');
    expect(listPage.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(discovered.pageDatasources.get('email-mailings')).toEqual(['email_mailing_states', 'email_mailings']);
    expect(discovered.pageDatasources.get('mailing-detail')).toEqual(['email_mailing_detail']);
    expect(listPage.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'form', 'calendar']);
    expect(listPage.components[0].views.find((view: any) => view.id === 'calendar')).toMatchObject({ date_field: 'calendar_date', mobile: false });
    expect(listPage.components[0].columns.map((column: any) => column.label)).toEqual([
      'Date', 'Subject', 'Responsible', 'Sent', 'Delivered (%)', 'Opened (%)', 'Clicked (%)', 'Replied (%)', 'Status',
    ]);
    expect(detailPage.components[0].notebook.tabs.map((tab: any) => tab.label)).toEqual(['Mail Body', 'A/B Tests', 'Settings']);
    expect(yaml('manifest.yaml').menu['email-marketing'].groups[0].items)
      .toEqual(expect.arrayContaining([expect.objectContaining({ path: '/email-mailings', label: 'Mailings' })]));
  });

  test('seeds deterministic states and supports Odoo list filters plus empty results', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_mailings_seed_test', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_mailings_seed_test', ['schema', 'data']);

    const source = listApi.datasources.find((candidate: any) => candidate.id === 'email_mailings');
    const all = await repository.querySource(source, { q: null, state: null, active: null, sent_date: null, ab_testing_enabled: null, fixture_state: null }, 0, 50);
    expect(all.data.map((row: any) => `${row.state}:${row.subject}`)).toEqual([
      'Draft:We want to hear from you!',
      'Draft:Our last promotions, just for you!',
      'In Queue:Quarterly Product Briefing',
      'Sending:Customer Onboarding Tips',
      'Sent:Monthly Newsletter',
    ]);
    expect(all.data.find((row: any) => row.subject === 'Monthly Newsletter')).toMatchObject({
      sent: 6, received_ratio: 62.5, opened_ratio: 80, replied_ratio: 40, state: 'Sent',
    });
    expect((await repository.querySource(source, { q: 'Monthly', state: null, active: null, sent_date: null, ab_testing_enabled: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id))
      .toEqual(['email-mailing-monthly-newsletter']);
    expect((await repository.querySource(source, { q: null, state: 'In Queue', active: null, sent_date: null, ab_testing_enabled: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.subject))
      .toEqual(['Quarterly Product Briefing']);
    expect((await repository.querySource(source, { q: null, state: null, active: 'false', sent_date: null, ab_testing_enabled: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.subject))
      .toEqual(['Welcome Series Template']);
    expect((await repository.querySource(source, { q: null, state: null, active: null, sent_date: null, ab_testing_enabled: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
  });

  test('enforces send, schedule, cancel, retry, and stale-row guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_mailings_workflow_test', ['schema', 'data']);

    const schedule = action('schedule_email_mailing');
    expect(schedule).toMatchObject({ type: 'server_form', title: 'When do you want to send your mailing?', fields: [{ field: 'schedule_date', label: 'Send on', required: true }] });
    await expect(repository.executeMutation(schedule.mutation, { id: 'email-mailing-lead-feedback', expected_row_version: 1, values: { schedule_date: '2026-01-15 10:00:00' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMAIL_MAILING_SCHEDULE_DATE_INVALID' });
    const queued = await repository.executeMutation(schedule.mutation, { id: 'email-mailing-lead-feedback', expected_row_version: 1, values: { schedule_date: '2026-01-16 12:00:00' } });
    expect(queued).toMatchObject({ state: 'In Queue', schedule_type: 'scheduled', schedule_date: '2026-01-16T12:00:00.000Z', row_version: 2 });
    await expect(repository.executeMutation(schedule.mutation, { id: 'email-mailing-lead-feedback', expected_row_version: 1, values: { schedule_date: '2026-01-17 12:00:00' } }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_NOT_READY' });

    const cancel = action('cancel_email_mailing');
    const draft = await repository.executeMutation(cancel.mutation, { id: 'email-mailing-lead-feedback', expected_row_version: 2 });
    expect(draft).toMatchObject({ state: 'Draft', schedule_type: 'now', schedule_date: null, row_version: 3 });
    await expect(repository.executeMutation(cancel.mutation, { id: 'email-mailing-lead-feedback', expected_row_version: 3 }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_CANCEL_BLOCKED' });

    const send = action('send_email_mailing');
    await expect(repository.executeMutation(send.mutation, { id: 'email-mailing-promotions', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_SEND_BLOCKED' });
    const sent = await repository.executeMutation(send.mutation, { id: 'email-mailing-lead-feedback', expected_row_version: 3 });
    expect(sent).toMatchObject({ state: 'Sent', sent: 39, expected: 39, delivered: 39, received_ratio: 100, row_version: 4 });

    const retry = action('retry_email_mailing');
    const retried = await repository.executeMutation(retry.mutation, { id: 'email-mailing-monthly-newsletter', expected_row_version: 1 });
    expect(retried).toMatchObject({ state: 'In Queue', schedule_type: 'now', row_version: 2 });
    await expect(repository.executeMutation(retry.mutation, { id: 'email-mailing-monthly-newsletter', expected_row_version: 1 }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_RETRY_BLOCKED' });
  });

  test('matches the Odoo Mailing Test wizard and validates multiline recipients', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_mailing_test_wizard', ['schema', 'data']);

    const mailingTest = action('test_email_mailing');
    expect(mailingTest).toMatchObject({
      type: 'server_form',
      title: 'Send a Sample Mail',
      description: 'Send a sample mailing for testing purpose to the address below.',
      submit_label: 'Send test',
      cancel_label: 'Cancel',
      fields: [{ field: 'last_test_recipients', label: 'Recipients', type: 'textarea', required: true }],
    });

    await expect(repository.executeMutation(mailingTest.mutation, {
      id: 'email-mailing-lead-feedback', expected_row_version: 1,
      values: { last_test_recipients: 'not-an-email' },
    })).rejects.toMatchObject({ status: 422, code: 'EMAIL_MAILING_TEST_EMAIL_INVALID' });

    const sent = await repository.executeMutation(mailingTest.mutation, {
      id: 'email-mailing-lead-feedback', expected_row_version: 1,
      values: { last_test_recipients: 'qa@example.com\nmarketing@example.com' },
    });
    expect(sent).toMatchObject({
      last_test_recipients: 'qa@example.com\nmarketing@example.com',
      last_test_email: 'qa@example.com',
      row_version: 2,
    });
    await expect(repository.executeMutation(mailingTest.mutation, {
      id: 'email-mailing-lead-feedback', expected_row_version: 1,
      values: { last_test_recipients: 'qa@example.com' },
    })).rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_TEST_STATE_CHANGED' });
  });

  test('keeps permissions, mock states, and deterministic mutation contracts explicit', () => {
    expect(listApi.datasources.every((source: any) => source.permission === 'email_marketing.read')).toBe(true);
    expect(detailApi.datasources[0].error_states).toMatchObject({
      missing_record: { status: 404, code: 'EMAIL_MAILING_NOT_FOUND' },
      transport_error: { status: 503, code: 'EMAIL_MAILING_DETAIL_UNAVAILABLE' },
    });
    expect(listApi.datasources.every((source: any) => source.query && !source.data)).toBe(true);
    expect(detailApi.datasources.every((source: any) => source.query && !source.data)).toBe(true);
    for (const id of ['create_email_mailing', 'archive_email_mailing', 'restore_email_mailing', 'favorite_email_mailing', 'send_email_mailing', 'schedule_email_mailing', 'cancel_email_mailing', 'retry_email_mailing', 'test_email_mailing']) {
      expect(action(id), id).toBeDefined();
      expect(action(id).permission, id).toMatch(/^email_marketing\.(read|write|manage)$/);
      expect(action(id).mutation, id).toBeDefined();
    }
    expect(action('edit_email_mailing').mutation.concurrency).toEqual({ required: true });
    expect(action('test_email_mailing').fields[0]).toMatchObject({ field: 'last_test_recipients', type: 'textarea' });
    for (const file of ['20260911010000-008-email-mailings.yaml', '20260911011000-009-email-mailings-demo.yaml']) {
      expect(readFileSync(join(serviceRoot, 'migrations', file), 'utf8')).not.toMatch(/CURRENT_TIMESTAMP|CURRENT_DATE|gen_random_uuid|random_uuid/i);
    }
  });
});

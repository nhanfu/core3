import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/email-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const apiFiles = ['api/campaigns.yaml', 'api/campaign-detail.yaml', 'api/lists.yaml', 'api/list-detail.yaml'];
const action = (id: string) => apiFiles.map(yaml).flatMap((api: any) => api.actions ?? []).find((candidate: any) => candidate.id === id);

describe('Email Marketing campaign and mailing list slice', () => {
  test('keeps pages layout-only and discovers page-bound API fragments', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('email-campaigns')).toEqual(expect.arrayContaining(['email_campaign_states', 'mailing_list_lookup', 'email_campaigns']));
    expect(discovered.pageDatasources.get('email-campaign-detail')).toContain('email_campaign_detail');
    expect(discovered.pageDatasources.get('mailing-lists')).toContain('mailing_lists');
    expect(discovered.pageDatasources.get('mailing-list-detail')).toContain('mailing_list_detail');
    for (const file of ['pages/campaigns.yaml', 'pages/campaign-detail.yaml', 'pages/lists.yaml', 'pages/email-campaign-list-detail.yaml']) {
      expect(yaml(file).datasources, file).toBeUndefined();
    }
  });

  test('seeds deterministic records idempotently and enforces CRUD/conflict guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_campaign_slice_test', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_campaign_slice_test', ['schema', 'data']);

    const campaigns = yaml('api/campaigns.yaml').datasources.find((source: any) => source.id === 'email_campaigns');
    const lists = yaml('api/lists.yaml').datasources.find((source: any) => source.id === 'mailing_lists');
    expect((await repository.querySource(campaigns, { q: null, state: null, active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id))
      .toEqual(['email-campaign-ab-001', 'email-campaign-sent-001', 'email-campaign-sending-001', 'email-campaign-scheduled-001', 'email-campaign-demo-001']);
    expect((await repository.querySource(lists, { q: null, active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name))
      .toEqual(['Archived Customers', 'Customers', 'Empty list', 'Imported Contacts'].slice(1));
    expect((await repository.querySource(lists, { q: null, active: 'false', fixture_state: null }, 0, 50)).data.map((row: any) => row.name))
      .toEqual(['Archived Customers']);
    expect((await repository.querySource(lists, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const createList = action('create_mailing_list');
    const createdList = await repository.executeMutation(createList.mutation, { values: { name: 'Event follow-up', description: 'A bounded fixture list' } });
    expect(createdList).toMatchObject({ id: 'mailing-list-event-follow-up', name: 'Event follow-up', active: true });
    await expect(repository.executeMutation(createList.mutation, { values: { name: 'event FOLLOW-UP' } }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_MAILING_LIST_EXISTS' });
    await expect(repository.executeMutation(createList.mutation, { values: { name: ' ' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMAIL_MAILING_LIST_NAME_REQUIRED' });

    const editList = action('edit_mailing_list');
    const editedList = await repository.executeMutation(editList.mutation, { id: createdList.id, expected_row_version: 1, values: { name: 'Event follow-up', description: 'Updated' } });
    expect(editedList).toMatchObject({ name: 'Event follow-up', row_version: 2 });
    await expect(repository.executeMutation(editList.mutation, { id: createdList.id, expected_row_version: 1, values: { name: 'Stale' } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
  });

  test('guards campaign readiness, workflow transitions, archive, and immutable sent records', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'email_campaign_workflow_test', ['schema', 'data']);
    const create = action('create_email_campaign');
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Missing body', subject: 'Subject', sender_name: 'Core3', sender_email: 'bad', list_id: 'mailing-list-demo-001', list_name: 'Customers', recipient_count: 1 } }))
      .rejects.toMatchObject({ status: 422, code: 'EMAIL_CAMPAIGN_REQUIRED_FIELDS' });
    const workflow = yaml('pages/email-workflow.yaml').workflow;
    const transition = (id: string) => workflow.transitions.find((candidate: any) => candidate.id === id).mutation;
    const scheduled = await repository.executeMutation(transition('schedule'), { id: 'email-campaign-demo-001', expected_row_version: 1 });
    expect(scheduled).toMatchObject({ state: 'Scheduled', scheduled_at: '2026-01-16T08:00:00.000Z' });
    const sending = await repository.executeMutation(transition('send'), { id: 'email-campaign-demo-001', expected_row_version: 2 });
    expect(sending).toMatchObject({ state: 'Sending', row_version: 3 });
    await expect(repository.executeMutation(action('archive_email_campaign').mutation, { id: 'email-campaign-demo-001', expected_row_version: 3 }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_CAMPAIGN_ARCHIVE_BLOCKED' });
    const sent = await repository.executeMutation(transition('complete'), { id: 'email-campaign-demo-001', expected_row_version: 3 });
    expect(sent).toMatchObject({ state: 'Sent', sent_at: '2026-01-15T10:15:00.000Z', delivered_count: 1250, row_version: 4 });
    await expect(repository.executeMutation(action('edit_email_campaign').mutation, { id: 'email-campaign-demo-001', expected_row_version: 4, values: { name: 'Immutable', subject: 'Nope', sender_name: 'Core3', sender_email: 'news@example.com', list_id: 'mailing-list-demo-001', list_name: 'Customers', body: '<p>Nope</p>', recipient_count: 1 } }))
      .rejects.toMatchObject({ status: 409, code: 'EMAIL_CAMPAIGN_IMMUTABLE' });
  });
});

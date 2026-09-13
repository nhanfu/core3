import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/sms-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const listApi = yaml('api/campaigns.yaml');
const detailApi = yaml('api/campaign-detail.yaml');
const action = (id: string) => [...(listApi.actions ?? []), ...(detailApi.actions ?? [])].find((candidate: any) => candidate.id === id);

describe('SMS Marketing mailing action parity', () => {
  test('joins presentation pages and backend APIs by page.id with Odoo view modes', () => {
    const listPage = yaml('pages/campaigns.yaml');
    const detailPage = yaml('pages/sms-campaign-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(listPage.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(discovered.pageDatasources.get('sms-campaigns')).toEqual(['sms_mailing_states', 'sms_marketing_mailings']);
    expect(discovered.pageDatasources.get('sms-campaign-detail')).toEqual(['sms_marketing_mailing_detail']);
    expect(listPage.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'form', 'calendar', 'graph']);
    expect(listPage.components[0].columns.map((column: any) => column.label)).toEqual(['Date', 'Title', 'Recipients', 'Sent', 'Clicked (%)', 'Bounced (%)', 'Status']);
    expect(detailPage.components[0].notebook.tabs.map((tab: any) => tab.label)).toEqual(['SMS Content', 'Settings']);
    expect(yaml('manifest.yaml').menu.groups[0].items[0]).toMatchObject({ path: '/sms-campaigns', label: 'SMS Marketing' });
    const workflowActions = detailPage.components[0].header_actions.map((button: any) => button.id).filter((id: string) => id.endsWith('_reload'));
    expect(workflowActions).toEqual(['send_sms_campaign_reload', 'schedule_sms_campaign_reload', 'cancel_sms_campaign_reload', 'complete_sms_campaign_reload']);
    for (const id of workflowActions) {
      const workflowAction = detailPage.actions.find((candidate: any) => candidate.id === id);
      expect(workflowAction, id).toMatchObject({ type: 'client', permission: expect.stringMatching(/^sms_marketing\.(write|manage)$/) });
      expect(workflowAction.script).toContain('AbortController');
      expect(workflowAction.script).toContain('setTimeout(() => controller.abort(), 10000)');
      expect(workflowAction.script).toContain('window.location.reload()');
    }
  });

  test('seeds idempotently and supports search, empty, create, validation, and stale update', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'sms_campaign_action_test', ['schema', 'data']);
    await migrateDatabase(repository, root + '/migrations', undefined, 'sms_campaign_action_test', ['schema', 'data']);
    const source = listApi.datasources.find((candidate: any) => candidate.id === 'sms_marketing_mailings');
    const all = await repository.querySource(source, { q: null, state: null, fixture_state: null }, 0, 50);
    expect(all.data.map((row: any) => row.subject)).toEqual(['Delivery confirmation', 'Service update', 'September maintenance', 'New customer welcome']);
    expect((await repository.querySource(source, { q: 'maintenance', state: null, fixture_state: null }, 0, 50)).data[0].state).toBe('In Queue');
    expect((await repository.querySource(source, { q: null, state: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const create = action('create_sms_campaign');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'SMS/2026/0099', title: 'Weekend offer', sender_name: 'Core3', list_id: 'sms-list-demo-001', list_name: 'Opt-in Customers', message: 'Save this weekend.', recipient_count: 840, scheduled_at: '2026-09-14 09:00:00' } });
    expect(created).toMatchObject({ name: 'SMS/2026/0099', title: 'Weekend offer', state: 'Draft' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'SMS/2026/0099', title: 'Duplicate', list_id: 'sms-list-demo-001', list_name: 'Opt-in Customers', message: 'Duplicate', recipient_count: 1 } })).rejects.toMatchObject({ status: 409, code: 'SMS_MAILING_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'SMS/invalid', title: '', list_id: 'sms-list-demo-001', list_name: 'Opt-in Customers', message: '', recipient_count: 0 } })).rejects.toMatchObject({ status: 422, code: 'SMS_MAILING_REQUIRED_FIELDS' });
    const edit = action('edit_sms_campaign');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { title: 'Updated offer', list_name: 'Opt-in Customers', message: 'Updated.', recipient_count: 800 } });
    expect(edited).toMatchObject({ title: 'Updated offer', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { title: 'Stale', list_name: 'Opt-in Customers', message: 'Stale.', recipient_count: 1 } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
  });

  test('declares source permissions and transport/not-found contracts', () => {
    expect(listApi.datasources.every((source: any) => source.permission === 'sms_marketing.read')).toBe(true);
    expect(detailApi.datasources[0].error_states).toMatchObject({ missing_record: { status: 404, code: 'SMS_MAILING_NOT_FOUND' }, transport_error: { status: 503 } });
    for (const id of ['create_sms_campaign', 'edit_sms_campaign', 'send_sms_campaign', 'schedule_sms_campaign', 'cancel_sms_campaign', 'complete_sms_campaign']) {
      expect(action(id), id).toBeDefined();
      expect(action(id).permission, id).toMatch(/^sms_marketing\.(read|write|manage)$/);
    }
    expect(action('complete_sms_campaign')).toMatchObject({ permission: 'sms_marketing.manage', operation: 'complete', workflow: 'sms_campaigns' });
    expect(detailApi.datasources[0].query).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random_uuid|gen_random_uuid/i);
    expect(readFileSync(join(root, 'migrations/20260912150000-003-sms-mailing-action.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random_uuid|gen_random_uuid/i);
  });

  test('persists the full delivery lifecycle and rejects stale transitions', async () => {
    const repository = new YamlRepository(await DuckDbDatabase.open(':memory:'));
    await migrateDatabase(repository, root + '/migrations', undefined, 'sms_campaign_lifecycle_test', ['schema', 'data']);
    const workflow = yaml('pages/sms-workflow.yaml').workflow;
    const transition = (id: string) => workflow.transitions.find((candidate: any) => candidate.id === id);

    const scheduled = await repository.executeMutation(transition('schedule').mutation, { id: 'sms-campaign-demo-004', expected_row_version: 1 });
    expect(scheduled).toMatchObject({ state: 'In Queue', row_version: 2 });
    const sending = await repository.executeMutation(transition('send').mutation, { id: 'sms-campaign-demo-004', expected_row_version: 2 });
    expect(sending).toMatchObject({ state: 'Sending', row_version: 3 });
    const sent = await repository.executeMutation(transition('complete').mutation, { id: 'sms-campaign-demo-004', expected_row_version: 3 });
    expect(sent).toMatchObject({ state: 'Sent', row_version: 4, delivered_count: 24, failed_count: 0 });
    await expect(repository.executeMutation(transition('complete').mutation, { id: 'sms-campaign-demo-004', expected_row_version: 3 })).rejects.toMatchObject({ status: 409, code: 'SMS_MAILING_STALE' });
    const [persisted] = await repository.query('SELECT state, row_version, delivered_count FROM sms_campaigns WHERE id = ?', ['sms-campaign-demo-004']);
    expect(persisted).toEqual({ state: 'Sent', row_version: 4, delivered_count: 24 });
  });
});

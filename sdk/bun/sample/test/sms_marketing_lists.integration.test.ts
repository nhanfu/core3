import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/sms-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const listPage = yaml('pages/lists.yaml');
const listApi = yaml('api/lists.yaml');
const detailPage = yaml('pages/list-detail.yaml');
const detailApi = yaml('api/list-detail.yaml');
const action = (id: string) => [...(listApi.actions ?? []), ...(detailApi.actions ?? [])].find((candidate: any) => candidate.id === id);

describe('SMS Marketing Mailing Lists action parity', () => {
  test('joins the Odoo mailing-list action and preserves view/menu ordering', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(discovered.pageDatasources.get('sms-lists')).toEqual(['sms_lists', 'sms_list_states']);
    expect(discovered.pageDatasources.get('sms-list-detail')).toEqual(['sms_list_detail']);
    expect(listPage.components[0].views.map((view: any) => view.id)).toEqual(['kanban', 'list', 'form']);
    expect(listPage.components[0].columns.map((column: any) => column.label)).toEqual([
      'Mailing Lists', 'Public', 'Mailings', 'Bounce (%)', 'Opt-out (%)', 'Blacklist (%)', 'Recipients', 'Status',
    ]);
    expect(detailPage.components[0].header_actions[0]).toMatchObject({ id: 'send_sms_from_list', label: 'Send SMS' });
    expect(yaml('manifest.yaml').menu.groups[0].items[1]).toMatchObject({ path: '/sms-lists', label: 'Mailing Lists' });
  });

  test('seeds idempotently and supports search, archive filter, empty state, and create/edit validation', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'sms_lists_action_test', ['schema', 'data']);
    await migrateDatabase(repository, root + '/migrations', undefined, 'sms_lists_action_test', ['schema', 'data']);
    const source = listApi.datasources.find((candidate: any) => candidate.id === 'sms_lists');
    const all = await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50);
    expect(all.data.map((row: any) => row.name)).toEqual(['Former Subscribers', 'Opt-in Customers', 'VIP Customers']);
    expect((await repository.querySource(source, { q: 'VIP', active: true, fixture_state: null }, 0, 50)).data[0]).toMatchObject({ name: 'VIP Customers', contact_count_sms: 186 });
    expect((await repository.querySource(source, { q: null, active: false, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Former Subscribers']);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const create = action('create_sms_list');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Weekend Subscribers', description: 'Weekend offers', is_public: false } });
    expect(created).toMatchObject({ name: 'Weekend Subscribers', state: 'Active' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'VIP Customers' } })).rejects.toMatchObject({ status: 409, code: 'SMS_LIST_EXISTS' });
    const edit = action('edit_sms_list');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Weekend Customers', description: 'Updated', is_public: true } });
    expect(edited).toMatchObject({ name: 'Weekend Customers', row_version: 2, is_public: true });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
  });

  test('declares read/write permissions and explicit detail failure contracts', () => {
    expect(listApi.datasources.every((source: any) => source.permission === 'sms_marketing.read')).toBe(true);
    expect(detailApi.datasources[0].error_states).toMatchObject({ missing_record: { status: 404, code: 'SMS_LIST_NOT_FOUND' }, transport_error: { status: 503 } });
    expect(action('create_sms_list').permission).toBe('sms_marketing.write');
    expect(action('edit_sms_list').permission).toBe('sms_marketing.write');
    expect(action('send_sms_from_list').permission).toBe('sms_marketing.write');
    expect(listApi.datasources[0].query).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random_uuid|gen_random_uuid/i);
  });
});

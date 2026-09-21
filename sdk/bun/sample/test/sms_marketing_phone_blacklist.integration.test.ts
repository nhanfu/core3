import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/sms-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const apis = () => [yaml('api/phone-blacklist.yaml'), yaml('api/phone-blacklist-detail.yaml')];
const action = (id: string) => apis().flatMap((api: any) => api.actions ?? []).find((candidate: any) => candidate.id === id);

describe('SMS Marketing blacklisted phone numbers parity action', () => {
  test('keeps page/API contracts separate and exposes the Odoo configuration menu', () => {
    const listPage = yaml('pages/phone-blacklist.yaml');
    const detailPage = yaml('pages/phone-blacklist-detail.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const config = manifest.menu.groups.find((group: any) => group.id === 'configuration');

    expect(listPage.page).toMatchObject({ id: 'sms-phone-blacklist', route: '/sms-phone-blacklist', auth: { require: ['sms_marketing.manage'] } });
    expect(detailPage.page).toMatchObject({ id: 'sms-phone-blacklist-detail', route: '/sms-phone-blacklist/detail', auth: { require: ['sms_marketing.manage'] } });
    expect(listPage.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form']);
    expect(listPage.components[0].columns.map((column: any) => column.label)).toEqual(['Blacklist Date', 'Number', ' ']);
    expect(yaml('api/phone-blacklist.yaml').page.id).toBe(listPage.page.id);
    expect(yaml('api/phone-blacklist-detail.yaml').page.id).toBe(detailPage.page.id);
    expect(discovered.pageDatasources.get('sms-phone-blacklist')).toContain('sms_phone_blacklist_records');
    expect(discovered.pageDatasources.get('sms-phone-blacklist-detail')).toContain('sms_phone_blacklist_detail');
    expect(config.items).toContainEqual(expect.objectContaining({ path: '/sms-phone-blacklist', label: 'Blacklisted Phone Numbers', permission: 'sms_marketing.manage' }));
  });

  test('supports deterministic active/archive reads, normalized CRUD, state guards, and migration replay', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'sms_phone_blacklist_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'sms_phone_blacklist_test_migrations', ['schema', 'data']);

    const source = yaml('api/phone-blacklist.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.number))
      .toEqual(['+33698765432', '+14155550199', '+84901234009']);
    expect((await repository.querySource(source, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data.map((row: any) => row.number))
      .toEqual(['+33698765432']);
    expect((await repository.querySource(source, { q: '1415', active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id))
      .toEqual(['sms-phone-blacklist-14155550199']);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const create = action('create_sms_phone_blacklist');
    const created = await repository.executeMutation(create.mutation, { values: { number: ' +84 (901) 234-567 ' } });
    expect(created).toMatchObject({ id: 'sms-phone-blacklist-84901234567', number: '+84901234567', active: true, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { number: '+84 901 234 567' } }))
      .rejects.toMatchObject({ status: 409, code: 'SMS_PHONE_BLACKLIST_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { number: '0901234567' } }))
      .rejects.toMatchObject({ status: 422, code: 'SMS_PHONE_BLACKLIST_NUMBER_INVALID' });

    const edit = action('edit_sms_phone_blacklist');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { number: '+84 901 234 568' } });
    expect(edited).toMatchObject({ number: '+84901234568', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { number: '+84901234569' } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const archive = action('unblacklist_sms_phone_detail');
    const archived = await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false, last_action_reason: 'Customer requested reactivation.' } });
    expect(archived).toMatchObject({ active: false, last_action_reason: 'Customer requested reactivation.', row_version: 3 });
    await expect(repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false } }))
      .rejects.toMatchObject({ status: 409, code: 'SMS_PHONE_BLACKLIST_STATE_CHANGED' });

    const restore = action('blacklist_sms_phone_detail');
    const restored = await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, values: { active: true, last_action_reason: 'Blacklisted from SMS Marketing configuration.' } });
    expect(restored).toMatchObject({ active: true, row_version: 4 });

    const detail = yaml('api/phone-blacklist-detail.yaml').datasources[0];
    expect((await repository.querySource(detail, { id: created.id, fixture_state: null }, 0, 1)).data).toMatchObject({ number: '+84901234568', active: true });
    await expect(repository.executeMutation(edit.mutation, { id: 'sms-phone-blacklist-missing', expected_row_version: 1, values: { number: '+84901234570' } }))
      .rejects.toMatchObject({ status: 404, code: 'SMS_PHONE_BLACKLIST_NOT_FOUND' });
    database.close();
  });

  test('keeps configuration permission and transport contracts explicit', () => {
    const api = yaml('api/phone-blacklist.yaml');
    const detailApi = yaml('api/phone-blacklist-detail.yaml');
    expect(api.datasources[0]).toMatchObject({ permission: 'sms_marketing.manage', error_states: { transport_error: { status: 503, code: 'SMS_PHONE_BLACKLIST_UNAVAILABLE' } } });
    expect(detailApi.datasources[0]).toMatchObject({ permission: 'sms_marketing.manage', error_states: { transport_error: { status: 503, code: 'SMS_PHONE_BLACKLIST_DETAIL_UNAVAILABLE' } } });
    for (const id of ['create_sms_phone_blacklist', 'edit_sms_phone_blacklist', 'edit_sms_phone_blacklist_detail', 'blacklist_sms_phone_detail', 'unblacklist_sms_phone_detail']) {
      expect(action(id), id).toBeDefined();
      expect(action(id).permission, id).toBe('sms_marketing.manage');
      expect(action(id).mutation, id).toBeDefined();
    }
  });
});

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/sms-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const apis = () => [yaml('api/link-trackers.yaml'), yaml('api/link-tracker-detail.yaml')];
const action = (id: string) => apis().flatMap((api: any) => api.actions ?? []).find((candidate: any) => candidate.id === id);

describe('SMS Marketing Link Tracker parity', () => {
  test('keeps the Odoo menu, page/API ownership, and list/form/graph modes', () => {
    const page = yaml('pages/link-trackers.yaml');
    const detail = yaml('pages/link-tracker-detail.yaml');
    const manifest = yaml('manifest.yaml');
    const config = manifest.menu.groups.find((group: any) => group.id === 'configuration');

    expect(page.page).toMatchObject({ id: 'sms-link-trackers', route: '/sms-link-trackers', auth: { require: ['sms_marketing.read'] } });
    expect(detail.page).toMatchObject({ id: 'sms-link-tracker-detail', route: '/sms-link-trackers/detail', auth: { require: ['sms_marketing.read'] } });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form', 'graph']);
    expect(yaml('api/link-trackers.yaml').page.id).toBe(page.page.id);
    expect(yaml('api/link-tracker-detail.yaml').page.id).toBe(detail.page.id);
    expect(yaml('api/link-trackers.yaml').datasources.map((source: any) => source.id)).toContain('sms_link_trackers');
    expect(yaml('api/link-tracker-detail.yaml').datasources.map((source: any) => source.id)).toContain('sms_link_tracker_detail');
    expect(config.items).toContainEqual(expect.objectContaining({ path: '/sms-link-trackers', label: 'Link Tracker', permission: 'sms_marketing.read' }));
  });

  test('seeds deterministic links idempotently and covers query, CRUD, validation, conflicts, and stale rows', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'sms_link_trackers_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'sms_link_trackers_test', ['schema', 'data']);

    const source = yaml('api/link-trackers.yaml').datasources[0];
    const params = { q: null, campaign_name: null, medium_name: null, source_name: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id))
      .toEqual(['sms-link-summer-sale', 'sms-link-account-help', 'sms-link-new-feature', 'sms-link-pricing']);
    expect((await repository.querySource(source, { ...params, q: 'pricing' }, 0, 50)).data[0].title).toBe('Pricing page');
    expect((await repository.querySource(source, { ...params, campaign_name: 'Summer SMS' }, 0, 50)).data.map((row: any) => row.id))
      .toEqual(['sms-link-summer-sale', 'sms-link-pricing']);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const create = action('create_sms_link_tracker');
    const created = await repository.executeMutation(create.mutation, {
      values: { url: 'https://core3.local/new', title: 'New page', label: 'Open', campaign_name: '', medium_name: 'SMS', source_name: 'Test' },
    });
    expect(created).toMatchObject({ id: 'sms-link-https-core3-local-new-open-sms-test', count: 0, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { url: 'https://core3.local/new', title: 'New page', label: 'Open', campaign_name: '', medium_name: 'SMS', source_name: 'Test' } }))
      .rejects.toMatchObject({ status: 409, code: 'SMS_LINK_TRACKER_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { url: 'not-a-url' } }))
      .rejects.toMatchObject({ status: 422, code: 'SMS_LINK_TRACKER_URL_INVALID' });

    const edit = action('edit_sms_link_tracker');
    expect(await repository.executeMutation(edit.mutation, {
      id: created.id,
      expected_row_version: 1,
      values: { url: 'https://core3.local/new', title: 'Updated', label: 'Open', campaign_name: '', medium_name: 'SMS', source_name: 'Test' },
    })).toMatchObject({ row_version: 2, title: 'Updated' });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { url: 'https://core3.local/new', title: 'Stale' } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    await repository.executeMutation(action('delete_sms_link_tracker').mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-link', expected_row_version: 1, values: { url: 'https://core3.local/missing' } }))
      .rejects.toMatchObject({ status: 404, code: 'SMS_LINK_TRACKER_NOT_FOUND' });
    database.close();
  });

  test('keeps read/write boundaries and stable failure states explicit', () => {
    const api = yaml('api/link-trackers.yaml');
    const detailApi = yaml('api/link-tracker-detail.yaml');
    expect(api.datasources[0]).toMatchObject({ permission: 'sms_marketing.read', error_states: { transport_error: { status: 503 } } });
    expect(detailApi.datasources[0]).toMatchObject({ permission: 'sms_marketing.read', error_states: { transport_error: { status: 503 } } });
    for (const id of ['create_sms_link_tracker', 'edit_sms_link_tracker', 'edit_sms_link_tracker_detail', 'delete_sms_link_tracker']) {
      expect(action(id), id).toBeDefined();
      expect(action(id).permission, id).toBe('sms_marketing.write');
      expect(action(id).mutation, id).toBeDefined();
    }
    for (const id of ['visit_sms_link_tracker', 'view_sms_link_tracker_clicks']) expect(action(id).permission).toBe('sms_marketing.read');
    expect(readFileSync(join(root, 'migrations/20260922121000-014-sms-link-trackers-demo.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random_uuid|gen_random_uuid/i);
  });
});

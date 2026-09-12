import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/email-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (id: string) => yaml('api/link-trackers.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Email Marketing link tracker parity', () => {
  test('keeps the exact menu, page/API ownership, and Odoo modes', () => {
    const page = yaml('pages/link-trackers.yaml');
    const api = yaml('api/link-trackers.yaml');
    expect(page.page).toMatchObject({ id: 'email-link-trackers', route: '/email-link-trackers', auth: { require: ['email_marketing.read'] } });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form', 'graph']);
    expect(page.components[0].datasources).toBeUndefined();
    expect(api.page.id).toBe('email-link-trackers');
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('email-link-trackers')).toContain('email_link_trackers');
    const item = yaml('manifest.yaml').menu['email-marketing'].groups.find((group: any) => group.id === 'configuration').items.find((candidate: any) => candidate.label === 'Link Tracker');
    expect(item).toMatchObject({ path: '/email-link-trackers', label: 'Link Tracker', permission: 'email_marketing.read' });
  });

  test('seeds deterministic links idempotently and covers query, CRUD, validation, and conflicts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'email_link_trackers_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'email_link_trackers_test', ['schema', 'data']);
    const source = yaml('api/link-trackers.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, campaign_name: null, medium_name: null, source_name: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['email-link-newsletter-home', 'email-link-spring-offer', 'email-link-docs', 'email-link-pricing']);
    expect((await repository.querySource(source, { q: 'pricing', campaign_name: null, medium_name: null, source_name: null, fixture_state: null }, 0, 50)).data[0].title).toBe('Pricing page');
    expect((await repository.querySource(source, { q: null, campaign_name: null, medium_name: null, source_name: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const create = action('create_email_link_tracker');
    const created = await repository.executeMutation(create.mutation, { values: { url: 'https://core3.local/new', title: 'New page', label: 'Open', campaign_name: '', medium_name: 'Email', source_name: 'Test' } });
    expect(created).toMatchObject({ id: 'email-link-https-core3-local-new', count: 0, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { url: 'https://core3.local/new', label: 'Open' } })).rejects.toMatchObject({ status: 409, code: 'EMAIL_LINK_TRACKER_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { url: 'not-a-url' } })).rejects.toMatchObject({ status: 422, code: 'EMAIL_LINK_TRACKER_URL_INVALID' });
    const edit = action('edit_email_link_tracker');
    expect(await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { url: 'https://core3.local/new', title: 'Updated', label: 'Open', campaign_name: '', medium_name: 'Email', source_name: 'Test' } })).toMatchObject({ row_version: 2, title: 'Updated' });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { url: 'https://core3.local/new', title: 'Stale' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(action('delete_email_link_tracker').mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-link', expected_row_version: 1, values: { url: 'https://core3.local/missing' } })).rejects.toMatchObject({ status: 404, code: 'EMAIL_LINK_TRACKER_NOT_FOUND' });
  });

  test('keeps read/write boundaries and stable failure states', () => {
    expect(yaml('api/link-trackers.yaml').datasources[0]).toMatchObject({ permission: 'email_marketing.read', error_states: { transport_error: { status: 503 } } });
    expect(yaml('api/link-tracker-detail.yaml').datasources[0].permission).toBe('email_marketing.read');
    for (const id of ['create_email_link_tracker', 'edit_email_link_tracker', 'delete_email_link_tracker']) expect(action(id).permission).toBe('email_marketing.write');
    expect(readFileSync(join(root, 'migrations/20260912120000-016-email-link-trackers.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random_uuid|gen_random_uuid/i);
  });
});

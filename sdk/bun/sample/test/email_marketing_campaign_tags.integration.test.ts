import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/email-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/campaign-tags.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Email Marketing campaign tags parity', () => {
  test('keeps source menu and page/API ownership', () => {
    const page = yaml('pages/campaign-tags.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'email-campaign-tags', route: '/email-campaign-tags', auth: { require: ['email_marketing.manage'] } });
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('email-campaign-tags')).toContain('email_campaign_tags');
    expect(yaml('manifest.yaml').menu['email-marketing'].groups.find((group: any) => group.id === 'configuration').items)
      .toContainEqual({ path: '/email-campaign-tags', label: 'Tags', icon: 'tag', permission: 'email_marketing.manage' });
  });

  test('seeds idempotently and guards inline CRUD, search, empty, stale, and missing states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'email_campaign_tags_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'email_campaign_tags_test', ['schema', 'data']);
    const source = yaml('api/campaign-tags.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Event', 'Newsletter', 'Product']);
    expect((await repository.querySource(source, { q: 'letter', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Newsletter']);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const create = action('create_email_campaign_tag');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Seasonal' } });
    expect(created).toMatchObject({ id: 'email-campaign-tag-seasonal', name: 'Seasonal', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'seasonal' } })).rejects.toMatchObject({ status: 409, code: 'EMAIL_CAMPAIGN_TAG_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' ' } })).rejects.toMatchObject({ status: 422, code: 'EMAIL_CAMPAIGN_TAG_NAME_REQUIRED' });
    const update = action('update_email_campaign_tag');
    expect(await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Seasonal Offers' } })).toMatchObject({ row_version: 2 });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(action('delete_email_campaign_tag').mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(update.mutation, { id: 'missing-tag', expected_row_version: 1, values: { name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'EMAIL_CAMPAIGN_TAG_NOT_FOUND' });
  });

  test('keeps campaign-manager permission and transport contract', () => {
    const api = yaml('api/campaign-tags.yaml');
    expect(api.datasources[0]).toMatchObject({ permission: 'email_marketing.manage', error_states: { forbidden: { status: 403 }, transport_error: { status: 503 } } });
    for (const id of ['create_email_campaign_tag', 'update_email_campaign_tag', 'delete_email_campaign_tag']) expect(action(id).permission).toBe('email_marketing.manage');
    expect(readFileSync(join(serviceRoot, 'migrations/20260912140000-018-email-campaign-tags.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random_uuid|gen_random_uuid/i);
  });
});

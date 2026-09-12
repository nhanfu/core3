import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/email-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/campaign-stages.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Email Marketing campaign stages parity', () => {
  test('keeps page/API ownership and manifest hierarchy', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/campaign-stages.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'email-campaign-stages', route: '/email-campaign-stages', auth: { require: ['email_marketing.manage'] } });
    expect(discovered.pageDatasources.get('email-campaign-stages')).toContain('email_campaign_stages');
    expect(discovered.pageDatasources.get('email-campaign-stage-detail')).toContain('email_campaign_stage_detail');
    expect(yaml('manifest.yaml').menu['email-marketing'].groups.find((group: any) => group.id === 'configuration').items)
      .toContainEqual({ path: '/email-campaign-stages', label: 'Campaign Stages', icon: 'workflow', permission: 'email_marketing.manage' });
  });

  test('seeds exact Odoo rows idempotently and supports search, empty, CRUD, and conflicts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'email_campaign_stages_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'email_campaign_stages_test', ['schema', 'data']);
    const source = yaml('api/campaign-stages.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name))
      .toEqual(['New', 'Schedule', 'Design', 'Sent']);
    expect((await repository.querySource(source, { q: 'design', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Design']);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const create = action('create_email_campaign_stage');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Review', sequence: 25 } });
    expect(created).toMatchObject({ id: 'email-campaign-stage-review', name: 'Review', sequence: 25 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'review' } })).rejects.toMatchObject({ status: 409, code: 'EMAIL_CAMPAIGN_STAGE_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' ' } })).rejects.toMatchObject({ status: 422, code: 'EMAIL_CAMPAIGN_STAGE_NAME_REQUIRED' });
    const edit = action('edit_email_campaign_stage');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Review & approve', sequence: 25 } });
    expect(edited).toMatchObject({ name: 'Review & approve', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale', sequence: 25 } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(action('delete_email_campaign_stage').mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-stage', expected_row_version: 1, values: { name: 'Missing', sequence: 1 } })).rejects.toMatchObject({ status: 404, code: 'EMAIL_CAMPAIGN_STAGE_NOT_FOUND' });
  });

  test('uses manager permissions and stable transport/read states', () => {
    const api = yaml('api/campaign-stages.yaml');
    const detail = yaml('api/campaign-stage-detail.yaml');
    expect(api.datasources[0]).toMatchObject({ permission: 'email_marketing.manage', error_states: { transport_error: { status: 503 } } });
    expect(detail.datasources[0].permission).toBe('email_marketing.manage');
    for (const id of ['create_email_campaign_stage', 'create_email_campaign_stage_inline', 'edit_email_campaign_stage', 'update_email_campaign_stage_inline', 'delete_email_campaign_stage']) {
      expect(action(id).permission).toBe('email_marketing.manage');
      expect(action(id).handler).toBe('yaml_mutation');
    }
    expect(readFileSync(join(serviceRoot, 'migrations/20260912110000-015-email-campaign-stages.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random_uuid|gen_random_uuid/i);
  });
});

import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('CRM Similar Leads Odoo action parity', () => {
  test('binds the Odoo duplicate stat action to a separate page/API contract', () => {
    const page = yaml('pages/lead-duplicates.yaml');
    const api = yaml('api/lead-duplicates.yaml');
    const detail = yaml('pages/lead-detail.yaml');
    const detailApi = yaml('api/lead-detail.yaml');

    expect(page.page).toMatchObject({ id: 'crm-lead-duplicates', route: '/crm/lead-duplicates', auth: { require: ['crm.read'] } });
    expect(api.page).toEqual({ id: 'crm-lead-duplicates' });
    expect(() => validatePageDefinition({ ...page, actions: [...(api.actions || []), ...(page.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(detail.components[0].stat_buttons).toContainEqual(expect.objectContaining({ id: 'view_crm_lead_duplicates', label: 'Similar Leads', value_field: 'duplicate_lead_count' }));
    expect(detailApi.actions.find((entry: any) => entry.id === 'view_crm_lead_duplicates')).toMatchObject({ type: 'navigate', permission: 'crm.read', navigate_to: '/crm/lead-duplicates' });
    expect(api.datasources.map((entry: any) => entry.id)).toEqual(['crm_lead_duplicates']);
  });

  test('returns source-backed matches, handles empty states, and survives a file-backed restart', async () => {
    const databasePath = `/tmp/core3-crm-lead-duplicates-${crypto.randomUUID()}.duckdb`;
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    const api = yaml('api/lead-duplicates.yaml');
    const source = api.datasources.find((entry: any) => entry.id === 'crm_lead_duplicates');

    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_lead_duplicates_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_lead_duplicates_migrations', ['schema', 'data']);

    const matches = await repository.querySource(source, { id: 'crm-demo-002', fixture_state: null }, 0, 50);
    expect(matches.data).toEqual([expect.objectContaining({ id: 'crm-forecast-002', match_reason: 'Email', email: 'ops@globex.test' })]);
    expect((await repository.querySource(source, { id: 'crm-demo-002', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { id: 'crm-demo-002', fixture_state: 'no_results' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { id: 'crm-demo-002', fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'CRM_LEAD_DUPLICATES_FORBIDDEN' });
    await expect(repository.querySource(source, { id: 'crm-demo-002', fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'CRM_LEAD_DUPLICATES_UNAVAILABLE' });

    const detailSource = yaml('api/lead-detail.yaml').datasources.find((entry: any) => entry.id === 'crm_lead_detail');
    expect((await repository.querySource(detailSource, { id: 'crm-demo-002' })).data).toMatchObject({ id: 'crm-demo-002', duplicate_lead_count: 1 });
    database.close();

    const restartedDatabase = await DuckDbDatabase.open(databasePath);
    const restartedRepository = new YamlRepository(restartedDatabase);
    await migrateDatabase(restartedRepository, join(root, 'migrations'), undefined, 'crm_lead_duplicates_migrations', ['schema', 'data']);
    const restartedMatches = await restartedRepository.querySource(source, { id: 'crm-demo-002', fixture_state: null }, 0, 50);
    expect(restartedMatches.data).toEqual([expect.objectContaining({ id: 'crm-forecast-002', match_reason: 'Email' })]);
    restartedDatabase.close();
    rmSync(databasePath, { force: true });
  });
});

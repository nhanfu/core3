import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/base');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/companies.yaml');
const detailApi = yaml('api/company-detail.yaml');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Base Companies parity', () => {
  test('binds the Companies menu and keeps page/API fragments presentation-separated', () => {
    const manifest = yaml('manifest.yaml');
    expect(manifest.menu.groups.find((group: any) => group.id === 'people').items).toContainEqual(expect.objectContaining({ path: '/companies', label: 'Companies', permission: 'base.companies.read' }));
    for (const [pageFile, pageId, apiFile, source] of [['pages/companies.yaml', 'companies', 'api/companies.yaml', 'companies'], ['pages/company-detail.yaml', 'company-detail', 'api/company-detail.yaml', 'company_detail']] as const) {
      const page = yaml(pageFile);
      expect(page.datasources, pageFile).toBeUndefined();
      expect(page.actions, pageFile).toBeUndefined();
      expect(page.page.id).toBe(pageId);
      expect(yaml(apiFile).page.id).toBe(pageId);
      expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get(pageId)).toContain(source);
    }
    expect(discoverPageRoutes(discoverPages(join(import.meta.dir, '..')))).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/companies', page: 'companies', module: 'base' }),
      expect.objectContaining({ path: '/company-detail', page: 'company-detail', module: 'base' }),
    ]));
  });

  test('seeds deterministic active and archived companies with search, empty, and error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_companies_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_companies_test_migrations', ['schema', 'data']);
    const source = api.datasources.find((candidate: any) => candidate.id === 'companies');
    const active = await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50);
    expect(active.data.map((row: any) => row.id)).toEqual(['company-azure', 'company-demo', 'company-vietnam', 'company-gemini', 'company-northwind']);
    expect((await repository.querySource(source, { q: 'Northwind', active: null, fixture_state: null }, 0, 50)).data).toEqual([expect.objectContaining({ id: 'company-northwind', country_name: 'United States' })]);
    expect((await repository.querySource(source, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data).toEqual([expect.objectContaining({ id: 'company-archived', active: false } )]);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'BASE_COMPANIES_UNAVAILABLE' });
    expect((await repository.querySource(detailApi.datasources[0], { id: 'missing-company', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    database.close();
  });

  test('covers permissioned CRUD, archive restore, duplicate, not-found, stale, and required guards', async () => {
    expect(action('create_company')).toMatchObject({ permission: 'base.companies.write', operation: 'create', mutation: { required: ['name'] } });
    expect(action('edit_company')).toMatchObject({ permission: 'base.companies.write', operation: 'update', mutation: { concurrency: { required: true } } });
    expect(action('delete_company')).toMatchObject({ permission: 'base.companies.write', operation: 'delete' });
    for (const id of ['archive_company', 'unarchive_company']) expect(action(id)).toMatchObject({ permission: 'base.companies.write', mutation: { concurrency: { required: true } } });
    expect(detailApi.datasources[0].permission).toBe('base.companies.read');
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_companies_crud_migrations', ['schema', 'data']);
    const create = await repository.executeMutation(action('create_company').mutation, { values: { name: 'QA Company', email: 'qa.company@core3.local' } });
    expect(create).toMatchObject({ name: 'QA Company', is_company: true, active: true, row_version: 1 });
    await expect(repository.executeMutation(action('create_company').mutation, { values: { name: 'qa company' } })).rejects.toMatchObject({ status: 409, code: 'BASE_COMPANY_NAME_EXISTS' });
    const edit = await repository.executeMutation(action('edit_company').mutation, { id: create.id, expected_row_version: 1, values: { name: 'QA Company Updated', email: 'updated@core3.local' } });
    expect(edit).toMatchObject({ name: 'QA Company Updated', row_version: 2 });
    await expect(repository.executeMutation(action('edit_company').mutation, { id: create.id, expected_row_version: 1, values: { name: 'Stale' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    const archived = await repository.executeMutation(action('archive_company').mutation, { id: create.id, expected_row_version: 2, values: { active: false } });
    expect(archived).toMatchObject({ active: false, row_version: 3 });
    await expect(repository.executeMutation(action('edit_company').mutation, { id: create.id, expected_row_version: 3, values: { name: 'Archived edit' } })).rejects.toMatchObject({ status: 404, code: 'BASE_COMPANY_NOT_FOUND' });
    const restored = await repository.executeMutation(action('unarchive_company').mutation, { id: create.id, expected_row_version: 3, values: { active: true } });
    expect(restored).toMatchObject({ active: true, row_version: 4 });
    await expect(repository.executeMutation(action('delete_company').mutation, { id: 'missing-company', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'BASE_COMPANY_NOT_FOUND' });
    await repository.executeMutation(action('delete_company').mutation, { id: create.id, expected_row_version: 4 });
    database.close();
  });
});

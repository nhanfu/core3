import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/base');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/industries.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Base Industries parity', () => {
  test('keeps the Odoo Industries list presentation-only and joins the API through page.id', () => {
    const page = yaml('pages/industries.yaml');
    const api = yaml('api/industries.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'industries', route: '/base-industries' });
    expect(api.page.id).toBe('industries');
    expect(discovered.pages.get('industries')?.config.page.id).toBe('industries');
    expect(discovered.pageDatasources.get('industries')).toEqual(expect.arrayContaining(['industries', 'industry_states']));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/base-industries', page: 'industries', module: 'base' }),
    ]));
  });

  test('seeds the Odoo 19 industry catalog and supports search and archived state', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_industries_test_migrations', ['schema', 'data']);
    const source = yaml('api/industries.yaml').datasources.find((item: any) => item.id === 'industries');
    const active = await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50);
    expect(active.data).toHaveLength(21);
    expect(active.data.slice(0, 3).map((row: any) => row.name)).toEqual(['Administrative/Utilities', 'Agriculture', 'Construction']);
    expect(active.data.find((row: any) => row.name === 'Manufacturing')).toMatchObject({ full_name: 'C - MANUFACTURING', active: true });
    expect((await repository.querySource(source, { q: 'Electricity', active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Energy supply']);
    expect((await repository.querySource(source, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Archived Industry']);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('enforces reference permissions, validation, optimistic concurrency, and archive guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_industries_mutation_test_migrations', ['schema', 'data']);
    const create = action('create_industry');
    expect(create.permission).toBe('base.reference.write');
    expect(create.mutation.required).toEqual(['name']);
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Renewable Energy', full_name: 'R - RENEWABLE ENERGY' } });
    expect(created).toMatchObject({ name: 'Renewable Energy', full_name: 'R - RENEWABLE ENERGY', active: true, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'renewable energy' } })).rejects.toMatchObject({ status: 409, code: 'BASE_INDUSTRY_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: {} })).rejects.toMatchObject({ status: 400 });
    const edit = action('edit_industry');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Renewable Power', full_name: 'R - RENEWABLE POWER' } });
    expect(edited).toMatchObject({ name: 'Renewable Power', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale Power' } })).rejects.toMatchObject({ status: 409 });
    const archive = action('archive_industry');
    const archived = await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect(archived).toMatchObject({ active: false, row_version: 3 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 3, values: { name: 'Archived Power' } })).rejects.toMatchObject({ status: 404, code: 'BASE_INDUSTRY_NOT_FOUND' });
    const restore = action('unarchive_industry');
    const restored = await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    expect(restored).toMatchObject({ active: true, row_version: 4 });
    await expect(repository.executeMutation(archive.mutation, { id: 'industry-missing', expected_row_version: 1, values: { active: false } })).rejects.toMatchObject({ status: 409, code: 'BASE_INDUSTRY_ALREADY_ARCHIVED' });
    expect(action('delete_industry').permission).toBe('base.reference.write');
    database.close();
  });
});

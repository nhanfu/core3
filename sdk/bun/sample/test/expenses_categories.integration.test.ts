import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/expenses');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/categories.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Expenses category CRUD parity batch', () => {
  test('keeps the category page layout-only and binds its API by page.id', () => {
    const page = yaml('pages/categories.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page.id).toBe('expense-categories');
    expect(page.page.auth.require).toEqual(['expenses.manage']);
    expect(discovered.pages.get('expense-categories')?.config.page.id).toBe('expense-categories');
    expect(discovered.pageDatasources.get('expense-categories')).toContain('expense_categories');
    const list = page.components[0];
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban']);
    expect(list.row_open_action).toBe('edit_expense_category');
    expect(list.filters[0].options.map((option: any) => option.id)).toEqual(['active', 'archived']);
    const manifest = yaml('manifest.yaml');
    expect(manifest.menu.groups.map((group: any) => group.label)).toEqual(['My Expenses', 'Reporting', 'Configuration']);
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/expenses/categories', permission: 'expenses.manage' }),
    ]));
  });

  test('supports deterministic search, empty, create, edit, archive, restore, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'expenses_category_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'expenses_category_test_migrations', ['schema', 'data']);

    const source = yaml('api/categories.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name))
      .toEqual(['Meals', 'Mileage', 'Other', 'Travel & Accommodation']);
    expect((await repository.querySource(source, { q: 'missing', active: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data.map((row: any) => row.name))
      .toEqual(['Archived Meal Voucher']);

    const create = action('create_expense_category');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Client Breakfast', cost_method: 'fixed', unit_cost: 0, reference: 'BREAKFAST', guideline: 'Client meals', active: true } });
    expect(created).toMatchObject({ name: 'Client Breakfast', active: true });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'client breakfast' } }))
      .rejects.toMatchObject({ status: 409, code: 'EXPENSE_CATEGORY_NAME_EXISTS' });

    const edit = action('edit_expense_category');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Client Breakfast Updated', cost_method: 'quantity', unit_cost: 1.25, reference: 'BREAKFAST-2', guideline: 'Updated note' } });
    expect(edited).toMatchObject({ name: 'Client Breakfast Updated', cost_method: 'quantity', unit_cost: 1.25 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale edit' } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const archive = action('archive_expense_category');
    await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect((await repository.querySource(source, { q: 'Client Breakfast Updated', active: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: 'Client Breakfast Updated', active: 'archived', fixture_state: null }, 0, 50)).data[0]).toMatchObject({ active: false });

    const unarchive = action('unarchive_expense_category');
    await repository.executeMutation(unarchive.mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    expect((await repository.querySource(source, { q: 'Client Breakfast Updated', active: null, fixture_state: null }, 0, 50)).data[0]).toMatchObject({ active: true });
  });

  test('requires manager permission, error state, and optimistic concurrency for every category action', () => {
    const config = yaml('api/categories.yaml');
    expect(config.datasources[0].permission).toBe('expenses.manage');
    expect(config.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'EXPENSE_CATEGORIES_UNAVAILABLE' });
    for (const id of ['create_expense_category', 'edit_expense_category', 'archive_expense_category', 'unarchive_expense_category']) {
      expect(action(id).permission, id).toBe('expenses.manage');
      expect(action(id).handler, id).toBe('yaml_mutation');
      expect(action(id).mutation, id).toBeDefined();
      if (id !== 'create_expense_category') expect(action(id).mutation.concurrency.required, id).toBe(true);
    }
  });
});

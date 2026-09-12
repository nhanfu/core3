import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/website');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Website Menu Editor parity', () => {
  test('declares an editable, permissioned menu lifecycle with website-scoped route guards', () => {
    const page = yaml('pages/menus.yaml');
    const list = page.components[0];
    const datasource = page.datasources.find((source: any) => source.id === 'website_menus');
    const create = page.actions.find((action: any) => action.id === 'create_website_menu');
    const edit = page.actions.find((action: any) => action.id === 'edit_website_menu');

    expect(list).toMatchObject({ row_open_action: 'edit_website_menu', row_double_click_action: 'edit_website_menu', row_actions: 'menu' });
    expect(datasource.query).toContain('website_id');
    expect(create).toMatchObject({ permission: 'website.write', action: 'website.menus.create' });
    expect(edit).toMatchObject({ permission: 'website.write', action: 'website.menus.update', operation: 'update', prefill: 'row' });
    expect(edit.mutation).toMatchObject({ table: 'website_menus', concurrency: { required: true } });
    expect(edit.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'WEBSITE_MENU_NOT_FOUND', status: 404 }),
      expect.objectContaining({ code: 'WEBSITE_INVALID_SITE', status: 400 }),
      expect.objectContaining({ code: 'WEBSITE_MENU_ROUTE_EXISTS', status: 409 }),
    ]));
  });

  test('creates and edits a menu item, persists ordering, and rejects duplicate routes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'website_menu_editor_test', ['schema', 'data']);
    const page = yaml('pages/menus.yaml');
    const create = page.actions.find((action: any) => action.id === 'create_website_menu');
    const edit = page.actions.find((action: any) => action.id === 'edit_website_menu');

    const created = await repository.executeMutation(create.mutation, {
      values: { website_id: 'website-demo-001', website_name: 'Core3 Storefront', name: 'Docs', url: '/docs', parent_name: null, new_window: false, sequence: 30 },
    });
    expect(created).toMatchObject({ website_id: 'website-demo-001', name: 'Docs', url: '/docs' });
    const id = (created as any).id;
    expect((await repository.query('SELECT name, url, sequence, row_version FROM website_menus WHERE id = ?', [id]))[0]).toMatchObject({ name: 'Docs', url: '/docs', sequence: 30, row_version: 1 });

    const updated = await repository.executeMutation(edit.mutation, {
      id, expected_row_version: 1,
      values: { website_id: 'website-demo-001', website_name: 'Core3 Storefront', name: 'Documentation', url: '/docs', parent_name: 'Home', new_window: true, sequence: 15 },
    });
    expect(updated).toMatchObject({ name: 'Documentation', parent_name: 'Home', new_window: true, sequence: 15, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, {
      id, expected_row_version: 1,
      values: { website_id: 'website-demo-001', website_name: 'Core3 Storefront', name: 'Stale', url: '/stale' },
    })).rejects.toMatchObject({ status: 409 });

    await expect(repository.executeMutation(create.mutation, {
      values: { website_id: 'website-demo-001', website_name: 'Core3 Storefront', name: 'Duplicate', url: '/DOCS' },
    })).rejects.toMatchObject({ status: 409, code: 'WEBSITE_MENU_ROUTE_EXISTS' });
    database.close();
  });

  test('does not allow an edit to move a menu item to an invalid website', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'website_menu_scope_test', ['schema', 'data']);
    const edit = yaml('pages/menus.yaml').actions.find((action: any) => action.id === 'edit_website_menu');
    await expect(repository.executeMutation(edit.mutation, {
      id: 'website-menu-demo-001', expected_row_version: 1,
      values: { website_id: 'missing-site', website_name: 'Missing', name: 'Home', url: '/', sequence: 10 },
    })).rejects.toMatchObject({ status: 400, code: 'WEBSITE_INVALID_SITE' });
    expect((await repository.query('SELECT website_id, name, url, row_version FROM website_menus WHERE id = ?', ['website-menu-demo-001']))[0]).toEqual({ website_id: 'website-demo-001', name: 'Home', url: '/', row_version: 1 });
    database.close();
  });
});

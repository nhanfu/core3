import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPages } from '@core3/server/discovery';
import { createYamlApi } from '@core3/server/routes/yaml-api';

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
    expect(list.columns.find((column: any) => column.field === 'name')).toMatchObject({
      actions: [{ id: 'edit_website_menu', label: 'Edit', icon: 'edit' }],
    });
    expect(datasource.query).toContain('website_id');
    expect(create).toMatchObject({ permission: 'website.write', action: 'website.menus.create' });
    expect(edit).toMatchObject({ permission: 'website.write', action: 'website.menus.update', operation: 'update', prefill: 'row' });
    expect(create.fields.map((field: any) => field.field)).not.toContain('website_name');
    expect(edit.fields.map((field: any) => field.field)).not.toContain('website_name');
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
    expect(created).toMatchObject({ website_id: 'website-demo-001', website_name: 'Core3 Storefront', name: 'Docs', url: '/docs' });
    const id = (created as any).id;
    expect((await repository.query('SELECT name, url, sequence, row_version FROM website_menus WHERE id = ?', [id]))[0]).toMatchObject({ name: 'Docs', url: '/docs', sequence: 30, row_version: 1 });

    const updated = await repository.executeMutation(edit.mutation, {
      id, expected_row_version: 1,
      values: { website_id: 'website-demo-001', website_name: 'Spoofed site name', name: 'Documentation', url: '/docs', parent_name: 'Home', new_window: true, sequence: 15 },
    });
    expect(updated).toMatchObject({ website_name: 'Core3 Storefront', name: 'Documentation', parent_name: 'Home', new_window: true, sequence: 15, row_version: 2 });
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

  test('derives the site name, supports cross-site scope, and survives restart replay', async () => {
    const databasePath = `/tmp/core3-website-menu-restart-${crypto.randomUUID()}.duckdb`;
    const migrationName = `website_menu_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const create = yaml('pages/menus.yaml').actions.find((action: any) => action.id === 'create_website_menu');
    const edit = yaml('pages/menus.yaml').actions.find((action: any) => action.id === 'edit_website_menu');
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
    const created = await firstRepository.executeMutation(create.mutation, {
      values: { website_id: 'website-demo-002', website_name: 'Spoofed', name: 'Guides', url: '/guides', sequence: 20 },
    });
    expect(created).toMatchObject({ website_id: 'website-demo-002', website_name: 'Core3 Docs' });
    await firstRepository.executeMutation(edit.mutation, {
      id: 'website-menu-demo-003', expected_row_version: 1,
      values: { website_id: 'website-demo-002', website_name: 'Wrong name', name: 'Documentation home', url: '/', sequence: 5 },
    });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT website_id, website_name, name, sequence, row_version FROM website_menus WHERE id = ?', ['website-menu-demo-003']))[0]).toEqual({
      website_id: 'website-demo-002', website_name: 'Core3 Docs', name: 'Documentation home', sequence: 5, row_version: 2,
    });
    second.close();
    rmSync(databasePath, { force: true });
  });

  test('enforces the Website Editor actor boundary at the action endpoint', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'website_menu_actor_test', ['schema', 'data']);
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const currentUser = { sub: 'website-reader', email: 'reader@workspace.example', name: 'Website Reader', permissions: ['website.read'] };
    const api = createYamlApi({
      repository,
      authProvider: {
        async getCurrentUser() { return currentUser; },
        hasPermission(user: any, permission: string) { return user.permissions.includes(permission); },
      },
      sources: new Map([...discovered.datasources].filter(([id]) => id.startsWith('website_'))),
      pageSources: new Map([...discovered.pageDatasources].filter(([pageId]) => discovered.pages.get(pageId)?.module === 'website')),
      pages: new Map([...discovered.pages].filter(([, page]) => page.module === 'website').map(([id, page]) => [id, page.config])),
      catalogs: discovered.catalogs,
      menus: discovered.menus,
      workflows: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'website').map(([id, workflow]) => [id, workflow.config])),
      workflowFiles: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'website').map(([id, workflow]) => [id, workflow.file])),
      permissions: discovered.permissions.get('website')?.config || {},
      uploadRoot: '/tmp/core3-website-menu-actor-uploads', eventStore: {}, topics: {},
    });
    await expect(api(new Request('http://website.test/api/actions/website.menus.create', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { website_id: 'website-demo-002', name: 'Blocked', url: '/blocked' } }),
    }), new URL('http://website.test/api/actions/website.menus.create'))).rejects.toMatchObject({ status: 403 });
    expect(await repository.query("SELECT COUNT(*) AS count FROM website_menus WHERE url = '/blocked'"))
      .toEqual([{ count: 0 }]);
    database.close();
  });
});

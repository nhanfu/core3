import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/blog');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const source = readFileSync('/home/nhanjs/projects/odoo/addons/website_blog/views/blog_post_add.xml', 'utf8');

function apiFor(repository: YamlRepository, user: any) {
  const api = yaml('api/posts.yaml');
  const page = yaml('pages/posts.yaml');
  const workflow = yaml('pages/blog-workflow.yaml').workflow;
  return createYamlApi({
    repository,
    authProvider: {
      async getCurrentUser() { return user; },
      hasPermission(currentUser: any, permission: string) { return currentUser.permissions.includes(permission); },
    },
    sources: new Map(api.datasources.map((item: any) => [item.id, item])),
    pageSources: new Map([[page.page.id, api.datasources.map((item: any) => item.id)]]),
    pages: new Map([[page.page.id, { ...page, actions: api.actions }]]),
    catalogs: new Map(),
    menus: new Map(),
    workflows: new Map([[workflow.id, workflow]]),
    workflowFiles: new Map(),
    permissions: { permissions: ['blog.read', 'blog.write', 'blog.manage'] },
    uploadRoot: '/tmp/core3-blog-post-new-uploads',
    eventStore: {},
    topics: {},
  });
}

const createRequest = (values: Record<string, unknown>) => new Request('http://blog.test/api/actions/blog.posts.create', {
  method: 'POST',
  headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
  body: JSON.stringify({ values }),
});

describe('BLOG-POST-NEW-001', () => {
  test('maps Odoo New Blog Post to the separated page/API create contract', () => {
    const page = yaml('pages/posts.yaml');
    const api = yaml('api/posts.yaml');
    const action = api.actions.find((item: any) => item.id === 'create_blog_post');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(source).toContain('<record id="blog_post_action_add"');
    expect(source).toContain('<field name="target">new</field>');
    expect(source).toContain('<field name="blog_id" string="Select Blog"/>');
    expect(source).toContain('<field name="name" placeholder="Blog Post Title"/>');
    expect(action).toMatchObject({
      type: 'server_form',
      permission: 'blog.write',
      action: 'blog.posts.create',
      handler: 'yaml_mutation',
      operation: 'create',
      fields: [
        { field: 'blog_id', label: 'Select Blog', options_source: 'blog_lookup', required: true },
        { field: 'name', label: 'Title', placeholder: 'Blog Post Title', required: true },
      ],
    });
    expect(action.mutation).toMatchObject({
      generated: ['id'],
      operation: 'insert',
      table: 'blog_posts',
      fields: ['blog_id', 'blog_name', 'company_name', 'name', 'active'],
      defaults: { active: true },
    });
    expect(action.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'BLOG_POST_TITLE_REQUIRED', 'BLOG_POST_BLOG_REQUIRED', 'BLOG_POST_BLOG_INVALID', 'BLOG_COMPANY_SCOPE_REQUIRED',
    ]);
  });

  test('creates a durable draft from only the Odoo modal fields and derives scope', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_post_new_contract', ['schema', 'data']);
    const api = apiFor(repository, { sub: 'blog-editor', company_name: 'Core3 Demo Company', permissions: ['blog.read', 'blog.write'] });

    const response = await api(createRequest({ blog_id: 'blog-demo-001', name: 'Declarative launch notes' }), new URL('http://blog.test/api/actions/blog.posts.create'));
    expect(response?.status).toBe(200);
    const created = await response!.json();
    expect(created).toMatchObject({
      blog_id: 'blog-demo-001',
      blog_name: 'Core3 Engineering',
      company_name: 'Core3 Demo Company',
      name: 'Declarative launch notes',
      active: true,
      state: 'Draft',
    });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect((await repository.query('SELECT blog_id, blog_name, company_name, name, active, state FROM blog_posts WHERE id = ?', [created.id]))[0])
      .toEqual({ blog_id: 'blog-demo-001', blog_name: 'Core3 Engineering', company_name: 'Core3 Demo Company', name: 'Declarative launch notes', active: true, state: 'Draft' });
    database.close();
  });

  test('rejects missing or archived blogs, cross-company blogs, and unauthorized creates atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_post_new_guards', ['schema', 'data']);
    const writer = apiFor(repository, { sub: 'blog-editor', company_name: 'Core3 Demo Company', permissions: ['blog.read', 'blog.write'] });

    await expect(writer(createRequest({ blog_id: 'blog-demo-001', name: '' }), new URL('http://blog.test/api/actions/blog.posts.create')))
      .rejects.toMatchObject({ status: 422, code: 'BLOG_POST_TITLE_REQUIRED' });
    await expect(writer(createRequest({ blog_id: 'missing-blog', name: 'Missing blog' }), new URL('http://blog.test/api/actions/blog.posts.create')))
      .rejects.toMatchObject({ status: 422, code: 'BLOG_POST_BLOG_INVALID' });
    await repository.run("UPDATE blog_blogs SET active = FALSE WHERE id = 'blog-demo-001'");
    await expect(writer(createRequest({ blog_id: 'blog-demo-001', name: 'Archived blog' }), new URL('http://blog.test/api/actions/blog.posts.create')))
      .rejects.toMatchObject({ status: 422, code: 'BLOG_POST_BLOG_INVALID' });
    await repository.run("UPDATE blog_blogs SET active = TRUE, company_name = 'Other Company' WHERE id = 'blog-demo-001'");
    await expect(writer(createRequest({ blog_id: 'blog-demo-001', name: 'Other company' }), new URL('http://blog.test/api/actions/blog.posts.create')))
      .rejects.toMatchObject({ status: 403, code: 'BLOG_COMPANY_SCOPE_REQUIRED' });
    const before = (await repository.query('SELECT COUNT(*) AS count FROM blog_posts', []))[0].count;
    expect((await repository.query('SELECT COUNT(*) AS count FROM blog_posts WHERE name IN (\'\', \'Missing blog\', \'Archived blog\', \'Other company\')', []))[0].count).toBe(0);

    const readOnly = apiFor(repository, { sub: 'blog-reader', company_name: 'Core3 Demo Company', permissions: ['blog.read'] });
    await expect(readOnly(createRequest({ blog_id: 'blog-demo-001', name: 'Unauthorized' }), new URL('http://blog.test/api/actions/blog.posts.create')))
      .rejects.toMatchObject({ status: 403 });
    expect((await repository.query('SELECT COUNT(*) AS count FROM blog_posts', []))[0].count).toBe(before);
    database.close();
  });

  test('keeps the created draft after a file-backed restart and migration replay', async () => {
    const databasePath = `/tmp/core3-blog-post-new-${crypto.randomUUID()}.duckdb`;
    const migrationName = `blog_post_new_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const firstApi = apiFor(firstRepository, { sub: 'blog-editor', company_name: 'Core3 Demo Company', permissions: ['blog.read', 'blog.write'] });
    const response = await firstApi(createRequest({ blog_id: 'blog-demo-001', name: 'Restart-safe draft' }), new URL('http://blog.test/api/actions/blog.posts.create'));
    const created = await response!.json();
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await secondRepository.query('SELECT blog_name, company_name, name, active, state FROM blog_posts WHERE id = ?', [created.id]))[0])
      .toEqual({ blog_name: 'Core3 Engineering', company_name: 'Core3 Demo Company', name: 'Restart-safe draft', active: true, state: 'Draft' });
    second.close();
    rmSync(databasePath, { force: true });
  });
});

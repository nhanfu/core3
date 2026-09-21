import { describe, expect, test } from 'bun:test';
import { cpSync, mkdirSync, readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/blog');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

const buildDiscovery = () => {
  const discoveryRoot = mkdtempSync('/tmp/core3-blog-blog-archive-discovery-');
  mkdirSync(join(discoveryRoot, 'services'), { recursive: true });
  cpSync(root, join(discoveryRoot, 'services/blog'), { recursive: true });
  return { discoveryRoot, discovered: discoverPages(discoveryRoot) };
};

const buildApi = (repository: YamlRepository, permissions: string[]) => {
  const { discoveryRoot, discovered } = buildDiscovery();
  const user = {
    sub: 'blog-manager',
    email: 'manager@workspace.example',
    name: 'Blog Manager',
    company_name: 'Core3 Demo Company',
    roles: ['manager'],
    permissions,
  };
  const api = createYamlApi({
    repository,
    authProvider: {
      async getCurrentUser() { return user; },
      hasPermission(currentUser: any, permission: string) { return currentUser.permissions.includes(permission); },
    },
    sources: new Map([...discovered.datasources].filter(([id]) => id.startsWith('blog_'))),
    pageSources: new Map([...discovered.pageDatasources].filter(([pageId]) => discovered.pages.get(pageId)?.module === 'blog')),
    pages: new Map([...discovered.pages].filter(([, page]) => page.module === 'blog').map(([id, page]) => [id, page.config])),
    catalogs: discovered.catalogs,
    menus: discovered.menus,
    workflows: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'blog').map(([id, workflow]) => [id, workflow.config])),
    workflowFiles: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === 'blog').map(([id, workflow]) => [id, workflow.file])),
    permissions: discovered.permissions.get('blog')?.config || {},
    uploadRoot: '/tmp/core3-blog-blog-archive-uploads', eventStore: {}, topics: {},
  });
  return { api, discovered, user, cleanup: () => rmSync(discoveryRoot, { recursive: true, force: true }) };
};

const transition = (api: ReturnType<typeof buildApi>['api'], name: string, id: string, expectedRowVersion: number) => api(
  new Request(`http://blog.test/api/actions/blog.blogs.${name}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, expected_row_version: expectedRowVersion, values: {} }),
  }),
  new URL(`http://blog.test/api/actions/blog.blogs.${name}`),
);

describe('Blog blog archive parity slice', () => {
  test('joins the Odoo Blogs page/API and declares the archive filter workflow', () => {
    const page = yaml('pages/blogs.yaml');
    const api = yaml('api/blogs.yaml');
    const workflow = yaml('pages/blog-blog-workflow.yaml').workflow;

    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0].default_filters).toEqual({ active: 'active' });
    expect(page.components[0].filters).toContainEqual(expect.objectContaining({ field: 'active', options_source: 'blog_active_states' }));
    expect(page.components[0].columns).toContainEqual(expect.objectContaining({ field: 'active', optional: 'hide' }));
    expect(api.datasources.map((source: any) => source.id)).toEqual(['blog_active_states', 'blog_blogs', 'blog_detail']);
    expect(api.actions.map((action: any) => action.id)).toContainEqual('archive_blog');
    expect(api.actions.map((action: any) => action.id)).toContainEqual('unarchive_blog');
    expect(workflow.transitions.map((transition: any) => transition.id)).toEqual(['archive', 'unarchive']);
    expect(workflow.transitions.every((transition: any) => transition.permission === 'blog.manage')).toBe(true);
  });

  test('archives a blog with its posts and unarchives without republishing', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'blog_blog_archive_cascade_test', ['schema', 'data']);
    const { api, cleanup } = buildApi(repository, ['blog.read', 'blog.write', 'blog.manage']);
    const blogId = 'blog-demo-001';

    expect((await repository.query('SELECT active, row_version FROM blog_blogs WHERE id = ?', [blogId]))[0]).toEqual({ active: true, row_version: 1 });
    const archived = await transition(api, 'archive', blogId, 1);
    expect((await archived.json())).toMatchObject({ id: blogId, active: false, row_version: 2 });
    expect(await repository.query('SELECT active, row_version FROM blog_blogs WHERE id = ?', [blogId])).toEqual([{ active: false, row_version: 2 }]);
    expect(await repository.query('SELECT active, state, published_date, row_version FROM blog_posts WHERE blog_id = ? ORDER BY id', [blogId])).toEqual([
      { active: false, state: 'Archived', published_date: null, row_version: 2 },
      { active: false, state: 'Archived', published_date: null, row_version: 2 },
    ]);

    const unarchived = await transition(api, 'unarchive', blogId, 2);
    expect((await unarchived.json())).toMatchObject({ id: blogId, active: true, row_version: 3 });
    expect(await repository.query('SELECT active, row_version FROM blog_blogs WHERE id = ?', [blogId])).toEqual([{ active: true, row_version: 3 }]);
    expect(await repository.query('SELECT active, state, published_date, row_version FROM blog_posts WHERE blog_id = ? ORDER BY id', [blogId])).toEqual([
      { active: true, state: 'Draft', published_date: null, row_version: 3 },
      { active: true, state: 'Draft', published_date: null, row_version: 3 },
    ]);
    database.close();
    cleanup();
  });

  test('enforces manage permission and stale parent guards atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'blog_blog_archive_guards_test', ['schema', 'data']);
    const blogId = 'blog-demo-001';
    const readWrite = buildApi(repository, ['blog.read', 'blog.write']);
    const readWriteApi = readWrite.api;
    await expect(transition(readWriteApi, 'archive', blogId, 1)).rejects.toMatchObject({ status: 403 });
    readWrite.cleanup();

    const manager = buildApi(repository, ['blog.read', 'blog.write', 'blog.manage']);
    const managerApi = manager.api;
    await expect(transition(managerApi, 'archive', blogId, 0)).rejects.toMatchObject({ status: 409, code: 'BLOG_BLOG_STALE' });
    expect(await repository.query('SELECT active, row_version FROM blog_blogs WHERE id = ?', [blogId])).toEqual([{ active: true, row_version: 1 }]);
    expect((await repository.query('SELECT active, state, row_version FROM blog_posts WHERE blog_id = ? ORDER BY id', [blogId])).every((row: any) => row.active && row.state !== 'Archived' && row.row_version === 1)).toBe(true);
    manager.user.company_name = 'Other Company';
    await expect(transition(managerApi, 'archive', blogId, 1)).rejects.toMatchObject({ status: 409, code: 'BLOG_BLOG_STALE' });
    expect(await repository.query('SELECT active, row_version FROM blog_blogs WHERE id = ?', [blogId])).toEqual([{ active: true, row_version: 1 }]);
    database.close();
    manager.cleanup();
  });

  test('preserves the blog and cascade state across a database restart', async () => {
    const databasePath = `/tmp/core3-blog-blog-archive-${crypto.randomUUID()}.duckdb`;
    const migrationName = `blog_blog_archive_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const firstDatabase = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(firstDatabase);
    await migrateDatabase(firstRepository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
    const first = buildApi(firstRepository, ['blog.read', 'blog.write', 'blog.manage']);
    const firstApi = first.api;
    await (await transition(firstApi, 'archive', 'blog-demo-001', 1)).json();
    firstDatabase.close();
    first.cleanup();

    const secondDatabase = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(secondDatabase);
    await migrateDatabase(secondRepository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT active, row_version FROM blog_blogs WHERE id = ?', ['blog-demo-001'])).toEqual([{ active: false, row_version: 2 }]);
    expect((await secondRepository.query('SELECT active, state FROM blog_posts WHERE blog_id = ? ORDER BY id', ['blog-demo-001'])).every((row: any) => !row.active && row.state === 'Archived')).toBe(true);
    secondDatabase.close();
    rmSync(databasePath, { force: true });
  });
});

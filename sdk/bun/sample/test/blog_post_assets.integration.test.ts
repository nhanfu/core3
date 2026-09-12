import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/blog');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Blog post assets parity', () => {
  test('uploads and downloads persisted post attachment metadata', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_post_asset_test', ['schema', 'data']);
    const page = yaml('pages/post-detail.yaml');
    const upload = page.actions.find((action: any) => action.id === 'upload_blog_post_attachment');
    const authUser = { sub: 'blog-editor', email: 'editor@workspace.example', name: 'Blog Editor', roles: ['editor'], permissions: ['blog.read', 'blog.write'] };
    const uploadRoot = `/tmp/core3-blog-upload-${crypto.randomUUID()}`;
    const api = createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return authUser; }, hasPermission(user: any, permission: string) { return user.permissions.includes(permission); } },
      sources: new Map(page.datasources.map((source: any) => [source.id, source])), pageSources: new Map(), pages: new Map([['blog-post-detail', { actions: [upload] }]]),
      catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['blog.read', 'blog.write'], tables: {}, endpoints: {} }, uploadRoot, eventStore: {}, topics: {},
      storage: { attachments: { blog_post_attachment: { download: { route: '/api/blog/post-attachments', permission: 'blog.read', query: 'SELECT * FROM blog_post_attachments WHERE id = :attachment_id' } } } },
    });
    const form = new FormData();
    form.set('file', new File([new Uint8Array([80, 75, 3, 4])], 'article.pdf', { type: 'application/pdf' }));
    form.set('meta', JSON.stringify({ kind: 'blog_post_attachment', post_id: 'blog-post-demo-001' }));
    const response = await api(new Request('http://blog.test/api/upload', { method: 'POST', body: form }), new URL('http://blog.test/api/upload'));
    expect(response?.status).toBe(200);
    const uploaded = await response?.json() as any;
    expect(uploaded).toMatchObject({ post_id: 'blog-post-demo-001', file_name: 'article.pdf', mime_type: 'application/pdf', size_bytes: 4 });
    expect((await repository.query('SELECT COUNT(*) AS count FROM blog_post_attachments WHERE post_id = ?', ['blog-post-demo-001']))[0].count).toBe(1);
    const download = await api(new Request(`http://blog.test/api/blog/post-attachments/${uploaded.id}`, { headers: { Authorization: 'Bearer test-token' } }), new URL(`http://blog.test/api/blog/post-attachments/${uploaded.id}`));
    expect(download?.status).toBe(200);
    expect([...new Uint8Array(await download!.arrayBuffer())]).toEqual([80, 75, 3, 4]);
    database.close();
  });
});

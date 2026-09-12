import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { bindNamedParams } from '@core3/server/database/sql';
import BlogModule from '../services/blog/module';

const root = join(import.meta.dir, '../services/blog');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Blog public visibility parity', () => {
  test('publishes only published posts through public list/detail operations', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_public_visibility_test', ['schema', 'data']);
    const operations = yaml('operations.yaml').operations;
    const list = bindNamedParams(operations['blog.public.posts'].query, { q: null });
    expect((await repository.query(list.statement, list.values)).map((post: any) => post.id)).toEqual(['blog-post-demo-001']);
    const detail = bindNamedParams(operations['blog.public.post'].query, { id: 'blog-post-demo-002' });
    expect(await repository.query(detail.statement, detail.values)).toEqual([]);
    database.close();
  });

  test('exposes public list/search/detail and rejects unsupported methods', async () => {
    const module = new BlogModule();
    const calls: any[] = [];
    const service = { async call(operation: string, request: any) { calls.push({ operation, request }); if (operation === 'blog.public.post') return request.id === 'blog-post-demo-001' ? { posts: [{ id: request.id, state: 'Published' }] } : { posts: [] }; return { posts: [{ id: 'blog-post-demo-001', state: 'Published' }] }; } };
    const list = await module.handlePublicRoute(new Request('http://blog.test/api/public/blog/posts?q=yaml'), new URL('http://blog.test/api/public/blog/posts?q=yaml'), service);
    expect(list?.status).toBe(200);
    expect(await list?.json()).toEqual({ posts: [{ id: 'blog-post-demo-001', state: 'Published' }] });
    const detail = await module.handlePublicRoute(new Request('http://blog.test/api/public/blog/posts/blog-post-demo-001'), new URL('http://blog.test/api/public/blog/posts/blog-post-demo-001'), service);
    expect(await detail?.json()).toEqual({ post: { id: 'blog-post-demo-001', state: 'Published' } });
    expect((await module.handlePublicRoute(new Request('http://blog.test/api/public/blog/posts/blog-post-demo-002'), new URL('http://blog.test/api/public/blog/posts/blog-post-demo-002'), service))?.status).toBe(404);
    expect((await module.handlePublicRoute(new Request('http://blog.test/api/public/blog/posts', { method: 'POST' }), new URL('http://blog.test/api/public/blog/posts'), service))?.status).toBe(405);
    expect(calls).toEqual([{ operation: 'blog.public.posts', request: { q: 'yaml' } }, { operation: 'blog.public.post', request: { id: 'blog-post-demo-001' } }, { operation: 'blog.public.post', request: { id: 'blog-post-demo-002' } }]);
  });

  test('declares a Fluent public post renderer and published-only browser route', () => {
    const renderer = readFileSync(join(import.meta.dir, '../public/components/PublicBlogPost.ts'), 'utf8');
    const app = readFileSync(join(import.meta.dir, '../public/app.ts'), 'utf8');
    expect(renderer).toContain("@core3/client/html");
    expect(renderer).toContain('/api/public/blog/posts/');
    expect(app).toContain("/^\\/blog\\/post\\/?$/");
  });
});

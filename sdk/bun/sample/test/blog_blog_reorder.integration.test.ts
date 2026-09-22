import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/blog');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('BLOG-BLOG-REORDER-001', () => {
  test('maps the Odoo sequence handle to guarded reorder actions', () => {
    const page = yaml('pages/blogs.yaml');
    const api = yaml('api/blogs.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/website_blog/views/website_blog_views.xml', 'utf8');
    const reorderIds = ['move_blog_top', 'move_blog_up', 'move_blog_down', 'move_blog_bottom'];

    expect(source).toContain('<field name="sequence" widget="handle"/>');
    expect(page.components[0].columns.map((column: any) => column.field)).toContain('sequence');
    expect(page.components[0].actions.map((action: any) => action.id)).toEqual(reorderIds);
    expect(api.actions.filter((action: any) => reorderIds.includes(action.id)).map((action: any) => action.id).sort()).toEqual([...reorderIds].sort());
    expect(api.actions.filter((action: any) => reorderIds.includes(action.id)).every((action: any) => action.permission === 'blog.write')).toBe(true);
    expect(api.actions.filter((action: any) => reorderIds.includes(action.id)).every((action: any) => action.refresh.includes('blog_blogs'))).toBe(true);
  });

  test('moves active blogs while preserving ordering, versions, company scope, and edge guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'blog_blog_reorder_test', ['schema', 'data']);
    await repository.query(
      "INSERT INTO blog_blogs(id, row_version, name, subtitle, company_name, active, sequence) VALUES (?, 1, ?, ?, ?, TRUE, 20)",
      ['blog-demo-002', 'Core3 Insights', 'A second blog', 'Core3 Demo Company'],
    );
    const api = yaml('api/blogs.yaml');
    const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);
    const execute = (id: string, blogId: string, version: number) => repository.executeMutation(action(id).mutation, {
      id: blogId,
      expected_row_version: version,
      current_company_name: 'Core3 Demo Company',
    });

    await execute('move_blog_down', 'blog-demo-001', 1);
    expect(await repository.query('SELECT id, sequence, row_version FROM blog_blogs ORDER BY sequence, id'))
      .toEqual([
        { id: 'blog-demo-002', sequence: 10, row_version: 2 },
        { id: 'blog-demo-001', sequence: 20, row_version: 2 },
      ]);

    await execute('move_blog_up', 'blog-demo-001', 2);
    await execute('move_blog_top', 'blog-demo-002', 3);
    await execute('move_blog_bottom', 'blog-demo-002', 4);
    expect(await repository.query('SELECT id, sequence, row_version FROM blog_blogs ORDER BY sequence, id'))
      .toEqual([
        { id: 'blog-demo-001', sequence: 10, row_version: 3 },
        { id: 'blog-demo-002', sequence: 15, row_version: 5 },
      ]);

    await expect(execute('move_blog_down', 'blog-demo-001', 1)).rejects.toMatchObject({ status: 409, code: 'BLOG_SEQUENCE_STALE' });
    await expect(execute('move_blog_up', 'blog-demo-001', 3)).rejects.toMatchObject({ status: 409, code: 'BLOG_SEQUENCE_EDGE' });
    await expect(execute('move_blog_down', 'blog-demo-002', 5)).rejects.toMatchObject({ status: 409, code: 'BLOG_SEQUENCE_EDGE' });
    database.close();
  });
});

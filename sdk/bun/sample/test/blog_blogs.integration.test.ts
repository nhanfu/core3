import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';

const root = join(import.meta.dir, '../services/blog');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Blog Blogs parity slice', () => {
  test('joins the Odoo Blogs action to a page and route', () => {
    const page = yaml('pages/blogs.yaml');
    const api = yaml('api/blogs.yaml');
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('blog')).toEqual(['blog_blogs', 'blog_detail']);
    expect(discoverPageRoutes(discoverPages(join(import.meta.dir, '..')))).toContainEqual(expect.objectContaining({ page: 'blog', path: '/blog' }));
  });

  test('matches Odoo list/form fields and protects mutations', () => {
    const page = yaml('pages/blogs.yaml');
    const api = yaml('api/blogs.yaml');
    expect(page.components[0].columns.map((column: any) => column.field)).toEqual(['sequence', 'name', 'post_count']);
    expect(page.components[0].row_open_action).toBe('edit_blog');
    expect(api.actions.map((action: any) => action.id)).toEqual(['create_blog', 'edit_blog']);
    expect(api.actions.every((action: any) => action.permission === 'blog.write')).toBe(true);
    expect(api.actions[0].mutation.guards.map((guard: any) => guard.code)).toEqual(['BLOG_NAME_REQUIRED', 'BLOG_EXISTS']);
    expect(api.actions.map((action: any) => action.fields.map((field: any) => field.field))).toEqual([['name', 'subtitle'], ['name', 'subtitle']]);
    expect(api.datasources[0].error_states.transport_error.status).toBe(503);
  });
});

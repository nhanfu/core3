import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';

const root = join(import.meta.dir, '../services/blog');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Blog Tag Categories parity slice', () => {
  test('traces the Odoo configuration menu and joined page/API contract', () => {
    const manifest = yaml('manifest.yaml');
    const configuration = manifest.menu.groups.find((group: any) => group.id === 'configuration');
    expect(configuration.items.map((item: any) => item.label)).toEqual(['Blogs', 'Tags', 'Tag Categories']);
    expect(configuration.items[2]).toMatchObject({ path: '/blog-tag-categories', permission: 'blog.read' });
    const page = yaml('pages/tag-categories.yaml');
    const api = yaml('api/tag-categories.yaml');
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('blog-tag-categories')).toEqual(['blog_tag_categories', 'blog_tag_category_detail']);
    expect(discoverPageRoutes(discoverPages(join(import.meta.dir, '..')))).toContainEqual(expect.objectContaining({ page: 'blog-tag-categories', path: '/blog-tag-categories' }));
  });

  test('matches the Odoo list/form fields and enforces permissions and validation', () => {
    const page = yaml('pages/tag-categories.yaml');
    const api = yaml('api/tag-categories.yaml');
    expect(page.components[0].columns).toEqual([{ field: 'name', label: 'Name', type: 'PrimaryEntityCell' }]);
    expect(api.actions.map((action: any) => action.id)).toEqual(['create_blog_tag_category', 'edit_blog_tag_category']);
    for (const action of api.actions) expect(action.permission).toBe('blog.write');
    expect(api.actions[0].mutation.guards.map((guard: any) => guard.code)).toEqual(['BLOG_TAG_CATEGORY_NAME_REQUIRED', 'BLOG_TAG_CATEGORY_EXISTS']);
    expect(api.datasources[0].error_states.transport_error.status).toBe(503);
    expect(yaml('migrations/20260912100000-003-blog-tag-categories.yaml').type.postgres.up).toContain('Technology');
  });
});

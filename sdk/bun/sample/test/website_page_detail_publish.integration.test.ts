import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/website');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Website Page Manager detail publication parity', () => {
  test('traces the Odoo page form and joins detail page/API contracts', () => {
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/website/views/website_pages_views.xml', 'utf8');
    const page = yaml('pages/page-detail.yaml');
    const api = yaml('api/page-detail.yaml');
    const headerActions = page.components[0].header_actions;
    const publish = api.actions.find((action: any) => action.id === 'publish_website_page_detail');
    const unpublish = api.actions.find((action: any) => action.id === 'unpublish_website_page_detail');

    expect(odoo).toContain('model">website.page</field>');
    expect(odoo).toContain('<field name="is_published"/>');
    expect(api.page.id).toBe(page.page.id);
    expect(page.page.id).toBe('website-page-detail');
    expect(headerActions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'publish_website_page_detail', label: 'Publish', permission: 'website.write', show_if: "row.state === 'Draft'" }),
      expect.objectContaining({ id: 'unpublish_website_page_detail', label: 'Unpublish', permission: 'website.manage', show_if: "row.state === 'Published'" }),
    ]));
    expect(publish).toMatchObject({ permission: 'website.write', handler: 'order_transition', workflow: 'website_pages', operation: 'publish' });
    expect(unpublish).toMatchObject({ permission: 'website.manage', handler: 'order_transition', workflow: 'website_pages', operation: 'unpublish' });
    expect(publish.refresh).toEqual(['website_page_detail', 'website_page_assets']);
    expect(unpublish.refresh).toEqual(['website_page_detail', 'website_page_assets']);
  });

  test('detail publication actions reuse guarded transitions and persist across restart', async () => {
    const databasePath = `/tmp/core3-website-page-detail-publish-${crypto.randomUUID()}.duckdb`;
    const workflow = yaml('pages/website-workflow.yaml').workflow;
    const publish = workflow.transitions.find((transition: any) => transition.id === 'publish');
    const unpublish = workflow.transitions.find((transition: any) => transition.id === 'unpublish');
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, `website_page_detail_publish_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);

    await firstRepository.executeMutation(publish.mutation, { id: 'website-page-demo-002', expected_row_version: 1 });
    expect((await firstRepository.query('SELECT state, row_version, date_publish FROM website_pages WHERE id = ?', ['website-page-demo-002']))[0]).toMatchObject({ state: 'Published', row_version: 2 });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, `website_page_detail_publish_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
    await secondRepository.executeMutation(unpublish.mutation, { id: 'website-page-demo-002', expected_row_version: 2 });
    expect((await secondRepository.query('SELECT state, row_version FROM website_pages WHERE id = ?', ['website-page-demo-002']))[0]).toEqual({ state: 'Draft', row_version: 3 });
    await expect(secondRepository.executeMutation(unpublish.mutation, { id: 'website-page-demo-002', expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'WEBSITE_PAGE_UNPUBLISH_STALE' });
    second.close();
  });

  test('detail actions keep the Odoo manager permission boundary', () => {
    const api = yaml('api/page-detail.yaml');
    const publish = api.actions.find((action: any) => action.id === 'publish_website_page_detail');
    const unpublish = api.actions.find((action: any) => action.id === 'unpublish_website_page_detail');
    expect(publish.permission).toBe('website.write');
    expect(unpublish.permission).toBe('website.manage');
    expect(publish.workflow).toBe('website_pages');
    expect(unpublish.workflow).toBe('website_pages');
  });
});

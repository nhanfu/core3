import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (document: any, id: string) => document.actions.find((candidate: any) => candidate.id === id);

describe('eCommerce product SEO metadata parity', () => {
  test('traces Odoo SEO metadata and keeps the Product Detail page/API pair separate', () => {
    const mixins = readFileSync('/home/nhanjs/projects/odoo/addons/website/models/mixins.py', 'utf8');
    const productTemplate = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_template.py', 'utf8');
    const templates = readFileSync('/home/nhanjs/projects/odoo/addons/website/views/website_templates.xml', 'utf8');
    expect(mixins).toContain("_name = 'website.seo.metadata'");
    expect(mixins).toContain('website_meta_title = fields.Char');
    expect(mixins).toContain('website_meta_description = fields.Text');
    expect(mixins).toContain('website_meta_keywords = fields.Char');
    expect(mixins).toContain('website_meta_og_img = fields.Char');
    expect(productTemplate).toContain("'website.seo.metadata'");
    expect(templates).toContain('seo_object.sudo().website_meta_title');
    expect(templates).toContain('seo_object.sudo().website_meta_description');

    const api = yaml('api/product-detail.yaml');
    const page = yaml('pages/product-detail.yaml');
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources[0].query).toContain('is_seo_optimized');
    expect(action(api, 'update_ecommerce_product_seo')).toMatchObject({ type: 'server_form', permission: 'ecommerce.write' });
    expect(action(api, 'update_ecommerce_product_seo').fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'website_meta_title' }),
      expect.objectContaining({ field: 'website_meta_description' }),
      expect.objectContaining({ field: 'website_meta_keywords' }),
      expect.objectContaining({ field: 'website_meta_og_img' }),
    ]));
    expect(page.components[0].header_actions).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'update_ecommerce_product_seo' })]));
    expect(page.components[0].groups).toEqual(expect.arrayContaining([expect.objectContaining({ title: 'SEO Metadata' })]));
  });

  test('persists SEO metadata with optimization, permission, company, validation, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_seo_metadata_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_seo_metadata_test', ['schema', 'data']);
    const api = yaml('api/product-detail.yaml');
    const source = api.datasources[0];
    const edit = action(api, 'update_ecommerce_product_seo');
    const seeded = (await repository.querySource(source, { id: 'ecommerce-product-mug', fixture_state: null, company_name: 'My Company' }, 0, 1)).data as any;
    expect(seeded).toMatchObject({ website_meta_title: 'Core3 Ceramic Mug | Workspace Essentials', is_seo_optimized: true, row_version: 1 });

    const values = {
      website_meta_title: 'Core3 Mug for Teams',
      website_meta_description: 'A durable ceramic mug for focused team workspaces.',
      website_meta_keywords: 'mug, teams, workspace',
      website_meta_og_img: '/web/image/ecommerce-product-mug/seo-og-v2',
    };
    const updated = await repository.executeMutation(edit.mutation, { id: 'ecommerce-product-mug', expected_row_version: 1, current_company_name: 'My Company', values }) as any;
    expect(updated).toMatchObject({ ...values, is_seo_optimized: true, row_version: 2 });
    const cleared = await repository.executeMutation(edit.mutation, { id: 'ecommerce-product-mug', expected_row_version: 2, current_company_name: 'My Company', values: { ...values, website_meta_description: '' } }) as any;
    expect(cleared).toMatchObject({ website_meta_description: null, is_seo_optimized: false, row_version: 3 });

    await expect(repository.executeMutation(edit.mutation, { id: 'ecommerce-product-mug', expected_row_version: 3, current_company_name: 'Other Company', values })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_SEO_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { id: 'ecommerce-product-mug', expected_row_version: 3, current_company_name: 'My Company', values: { ...values, website_meta_title: 'x'.repeat(161) } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_SEO_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { id: 'ecommerce-product-mug', expected_row_version: 2, current_company_name: 'My Company', values })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_SEO_STALE' });
    database.close();
  });

  test('preserves SEO metadata and optimization state across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-product-seo-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_product_seo_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const edit = action(yaml('api/product-detail.yaml'), 'update_ecommerce_product_seo');
    const values = { website_meta_title: 'Restart Safe Mug', website_meta_description: 'SEO metadata survives restart.', website_meta_keywords: 'restart, mug, Core3', website_meta_og_img: '/web/image/restart-mug/og' };
    await firstRepository.executeMutation(edit.mutation, { id: 'ecommerce-product-setup', expected_row_version: 1, current_company_name: 'My Company', values });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const persisted = (await secondRepository.query('SELECT website_meta_title, website_meta_description, website_meta_keywords, website_meta_og_img, row_version FROM ecommerce_products WHERE id = ?', ['ecommerce-product-setup']))[0] as any;
    expect(persisted).toMatchObject({ ...values, row_version: 2 });
    second.close();
    rmSync(databasePath, { force: true });
  });
});

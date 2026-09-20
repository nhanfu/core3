import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('eCommerce product website sequence parity', () => {
  test('traces Odoo ordering actions and pairs the Products page/API contract', () => {
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_template.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/product_views.xml', 'utf8');
    const menu = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/website_sale_menus.xml', 'utf8');
    expect(model).toContain('def set_sequence_top(self):');
    expect(model).toContain('def set_sequence_bottom(self):');
    expect(model).toContain('def set_sequence_up(self):');
    expect(model).toContain('def set_sequence_down(self):');
    expect(view).toContain('<field name="website_sequence" widget="handle"/>');
    expect(view).toContain('default_order">website_sequence</attribute>');
    expect(menu).toContain('action="product_template_action_website"');

    const api = yaml('api/products.yaml');
    const page = yaml('pages/products.yaml');
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0]).toMatchObject({ source: 'ecommerce_products', row_actions: 'menu' });
    expect(page.components[0].actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'move_ecommerce_product_top', label: 'Move to Top' }),
      expect.objectContaining({ id: 'move_ecommerce_product_up', label: 'Move Up' }),
      expect.objectContaining({ id: 'move_ecommerce_product_down', label: 'Move Down' }),
      expect.objectContaining({ id: 'move_ecommerce_product_bottom', label: 'Move to Bottom' }),
    ]));
    for (const id of ['move_ecommerce_product_top', 'move_ecommerce_product_up', 'move_ecommerce_product_down', 'move_ecommerce_product_bottom']) {
      const candidate = api.actions.find((action: any) => action.id === id);
      expect(candidate).toMatchObject({ permission: 'ecommerce.write', action: `ecommerce.products.sequence.${id.replace('move_ecommerce_product_', '')}` });
      expect(candidate.mutation.guards).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'ECOMMERCE_PRODUCT_SEQUENCE_COMPANY_SCOPE_REQUIRED', status: 403 }),
        expect.objectContaining({ code: 'ECOMMERCE_PRODUCT_SEQUENCE_STALE', status: 409 }),
      ]));
    }
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
  });

  test('moves products within published ordering with scope and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_website_sequence_test', ['schema', 'data']);
    const api = yaml('api/products.yaml');
    const source = api.datasources[0];
    const rows = () => repository.querySource(source, { q: null, published: null, company_name: 'My Company', fixture_state: null }, 0, 50);
    expect((await rows()).data.map((row: any) => [row.id, row.website_sequence])).toEqual([
      ['ecommerce-product-mug', 10], ['ecommerce-product-chair', 20], ['ecommerce-product-setup', 30], ['ecommerce-product-lamp', 40],
    ]);
    const down = api.actions.find((action: any) => action.id === 'move_ecommerce_product_down');
    const movedDown = await repository.executeMutation(down.mutation, { id: 'ecommerce-product-mug', expected_row_version: 1, current_company_name: 'My Company' }) as any;
    expect(movedDown).toMatchObject({ id: 'ecommerce-product-mug', website_sequence: 20, row_version: 2 });
    expect((await rows()).data.slice(0, 2).map((row: any) => row.id)).toEqual(['ecommerce-product-chair', 'ecommerce-product-mug']);
    const up = api.actions.find((action: any) => action.id === 'move_ecommerce_product_up');
    const movedUp = await repository.executeMutation(up.mutation, { id: 'ecommerce-product-mug', expected_row_version: 2, current_company_name: 'My Company' }) as any;
    expect(movedUp).toMatchObject({ id: 'ecommerce-product-mug', website_sequence: 10, row_version: 3 });
    const bottom = api.actions.find((action: any) => action.id === 'move_ecommerce_product_bottom');
    const movedBottom = await repository.executeMutation(bottom.mutation, { id: 'ecommerce-product-mug', expected_row_version: 3, current_company_name: 'My Company' }) as any;
    expect(movedBottom).toMatchObject({ id: 'ecommerce-product-mug', website_sequence: 45, row_version: 4 });
    const top = api.actions.find((action: any) => action.id === 'move_ecommerce_product_top');
    const movedTop = await repository.executeMutation(top.mutation, { id: 'ecommerce-product-mug', expected_row_version: 4, current_company_name: 'My Company' }) as any;
    expect(movedTop).toMatchObject({ id: 'ecommerce-product-mug', website_sequence: 15, row_version: 5 });
    await expect(repository.executeMutation(top.mutation, { id: 'ecommerce-product-mug', expected_row_version: 4, current_company_name: 'My Company' })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_SEQUENCE_STALE' });
    await expect(repository.executeMutation(top.mutation, { id: 'ecommerce-product-mug', expected_row_version: 5, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_SEQUENCE_COMPANY_SCOPE_REQUIRED' });
    const lamp = (await rows()).data.find((row: any) => row.id === 'ecommerce-product-lamp');
    await expect(repository.executeMutation(down.mutation, { id: lamp.id, expected_row_version: lamp.row_version, current_company_name: 'My Company' })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_SEQUENCE_EDGE' });
    database.close();
  });

  test('preserves website ordering across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-product-website-sequence-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_product_website_sequence_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const top = yaml('api/products.yaml').actions.find((action: any) => action.id === 'move_ecommerce_product_top');
      await firstRepository.executeMutation(top.mutation, { id: 'ecommerce-product-chair', expected_row_version: 1, current_company_name: 'My Company' });
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT website_sequence, row_version FROM ecommerce_products WHERE id = ?', ['ecommerce-product-chair']))
        .toEqual([{ website_sequence: 5, row_version: 2 }]);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});

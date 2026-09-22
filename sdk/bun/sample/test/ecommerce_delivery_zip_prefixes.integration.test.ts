import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('eCommerce delivery zip prefix parity', () => {
  test('traces the Odoo action and keeps the technical page/API contracts joined by page id', () => {
    const odooMenu = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/website_sale_menus.xml', 'utf8');
    const odooModel = readFileSync('/home/nhanjs/projects/odoo/addons/delivery/models/delivery_zip_prefix.py', 'utf8');
    const odooView = readFileSync('/home/nhanjs/projects/odoo/addons/delivery/views/delivery_zip_prefix_views.xml', 'utf8');
    const manifest = yaml('manifest.yaml');
    const permissions = yaml('permissions.yaml');
    const page = yaml('pages/delivery-zip-prefixes.yaml');
    const api = yaml('api/delivery-zip-prefixes.yaml');
    expect(odooMenu).toContain('id="menu_delivery_zip_prefix"');
    expect(odooMenu).toContain('action="delivery.action_delivery_zip_prefix_list"');
    expect(odooModel).toContain("_name = 'delivery.zip.prefix'");
    expect(odooModel).toContain("vals['name'] = vals['name'].upper()");
    expect(odooView).toContain('<field name="name">Zip Prefix</field>');
    expect(odooView).toContain('<field name="view_mode">list,form</field>');
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/delivery-zip-prefixes', label: 'Zip Prefix', permission: 'ecommerce.technical' }),
    ]));
    expect(permissions.permissions).toContain('ecommerce.technical');
    expect(page.page).toMatchObject({ id: 'ecommerce-delivery-zip-prefixes', route: '/ecommerce/delivery-zip-prefixes', auth: { require: ['ecommerce.technical'] } });
    expect(page.components[0]).toMatchObject({ type: 'ListView', source: 'ecommerce_delivery_zip_prefixes', create_action: 'create_ecommerce_delivery_zip_prefix' });
    expect(api.page).toEqual({ id: 'ecommerce-delivery-zip-prefixes' });
    expect(api.datasources[0]).toMatchObject({ id: 'ecommerce_delivery_zip_prefixes', permission: 'ecommerce.technical' });
    expect(api.actions.map((action: any) => action.id)).toEqual([
      'create_ecommerce_delivery_zip_prefix',
      'edit_ecommerce_delivery_zip_prefix',
      'delete_ecommerce_delivery_zip_prefix',
    ]);
    for (const action of api.actions) expect(action.permission).toBe('ecommerce.technical');
  });

  test('seeds normalized prefixes, supports search and declares empty/error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_delivery_zip_prefixes_contract_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const api = yaml('api/delivery-zip-prefixes.yaml');
    const source = api.datasources[0];
    expect((await repository.querySource(source, { q: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['100', '200', '700$']);
    expect((await repository.querySource(source, { q: '700' }, 0, 50)).data.map((row: any) => row.name)).toEqual(['700$']);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'ECOMMERCE_DELIVERY_ZIP_PREFIXES_UNAVAILABLE' });
    expect(source.error_states.unauthorized).toMatchObject({ status: 401 });
    expect(source.error_states.forbidden).toMatchObject({ status: 403 });
    database.close();
  });

  test('uppercases CRUD values, rejects duplicate/blank/stale records, and survives restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-delivery-zip-prefixes-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_delivery_zip_prefixes_crud_${crypto.randomUUID().replaceAll('-', '_')}`;
    const api = yaml('api/delivery-zip-prefixes.yaml');
    const create = api.actions.find((action: any) => action.id === 'create_ecommerce_delivery_zip_prefix');
    const edit = api.actions.find((action: any) => action.id === 'edit_ecommerce_delivery_zip_prefix');
    const remove = api.actions.find((action: any) => action.id === 'delete_ecommerce_delivery_zip_prefix');
    try {
      const first = await DuckDbDatabase.open(databasePath);
      const repository = new YamlRepository(first);
      await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const created = await repository.executeMutation(create.mutation, { values: { name: '  12ab  ' } }) as any;
      expect(created).toMatchObject({ name: '12AB', row_version: 1 });
      await expect(repository.executeMutation(create.mutation, { values: { name: '12ab' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_DELIVERY_ZIP_PREFIX_EXISTS' });
      await expect(repository.executeMutation(create.mutation, { values: { name: '   ' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_DELIVERY_ZIP_PREFIX_REQUIRED' });
      const updated = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: '  34cd$  ' } }) as any;
      expect(updated).toMatchObject({ id: created.id, name: '34CD$', row_version: 2 });
      await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'stale' } })).rejects.toMatchObject({ status: 409 });
      await expect(repository.executeMutation(edit.mutation, { id: 'missing-zip-prefix', expected_row_version: 1, values: { name: 'missing' } })).rejects.toMatchObject({ status: 404, code: 'ECOMMERCE_DELIVERY_ZIP_PREFIX_NOT_FOUND' });
      const deleted = await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2, values: {} }) as any;
      expect(deleted).toMatchObject({ deleted: true });
      first.close();
      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect((await secondRepository.query('SELECT name FROM ecommerce_delivery_zip_prefixes WHERE id = ?', ['ecommerce-delivery-zip-prefix-100']))).toEqual([{ name: '100' }]);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});

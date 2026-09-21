import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';
import { bindNamedParams } from '@core3/server/database/sql';
import EcommerceModule from '../services/ecommerce/module';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);
const migrate = (repository: YamlRepository, name: string) => migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);

describe('eCommerce access policy parity', () => {
  test('traces Odoo visibility settings and pairs separate page/API, public operation, and shop contracts', () => {
    const websiteModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/website.py', 'utf8');
    const settingsModel = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/res_config_settings.py', 'utf8');
    const settingsView = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/res_config_settings_views.xml', 'utf8');
    const controller = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/controllers/main.py', 'utf8');
    const templates = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/templates.xml', 'utf8');
    const api = yaml('api/ecommerce-access-policy.yaml');
    const page = yaml('pages/ecommerce-access-policy.yaml');
    const shop = yaml('api/shop.yaml');
    const operations = yaml('operations.yaml');
    const manifest = yaml('manifest.yaml');

    expect(websiteModel).toContain('ecommerce_access = fields.Selection');
    expect(websiteModel).toContain("('everyone', \"All users\")");
    expect(websiteModel).toContain("('logged_in', \"Logged in users\")");
    expect(websiteModel).toContain('def has_ecommerce_access(self)');
    expect(settingsModel).toContain('ecommerce_access = fields.Selection');
    expect(settingsView).toContain('id="ecommerce_access_setting"');
    expect(settingsView).toContain('field name="ecommerce_access"');
    expect(controller).toContain('if not request.website.has_ecommerce_access()');
    expect(templates).toContain('website.has_ecommerce_access()');
    expect(page.page).toMatchObject({ id: 'ecommerce-access-policy', route: '/ecommerce/access-policy' });
    expect(api.page).toEqual({ id: 'ecommerce-access-policy' });
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'ecommerce_access_policy' });
    expect(action(api, 'edit_ecommerce_access_policy')).toMatchObject({ permission: 'ecommerce.write', action: 'ecommerce.shop.access_policy.update' });
    expect(action(api, 'edit_ecommerce_access_policy').mutation.concurrency).toEqual({ required: true });
    expect(manifest.menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ecommerce/access-policy', label: 'Shop Visibility', permission: 'ecommerce.read' }),
    ]));
    expect(operations.operations['ecommerce.public.access'].query).toContain('access_mode');
    expect(operations.operations['ecommerce.public.shop'].query).toContain('authenticated');
    expect(shop.actions.find((candidate: any) => candidate.id === 'anonymous_shop_add_to_cart').mutation.guards.map((guard: any) => guard.code)).toContain('ECOMMERCE_ACCESS_AUTHENTICATION_REQUIRED');
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: [...(page.actions || []), ...(api.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(yaml('migrations/20260921280000-120-ecommerce-access-policy.yaml').version).toBe('0.0.120');
    expect(yaml('migrations/20260921281000-121-ecommerce-access-policy-demo.yaml').version).toBe('0.0.121');
  });

  test('enforces company policy validation, authenticated public access, shop visibility, and idempotent anonymous add boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `ecommerce_access_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrate(repository, migrationName);
    await migrate(repository, migrationName);
    const api = yaml('api/ecommerce-access-policy.yaml');
    const edit = action(api, 'edit_ecommerce_access_policy');
    const shopApi = yaml('api/shop.yaml');
    const anonymousAdd = action(shopApi, 'anonymous_shop_add_to_cart');
    const operations = yaml('operations.yaml').operations;

    expect(await repository.querySource(api.datasources[0], { company_name: 'My Company', fixture_state: null }, 0, 10)).toMatchObject({
      data: expect.objectContaining({ company_name: 'My Company', access_mode: 'everyone', access_label: 'All users' }),
    });
    expect((await repository.querySource(api.datasources[1], {}, 0, 10)).data).toEqual([{ value: 'everyone', label: 'All users' }, { value: 'logged_in', label: 'Logged in users' }]);
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'Other Company', id: 'ecommerce-access-policy-my-company', expected_row_version: 1, values: { access_mode: 'logged_in' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_ACCESS_STALE' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-access-policy-my-company', expected_row_version: 1, values: { access_mode: 'internal' } })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_ACCESS_MODE_INVALID' });
    const restricted = await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-access-policy-my-company', expected_row_version: 1, values: { access_mode: 'logged_in' } }) as any;
    expect(restricted).toMatchObject({ row_version: 2, access_mode: 'logged_in', access_label: 'Logged in users' });
    await expect(repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-access-policy-my-company', expected_row_version: 1, values: { access_mode: 'everyone' } })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_ACCESS_STALE' });

    const accessQuery = bindNamedParams(operations['ecommerce.public.access'].query, { authenticated: false });
    expect(await repository.query(accessQuery.statement, accessQuery.values)).toEqual([{ access_mode: 'logged_in', allowed: false }]);
    const guestShop = bindNamedParams(operations['ecommerce.public.shop'].query, { q: null, authenticated: false });
    expect(await repository.query(guestShop.statement, guestShop.values)).toEqual([]);
    const authenticatedShop = bindNamedParams(operations['ecommerce.public.shop'].query, { q: null, authenticated: true });
    expect((await repository.query(authenticatedShop.statement, authenticatedShop.values)).map((row: any) => row.name)).toEqual(['Core3 Ceramic Mug', 'Ergonomic Office Chair', 'Desk Lamp']);
    await expect(repository.executeMutation(anonymousAdd.mutation, { authenticated: false, values: { cart_id: 'ecommerce-cart-anon-access-001', line_id: 'ecommerce-cart-anon-access-001-mug', product_id: 'ecommerce-product-mug' } })).rejects.toMatchObject({ status: 401, code: 'ECOMMERCE_ACCESS_AUTHENTICATION_REQUIRED' });
    const allowed = await repository.executeMutation(anonymousAdd.mutation, { authenticated: true, values: { cart_id: 'ecommerce-cart-anon-access-001', line_id: 'ecommerce-cart-anon-access-001-mug', product_id: 'ecommerce-product-mug' } }) as any;
    expect(allowed).toMatchObject({ cart_id: 'ecommerce-cart-anon-access-001', product_id: 'ecommerce-product-mug', quantity: 1 });
    const allowedAgain = await repository.executeMutation(anonymousAdd.mutation, { authenticated: true, values: { cart_id: 'ecommerce-cart-anon-access-001', line_id: 'ecommerce-cart-anon-access-001-mug', product_id: 'ecommerce-product-mug' } }) as any;
    expect(allowedAgain).toMatchObject({ quantity: 2 });

    const module = new EcommerceModule() as any;
    module.authAdapter = { async getCurrentUser(request: Request) { if (request.headers.get('Authorization')) return { id: 'customer-1' }; throw { status: 401 }; } };
    const calls: any[] = [];
    const publicService = { async call(operation: string, request: any) { calls.push({ operation, request }); if (operation === 'ecommerce.public.access') return { access: [{ allowed: request.authenticated }] }; return { products: [{ id: 'ecommerce-product-mug' }] }; } };
    const blocked = await module.handlePublicRoute(new Request('http://core3.test/api/public/ecommerce/shop'), new URL('http://core3.test/api/public/ecommerce/shop'), publicService);
    expect(blocked?.status).toBe(401);
    const authenticated = await module.handlePublicRoute(new Request('http://core3.test/api/public/ecommerce/shop', { headers: { Authorization: 'Bearer customer' } }), new URL('http://core3.test/api/public/ecommerce/shop'), publicService);
    expect(authenticated?.status).toBe(200);
    expect(calls.at(-1)).toEqual({ operation: 'ecommerce.public.shop', request: { q: null, authenticated: true } });
    database.close();
  });

  test('preserves the access policy across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-access-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_access_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      const api = yaml('api/ecommerce-access-policy.yaml');
      const edit = action(api, 'edit_ecommerce_access_policy');
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrate(repository, migrationName);
      await repository.executeMutation(edit.mutation, { current_company_name: 'My Company', id: 'ecommerce-access-policy-my-company', expected_row_version: 1, values: { access_mode: 'logged_in' } });
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrate(repository, migrationName);
      expect(await repository.query('SELECT company_name, access_mode, row_version FROM ecommerce_access_policies WHERE id = ?', ['ecommerce-access-policy-my-company'])).toEqual([{ company_name: 'My Company', access_mode: 'logged_in', row_version: 2 }]);
    } finally {
      database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});

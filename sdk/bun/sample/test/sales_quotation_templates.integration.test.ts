import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/order');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

describe('Sales quotation templates parity slice', () => {
  test('binds the Odoo action to one menu, page, and separate API contract', () => {
    const manifest = yaml('manifest.yaml');
    const page = yaml('pages/sale-quotation-templates.yaml');
    const api = yaml('api/sale-quotation-templates.yaml');
    const menu = manifest.menu.groups.find((group: any) => group.id === 'configuration').items;
    expect(menu).toContainEqual({ path: '/order/quotation-templates', label: 'Quotation Templates', icon: 'document', permission: 'orders.read' });
    expect(page.page).toMatchObject({ id: 'sale-quotation-templates', route: '/order/quotation-templates' });
    expect(api.page).toEqual({ id: 'sale-quotation-templates' });
    expect(page.datasources).toBeUndefined();
    expect(page.components[0]).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'sale_quotation_templates', create_action: 'create_sale_quotation_template', create_label: 'New' });
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual(['Quotation Template', 'Company']);
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pages.get('sale-quotation-templates')).toBeTruthy();
    expect(discovered.pageDatasources.get('sale-quotation-templates')).toContain('sale_quotation_templates');
  });

  test('provides deterministic fixtures, empty/error states, and CRUD guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'sales_quotation_templates_acceptance', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'sales_quotation_templates_acceptance', ['schema', 'data']);
    const listApi = yaml('api/sale-quotation-templates.yaml');
    const source = listApi.datasources[0];
    expect((await repository.querySource(source, { q: null, active: true, fixture_state: null }, 0, 50)).data).toEqual([expect.objectContaining({ id: 'sale-quotation-template-office-furnitures', name: 'Office Furnitures', company_name: 'My Company (San Francisco)' })]);
    expect((await repository.querySource(source, { q: 'office', active: true, fixture_state: null }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(source, { q: 'missing', active: true, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, active: true, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: true, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'SALES_QUOTATION_TEMPLATES_UNAVAILABLE' });
    const create = action(listApi, 'create_sale_quotation_template');
    expect(create.permission).toBe('orders.write');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Services 2026' } });
    expect(created).toMatchObject({ id: 'sale-quotation-template-services-2026', row_version: 1, name: 'Services 2026', active: true });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' services 2026 ' } })).rejects.toMatchObject({ status: 409, code: 'SALES_QUOTATION_TEMPLATE_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' ' } })).rejects.toMatchObject({ status: 422, code: 'SALES_QUOTATION_TEMPLATE_NAME_REQUIRED' });
    const detailApi = yaml('api/sale-quotation-template-detail.yaml');
    const update = action(detailApi, 'edit_sale_quotation_template');
    expect(update.mutation.concurrency).toMatchObject({ required: true });
    const edited = await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Services 2026 Updated', company_name: 'My Company (San Francisco)' } });
    expect(edited).toMatchObject({ id: created.id, row_version: 2, name: 'Services 2026 Updated' });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(update.mutation, { id: 'missing-template', expected_row_version: 1, values: { name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'SALES_QUOTATION_TEMPLATE_NOT_FOUND' });
    await database.close();
  });
});

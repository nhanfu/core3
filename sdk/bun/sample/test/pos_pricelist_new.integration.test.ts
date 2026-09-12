import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS Pricelists New action parity', () => {
  test('registers the Odoo New action and keeps page/API ids joined', () => {
    const list = yaml('pages/pos-pricelists.yaml');
    const page = yaml('pages/pos-pricelist-new.yaml');
    const api = yaml('api/pos-pricelist-new.yaml');
    expect(list.components[0]).toMatchObject({ create_label: 'New', create_action: 'new_pos_pricelist' });
    expect(list.actions).toContainEqual(expect.objectContaining({ id: 'new_pos_pricelist', navigate_to: '/point-of-sale/pricelists/new', permission: 'pos.manage' }));
    expect(page.page).toMatchObject({ id: 'pos-pricelist-new', route: '/point-of-sale/pricelists/new' });
    expect(api.page.id).toBe(page.page.id);
    expect(page.page.auth.require).toEqual(['pos.read']);
    expect(api.datasources[0].permission).toBe('pos.read');
    expect(api.actions.find((item: any) => item.id === 'create_pos_pricelist').permission).toBe('pos.manage');
    expect(api.actions.find((item: any) => item.id === 'create_pos_pricelist').permission).not.toBe('pos.write');
    expect(page.components[0].groups[0].fields.map((field: any) => field.label)).toEqual(['Pricelist Name', 'Currency', 'Company', 'Country Groups']);
    expect(page.components[0].notebook.tabs[0].label).toBe('Sales Prices');
  });

  test('creates deterministic pricelists with manager-only validation and duplicate guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_pricelist_new', ['schema', 'data']);
    const action = yaml('api/pos-pricelist-new.yaml').actions.find((item: any) => item.id === 'create_pos_pricelist');
    const created = await repository.executeMutation(action.mutation, { values: { name: 'Retail 2026', country_groups: 'All countries', company: 'My Company (San Francisco)', currency: 'USD', active: true } });
    expect(created).toMatchObject({ name: 'Retail 2026', company: 'My Company (San Francisco)', currency: 'USD', active: true });
    await expect(repository.executeMutation(action.mutation, { values: { name: 'Retail 2026', company: 'My Company (San Francisco)', currency: 'USD' } })).rejects.toMatchObject({ status: 409, code: 'POS_PRICELIST_NAME_EXISTS' });
    await expect(repository.executeMutation(action.mutation, { values: { name: '', company: 'My Company (San Francisco)', currency: 'USD' } })).rejects.toMatchObject({ status: 422, code: 'POS_PRICELIST_NAME_REQUIRED' });
    database.close();
  });
});

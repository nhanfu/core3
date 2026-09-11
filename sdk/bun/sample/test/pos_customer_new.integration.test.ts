import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(file).actions.find((candidate: any) => candidate.id === id);

describe('POS Customers New action parity', () => {
  test('keeps the Customers list and New page/API contracts separate', () => {
    const menu = yaml('manifest.yaml').menu.groups.flatMap((group: any) => group.items);
    expect(menu).toContainEqual(expect.objectContaining({ path: '/point-of-sale/customers', label: 'Customers', permission: 'pos.read' }));

    const listPage = yaml('pages/pos-customers.yaml');
    const listApi = yaml('api/pos-customers.yaml');
    const newPage = yaml('pages/pos-customer-new.yaml');
    const newApi = yaml('api/pos-customer-new.yaml');
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(newApi.page.id).toBe(newPage.page.id);
    expect(listPage).not.toHaveProperty('actions');
    expect(newPage).not.toHaveProperty('actions');
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('pos-customer-new')).toEqual(['pos_customer_new']);

    expect(listPage.components[0]).toMatchObject({ type: 'ListView', source: 'pos_customer_directory', create_action: 'new_pos_customer', create_label: 'New' });
    expect(action('api/pos-customers.yaml', 'new_pos_customer')).toMatchObject({ permission: 'pos.write', navigate_to: '/point-of-sale/customer-new' });
    const form = newPage.components[0];
    expect(form).toMatchObject({ type: 'OdooFormView', source: 'pos_customer_new', editable: true, initial_editing: true });
    expect(form.groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual([
      'Name', 'Type', 'Email', 'Phone', 'Website', 'Tags', 'Street', 'Street 2', 'City', 'State', 'ZIP', 'Country',
    ]);
    expect(form.notebook.tabs.map((tab: any) => tab.label)).toEqual(['Contacts', 'Sales & Purchase', 'Invoicing', 'Notes']);
  });

  test('seeds deterministic profiles and projects order totals through the customer list/detail', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_customer_new_read', ['schema', 'data']);
    const directory = yaml('api/pos-customers.yaml').datasources[0];
    const detail = yaml('api/pos-customer-detail.yaml').datasources[0];
    expect((await repository.querySource(directory, { q: null }, 0, 50)).data).toHaveLength(3);
    expect((await repository.querySource(directory, { q: 'wayne' }, 0, 50)).data).toMatchObject([{ id: 'pos-customer-wayne', partner_name: 'Wayne Industries', order_count: 1, total_sales: 45.25 }]);
    expect(await repository.querySource(detail, { id: 'pos-customer-touch' }, 0, 1)).toMatchObject({ data: { partner_name: 'Touch Demo Customer', order_count: 1, total_sales: 3.85 } });
    expect((await repository.querySource(directory, { q: 'does-not-exist' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('enforces create permission, required/type/email/duplicate guards and refreshes the list', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_customer_new_crud', ['schema', 'data']);
    const create = action('api/pos-customer-new.yaml', 'create_pos_customer');
    expect(create).toMatchObject({ type: 'server_form', permission: 'pos.write', operation: 'insert', handler: 'yaml_mutation' });
    expect(create.mutation).toMatchObject({ operation: 'insert', table: 'pos_customers', required: ['name'] });

    const created = await repository.executeMutation(create.mutation, { values: {
      name: 'Northwind Walk-In', company_type: 'company', email: 'northwind@example.test', phone: '+1 555 0199', city: 'San Francisco', country_name: 'United States',
    } });
    expect(created).toMatchObject({ name: 'Northwind Walk-In', company_type: 'company', email: 'northwind@example.test', row_version: 1, active: true });
    const directory = yaml('api/pos-customers.yaml').datasources[0];
    expect((await repository.querySource(directory, { q: 'northwind' }, 0, 50)).data).toMatchObject([{ id: created.id, partner_name: 'Northwind Walk-In', order_count: 0 }]);
    await expect(repository.executeMutation(create.mutation, { values: { name: '   ' } })).rejects.toMatchObject({ status: 422, code: 'POS_CUSTOMER_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Bad Type', company_type: 'other' } })).rejects.toMatchObject({ status: 422, code: 'POS_CUSTOMER_TYPE_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Bad Email', email: 'not-an-email' } })).rejects.toMatchObject({ status: 422, code: 'POS_CUSTOMER_EMAIL_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'acme corporation' } })).rejects.toMatchObject({ status: 409, code: 'POS_CUSTOMER_NAME_EXISTS' });
    database.close();
  });
});

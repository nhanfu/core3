import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const serviceRoot = join(import.meta.dir, '../services/base');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Base contact hierarchy child relation', () => {
  test('joins the Odoo Contacts notebook relation to the page-matched API', () => {
    const page = yaml('pages/contact-detail.yaml');
    const api = yaml('api/contact-detail.yaml');
    const grid = page.components.find((component: any) => component.source === 'contact_child_contacts');
    const source = api.datasources.find((candidate: any) => candidate.id === 'contact_child_contacts');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    validatePageDefinition({ ...page, actions: api.actions, datasources: api.datasources }, { allowExternalSources: true });
    expect(page.page).toEqual(expect.objectContaining({ id: 'contact-detail' }));
    expect(page.components[0].notebook.tabs.find((tab: any) => tab.id === 'contacts')).toMatchObject({ label: 'Contacts', content_slot: true });
    expect(grid).toMatchObject({ type: 'LineItemGrid', parent_source: 'contact_detail', variant: 'odoo_x2many', title: 'Contacts' });
    expect(grid.columns.map((column: any) => column.label)).toEqual(['Name', 'Type', 'Email', 'Phone', 'City', '']);
    expect(grid.actions).toContainEqual(expect.objectContaining({ id: 'add_contact_child', permission: 'base.contacts.write' }));
    expect(source).toMatchObject({ permission: 'base.contacts.read', error_states: { transport_error: { code: 'BASE_CONTACT_CHILDREN_UNAVAILABLE', status: 503 } } });
    expect(discovered.pageDatasources.get('contact-detail')).toContain('contact_child_contacts');
    expect(action(api, 'add_contact_child')).toMatchObject({ type: 'server_form', handler: 'line_item', operation: 'create', permission: 'base.contacts.write' });
    expect(action(api, 'edit_contact_child')).toMatchObject({ type: 'server_form', handler: 'line_item', operation: 'update', permission: 'base.contacts.write' });
    expect(action(api, 'delete_contact_child')).toMatchObject({ type: 'server', handler: 'line_item', operation: 'delete', permission: 'base.contacts.write' });
  });

  test('reads deterministic children with empty, transport, and company-scope states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_contact_children_read_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_contact_children_read_migrations', ['schema', 'data']);
    const source = yaml('api/contact-detail.yaml').datasources.find((candidate: any) => candidate.id === 'contact_child_contacts');

    expect((await repository.querySource(source, { id: 'company-demo', q: null, fixture_state: null, current_company_id: 'company-demo' }, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'contact-demo-child', name: 'Demo Contact Address', parent_company_id: 'company-demo', company_type: 'person', email: 'address@core3.local' }),
    ]);
    expect((await repository.querySource(source, { id: 'company-demo', q: 'missing', fixture_state: null, current_company_id: 'company-demo' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { id: 'company-demo', q: null, fixture_state: 'empty', current_company_id: 'company-demo' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { id: 'company-demo', q: null, fixture_state: null, current_company_id: 'company-vietnam' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { id: 'company-demo', q: null, fixture_state: 'transport_error', current_company_id: 'company-demo' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'BASE_CONTACT_CHILDREN_UNAVAILABLE' });
    database.close();
  });

  test('creates, edits, deletes, rejects stale or invalid children, and survives restart', async () => {
    const databasePath = `/tmp/core3-base-contact-children-${crypto.randomUUID()}.duckdb`;
    const migrationName = `base_contact_children_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const migrations = join(serviceRoot, 'migrations');
    const api = yaml('api/contact-detail.yaml');
    const add = action(api, 'add_contact_child');
    const edit = action(api, 'edit_contact_child');
    const remove = action(api, 'delete_contact_child');

    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, migrations, undefined, migrationName, ['schema', 'data']);

      const created = await firstRepository.executeMutation(add.mutation, {
        parent_id: 'company-demo', parent_expected_row_version: 1, current_company_id: 'company-demo',
        values: { name: 'Restart-safe related contact', company_type: 'person', email: 'restart-child@core3.local', phone: '+1 555 0112' },
      }) as any;
      expect(created).toMatchObject({ id: 'base-contact-child-company-demo-restart-safe-related-contact', name: 'Restart-safe related contact', parent_company_id: 'company-demo', company_id: 'company-demo', row_version: 1 });
      expect((await firstRepository.query("SELECT row_version FROM base_contacts WHERE id = 'company-demo'")).at(0)).toEqual({ row_version: 2 });

      await expect(firstRepository.executeMutation(add.mutation, {
        parent_id: 'company-demo', parent_expected_row_version: 1, current_company_id: 'company-demo',
        values: { name: 'Stale parent child' },
      })).rejects.toMatchObject({ status: 409, code: 'BASE_CONTACT_CHILD_PARENT_STALE' });
      await expect(firstRepository.executeMutation(add.mutation, {
        parent_id: 'company-demo', parent_expected_row_version: 2, current_company_id: 'company-demo',
        values: { name: '' },
      })).rejects.toMatchObject({ status: 422, code: 'BASE_CONTACT_CHILD_NAME_REQUIRED' });
      await expect(firstRepository.executeMutation(add.mutation, {
        parent_id: 'company-demo', parent_expected_row_version: 2, current_company_id: 'company-demo',
        values: { name: 'Duplicate child', email: 'restart-child@core3.local' },
      })).rejects.toMatchObject({ status: 409, code: 'BASE_CONTACT_EMAIL_EXISTS' });

      const edited = await firstRepository.executeMutation(edit.mutation, {
        id: created.id, parent_id: 'company-demo', parent_expected_row_version: 2, expected_row_version: 1, current_company_id: 'company-demo',
        values: { name: 'Restart-safe related contact updated', company_type: 'person', email: 'restart-child-updated@core3.local', phone: '+1 555 0113' },
      }) as any;
      expect(edited).toMatchObject({ id: created.id, name: 'Restart-safe related contact updated', row_version: 2 });
      await expect(firstRepository.executeMutation(edit.mutation, {
        id: created.id, parent_id: 'company-demo', parent_expected_row_version: 3, expected_row_version: 1, current_company_id: 'company-demo',
        values: { name: 'Stale child edit' },
      })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, migrations, undefined, migrationName, ['schema', 'data']);
      const source = api.datasources.find((candidate: any) => candidate.id === 'contact_child_contacts');
      expect((await secondRepository.querySource(source, { id: 'company-demo', q: 'Restart-safe', fixture_state: null, current_company_id: 'company-demo' }, 0, 50)).data).toMatchObject([
        { id: created.id, name: 'Restart-safe related contact updated', row_version: 2 },
      ]);
      await expect(secondRepository.executeMutation(remove.mutation, {
        id: created.id, parent_id: 'company-demo', parent_expected_row_version: 3, expected_row_version: 2, current_company_id: 'company-demo',
      })).resolves.toMatchObject({ id: created.id });
      expect((await secondRepository.query('SELECT COUNT(*) AS count FROM base_contacts WHERE id = ?', [created.id])).at(0)).toEqual({ count: 0 });
      await expect(secondRepository.executeMutation(remove.mutation, {
        id: created.id, parent_id: 'company-demo', parent_expected_row_version: 4, expected_row_version: 2, current_company_id: 'company-demo',
      })).rejects.toMatchObject({ status: 404, code: 'BASE_CONTACT_CHILD_NOT_FOUND' });
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});

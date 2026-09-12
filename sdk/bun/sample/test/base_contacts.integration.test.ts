import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/base');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const source = (file: string, id: string) => yaml(`api/${file}`).datasources.find((item: any) => item.id === id);

describe('Base Contacts list/card/detail parity batch', () => {
  test('keeps Contacts layouts presentation-only and API-owned by page id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    for (const [pageFile, pageId, apiFile, dataSourceId] of [
      ['pages/contacts.yaml', 'contacts', 'contacts.yaml', 'contacts'],
      ['pages/contact-detail.yaml', 'contact-detail', 'contact-detail.yaml', 'contact_detail'],
    ] as const) {
      const page = yaml(pageFile);
      expect(page.datasources, pageFile).toBeUndefined();
      expect(page.actions, pageFile).toBeUndefined();
      expect(page.page.id, pageFile).toBe(pageId);
      expect(discovered.pages.get(pageId)?.config.page.id, pageFile).toBe(pageId);
      expect(discovered.pageDatasources.get(pageId), pageFile).toContain(dataSourceId);
      expect(readdirSync(join(serviceRoot, 'api'))).toContain(apiFile);
    }
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/contacts', page: 'contacts', module: 'base' }),
      expect.objectContaining({ path: '/contacts/detail', page: 'contact-detail', module: 'base' }),
    ]));
  });

  test('matches Odoo Contacts list/card and detail interaction contracts', () => {
    const list = yaml('pages/contacts.yaml').components.find((component: any) => component.type === 'ListView');
    expect(list).toMatchObject({ source: 'contacts', view_navigation: 'tabs', row_open_action: 'view_contact', row_double_click_action: 'view_contact' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'card', 'kanban']);
    expect(list.views.find((view: any) => view.id === 'card')).toMatchObject({ label: 'Cards', card: { title: 'name', subtitle: 'email', image_field: 'avatar_url' } });
    expect(list.views.filter((view: any) => view.mobile === false).map((view: any) => view.id)).toEqual(['list', 'kanban']);
    expect(yaml('api/contacts.yaml').datasources.map((item: any) => item.id)).toEqual(['contact_active_states', 'contacts', 'contact_types', 'contact_countries']);
    expect(list.filters[0]).toMatchObject({ field: 'active', label: 'Status', options_source: 'contact_active_states' });
    expect(list.columns.find((column: any) => column.field === 'id').actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'archive_contact', label: 'Archive', show_if: 'row.active === true' }),
      expect.objectContaining({ id: 'unarchive_contact', label: 'Unarchive', show_if: 'row.active === false' }),
    ]));

    const detail = yaml('pages/contact-detail.yaml');
    const form = detail.components.find((component: any) => component.type === 'OdooFormView');
    expect(form).toMatchObject({ source: 'contact_detail', avatar_field: 'avatar_url', avatar_initials_field: 'avatar_initials', message_source: 'contact_messages', follower_source: 'contact_followers', attachment_source: 'contact_attachments', activity_action: 'schedule_activity' });
    expect(form.stat_buttons.map((button: any) => button.label)).toEqual(['Live Chat', 'Opportunities', 'Invoiced', 'Meetings', 'Tasks', 'Purchases', 'Lots/Serial Numbers']);
    expect(form.notebook.tabs.map((tab: any) => tab.label)).toEqual(['Contacts', 'Sales & Purchase', 'Invoicing', 'Notes']);
    expect(detail.components.find((component: any) => component.type === 'ListView')).toMatchObject({ source: 'contact_activities', mount_in: 'previous-panel' });
    expect(yaml('api/contacts.yaml').actions.find((action: any) => action.id === 'view_contact')).toMatchObject({ navigate_to: '/contacts/detail', params: { id: '{row.id}' } });
  });

  test('returns realistic deterministic records with search and empty fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_contacts_test_schema_migrations', ['schema', 'data']);

    const contacts = source('contacts.yaml', 'contacts');
    const defaults = await repository.querySource(contacts, { q: null, active: null, company_type: null, country_name: null, fixture_state: null }, 0, 50);
    expect(defaults.data.map((row: any) => row.id)).toEqual([
      'company-azure', 'contact-azure-brandon', 'company-demo', 'company-vietnam', 'contact-demo',
      'contact-gemini-edwin', 'company-gemini', 'contact-gemini-jesse', 'contact-berlin',
    ]);
    expect(defaults.data.find((row: any) => row.id === 'contact-demo')).toMatchObject({ name: 'Demo Contact', avatar_initials: 'D', category_count: 1, activity_count: 1 });
    expect((await repository.querySource(contacts, { q: 'Leonie', active: null, company_type: null, country_name: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['contact-berlin']);
    expect((await repository.querySource(contacts, { q: null, active: null, company_type: 'person', country_name: 'Vietnam', fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['contact-gemini-edwin', 'contact-gemini-jesse']);
    expect((await repository.querySource(contacts, { q: null, active: 'archived', company_type: null, country_name: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['contact-archived', 'contact-archive-filter']);
    expect((await repository.querySource(contacts, { q: null, active: null, company_type: null, country_name: null, fixture_state: 'empty' })).data).toEqual([]);

    const detail = source('contact-detail.yaml', 'contact_detail');
    expect(await repository.querySource(detail, { id: 'contact-demo', fixture_state: null }, 0, 1)).toMatchObject({ data: expect.objectContaining({ name: 'Demo Contact', categories: 'Partner', avatar_initials: 'D' }) });
    expect((await repository.querySource(detail, { id: 'missing-contact', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(source('contact-detail.yaml', 'contact_messages'), { id: 'contact-demo', fixture_state: null }, 0, 50)).data).toHaveLength(2);
  });

  test('keeps read/write permissions and transport-error contracts explicit', () => {
    for (const file of ['api/contacts.yaml', 'api/contact-detail.yaml']) {
      for (const item of yaml(file).datasources) expect(item.permission, `${file}:${item.id}`).toMatch(/^(base\.(contacts|activities)|livechat)\.read$/);
    }
    expect(source('contacts.yaml', 'contacts').error_states.transport_error).toEqual({ status: 503, code: 'BASE_CONTACTS_DATA_UNAVAILABLE', message: 'Contacts data is temporarily unavailable' });
    expect(source('contact-detail.yaml', 'contact_detail').error_states.transport_error.status).toBe(503);
    expect(yaml('api/contacts.yaml').actions.find((action: any) => action.id === 'create_contact')).toMatchObject({ permission: 'base.contacts.write', operation: 'create', mutation: { required: ['name'] } });
    expect(yaml('api/contact-detail.yaml').actions.find((action: any) => action.id === 'edit_contact_detail')).toMatchObject({ permission: 'base.contacts.write', operation: 'update' });
    expect(yaml('api/contact-detail.yaml').actions.find((action: any) => action.id === 'schedule_activity')).toMatchObject({ permission: 'base.activities.write', operation: 'create' });
    for (const id of ['archive_contact', 'unarchive_contact']) {
      expect(yaml('api/contacts.yaml').actions.find((action: any) => action.id === id)).toMatchObject({ permission: 'base.contacts.write', handler: 'yaml_mutation', params: { id: '{row.id}', expected_row_version: '{row.row_version}' } });
    }
  });

  test('archives and restores contacts with permissioned stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_contacts_archive_test_migrations', ['schema', 'data']);
    const actions = yaml('api/contacts.yaml').actions;
    const archive = actions.find((candidate: any) => candidate.id === 'archive_contact');
    const restore = actions.find((candidate: any) => candidate.id === 'unarchive_contact');

    const archived = await repository.executeMutation(archive.mutation, { id: 'contact-demo', expected_row_version: 1 });
    expect(archived).toMatchObject({ id: 'contact-demo', active: false, row_version: 2 });
    await expect(repository.executeMutation(archive.mutation, { id: 'contact-demo', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'BASE_CONTACT_ALREADY_ARCHIVED' });
    await expect(repository.executeMutation(restore.mutation, { id: 'contact-demo', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'BASE_CONTACT_ALREADY_ACTIVE' });
    const restored = await repository.executeMutation(restore.mutation, { id: 'contact-demo', expected_row_version: 2 });
    expect(restored).toMatchObject({ id: 'contact-demo', active: true, row_version: 3 });
    await expect(repository.executeMutation(restore.mutation, { id: 'contact-demo', expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'BASE_CONTACT_ALREADY_ACTIVE' });
    await expect(repository.executeMutation(archive.mutation, { id: 'missing-contact', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'BASE_CONTACT_NOT_FOUND' });
    database.close();
  });
});

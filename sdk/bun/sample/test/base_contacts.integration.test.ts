import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const serviceRoot = join(import.meta.dir, '../services/base');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const source = (file: string, id: string) => yaml(`api/${file}`).datasources.find((item: any) => item.id === id);

describe('Base Contacts list/card/detail parity batch', () => {
  test('keeps Contacts layouts presentation-only and API-owned by page id', { timeout: 20000 }, () => {
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
    expect(yaml('api/contacts.yaml').datasources.map((item: any) => item.id)).toEqual(['contact_active_states', 'contacts', 'contact_types', 'contact_countries', 'contact_parent_companies']);
    expect(list.filters[0]).toMatchObject({ field: 'active', label: 'Status', options_source: 'contact_active_states' });
    expect(list.columns.find((column: any) => column.field === 'id').actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'archive_contact', label: 'Archive', show_if: 'row.active === true' }),
      expect.objectContaining({ id: 'unarchive_contact', label: 'Unarchive', show_if: 'row.active === false' }),
    ]));

    const detail = yaml('pages/contact-detail.yaml');
    const form = detail.components.find((component: any) => component.type === 'OdooFormView');
    expect(form).toMatchObject({ source: 'contact_detail', avatar_field: 'avatar_url', avatar_initials_field: 'avatar_initials', message_source: 'contact_messages', follower_source: 'contact_followers', attachment_source: 'contact_attachments', attachment_panel_open: true, activity_action: 'schedule_activity' });
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
      'company-northwind',
    ]);
    expect(defaults.data.find((row: any) => row.id === 'contact-demo')).toMatchObject({ name: 'Demo Contact', avatar_initials: 'D', category_count: 1, activity_count: 1 });
    expect((await repository.querySource(contacts, { q: 'Leonie', active: null, company_type: null, country_name: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['contact-berlin']);
    expect((await repository.querySource(source('contacts.yaml', 'contact_parent_companies'), {}, 0, 50)).data).toEqual(expect.arrayContaining([{ value: 'company-azure', label: 'Azure Interior' }]));
    expect((await repository.querySource(contacts, { q: null, active: null, company_type: 'person', country_name: 'Vietnam', fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['contact-gemini-edwin', 'contact-gemini-jesse']);
    expect((await repository.querySource(source('contacts.yaml', 'contact_parent_companies'), {}, 0, 50)).data).toEqual(expect.arrayContaining([
      { value: 'company-azure', label: 'Azure Interior' },
      { value: 'company-gemini', label: 'Gemini Furniture' },
    ]));
    expect((await repository.querySource(contacts, { q: null, active: 'archived', company_type: null, country_name: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['company-archived', 'contact-archived', 'contact-archive-filter']);
    expect((await repository.querySource(contacts, { q: null, active: null, company_type: null, country_name: null, fixture_state: 'empty' })).data).toEqual([]);

    const detail = source('contact-detail.yaml', 'contact_detail');
    expect(await repository.querySource(detail, { id: 'contact-demo', fixture_state: null }, 0, 1)).toMatchObject({ data: expect.objectContaining({ name: 'Demo Contact', categories: 'Partner', avatar_initials: 'D' }) });
    expect((await repository.querySource(detail, { id: 'missing-contact', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(source('contact-detail.yaml', 'contact_messages'), { id: 'contact-demo', fixture_state: null }, 0, 50)).data).toHaveLength(2);
    expect((await repository.querySource(source('contact-detail.yaml', 'contact_attachments'), { id: 'contact-demo', fixture_state: null }, 0, 50)).data).toHaveLength(1);
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
    expect(yaml('api/contact-detail.yaml').actions.find((action: any) => action.id === 'upload_contact_attachment')).toMatchObject({ type: 'upload', handler: 'attachment_metadata', permission: 'base.contacts.write', kind: 'base_contact_attachment' });
    expect(yaml('api/contact-detail.yaml').actions.find((action: any) => action.id === 'download_contact_attachment')).toMatchObject({ type: 'download', permission: 'base.contacts.read', kind: 'base_contact_attachment' });
    expect(yaml('storage.yaml')).toMatchObject({ attachments: { base_contact_attachment: { download: { route: '/api/base/contacts/attachments', permission: 'base.contacts.read' } } } });
    expect(yaml('api/contact-detail.yaml').actions.find((action: any) => action.id === 'delete_contact')).toMatchObject({ operation: 'delete', permission: 'base.contacts.manage' });
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

  test('persists a valid company hierarchy and declares guarded parent writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_contacts_hierarchy_test_migrations', ['schema', 'data']);
    const actions = yaml('api/contacts.yaml').actions;
    const edit = actions.find((candidate: any) => candidate.id === 'edit_contact');
    const created = await repository.executeMutation(actions.find((candidate: any) => candidate.id === 'create_contact').mutation, {
      name: 'Hierarchy QA Contact', company_type: 'person', email: 'hierarchy-qa@core3.local', parent_company_id: 'company-azure', is_company: false,
    });
    expect(created).toMatchObject({ name: 'Hierarchy QA Contact', parent_company_id: 'company-azure' });
    const updated = await repository.executeMutation(edit.mutation, {
      id: created.id, row_version: created.row_version, expected_row_version: created.row_version, name: 'Hierarchy QA Contact', company_type: 'person', email: 'hierarchy-qa@core3.local', parent_company_id: 'company-gemini', is_company: false,
    });
    expect(updated).toMatchObject({ id: created.id, parent_company_id: 'company-gemini' });
    await expect(repository.executeMutation(edit.mutation, {
      id: created.id, row_version: updated.row_version, expected_row_version: updated.row_version, name: 'Hierarchy QA Contact', company_type: 'person', email: 'hierarchy-qa@core3.local', parent_company_id: 'contact-berlin', is_company: false,
    })).rejects.toMatchObject({ status: 422, code: 'BASE_PARENT_COMPANY_INVALID' });
    await expect(repository.executeMutation(edit.mutation, {
      id: created.id, row_version: updated.row_version, expected_row_version: updated.row_version, name: 'Hierarchy QA Contact', company_type: 'person', email: 'hierarchy-qa@core3.local', parent_company_id: created.id, is_company: false,
    })).rejects.toMatchObject({ status: 422, code: 'BASE_PARENT_COMPANY_INVALID' });
    expect(edit.mutation.fields).toContain('parent_company_id');
    expect(edit.mutation.guards).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'BASE_PARENT_COMPANY_INVALID', status: 422 })]));
    expect(yaml('api/contact-detail.yaml').actions.find((candidate: any) => candidate.id === 'edit_contact_detail').mutation.fields).toContain('parent_company_id');
    expect(yaml('api/contacts.yaml').datasources.find((candidate: any) => candidate.id === 'contact_parent_companies').permission).toBe('base.contacts.read');
    database.close();
  });

  test('reopens a file-backed database with contact attachment metadata intact', async () => {
    const root = mkdtempSync(join(tmpdir(), 'core3-base-contact-attachments-'));
    const databasePath = join(root, 'base.duckdb');
    const migrationTable = 'base_contacts_attachment_restart_migrations';
    const upload = yaml('api/contact-detail.yaml').actions.find((candidate: any) => candidate.id === 'upload_contact_attachment');

    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationTable, ['schema', 'data']);

      const uploaded = await firstRepository.executeMutation(upload.mutation, {
        contact_id: 'contact-demo',
        current_user_id: 'base-restart-qa',
        fileName: 'restart-proof.txt',
        mimeType: 'text/plain',
        sizeBytes: 23,
        storageKey: 'contacts/contact-demo/restart-proof.txt',
      }) as any;
      expect(uploaded).toMatchObject({
        contact_id: 'contact-demo',
        file_name: 'restart-proof.txt',
        mime_type: 'text/plain',
        size_bytes: 23,
        uploaded_by: 'base-restart-qa',
      });
      const attachmentId = uploaded.id;
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(serviceRoot, 'migrations'), undefined, migrationTable, ['schema', 'data']);

      expect(await reopenedRepository.query(
        'SELECT id, contact_id, file_name, mime_type, size_bytes, storage_key, uploaded_by FROM base_contact_attachments WHERE id = ?',
        [attachmentId],
      )).toEqual([{
        id: attachmentId,
        contact_id: 'contact-demo',
        file_name: 'restart-proof.txt',
        mime_type: 'text/plain',
        size_bytes: 23,
        storage_key: 'contacts/contact-demo/restart-proof.txt',
        uploaded_by: 'base-restart-qa',
      }]);
      const reopenedAttachments = (await reopenedRepository.querySource(
        source('contact-detail.yaml', 'contact_attachments'),
        { id: 'contact-demo', fixture_state: null },
        0,
        50,
      )).data;
      expect(reopenedAttachments.find((attachment: any) => attachment.id === attachmentId)).toMatchObject({
        id: attachmentId,
        file_name: 'restart-proof.txt',
        mime_type: 'text/plain',
        size_bytes: 23,
        uploaded_by: 'base-restart-qa',
      });
      reopenedDatabase.close();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  test('enforces company visibility, duplicate/cycle/missing/stale guards atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_contacts_atomic_hierarchy_migrations', ['schema', 'data']);
    const actions = yaml('api/contacts.yaml').actions;
    const create = actions.find((candidate: any) => candidate.id === 'create_contact');
    const edit = actions.find((candidate: any) => candidate.id === 'edit_contact');
    const duplicate = actions.find((candidate: any) => candidate.id === 'duplicate_contact');

    const scoped = await repository.executeMutation(create.mutation, {
      current_company_id: 'company-demo',
      values: { name: 'Scoped Hierarchy Contact', company_type: 'person', email: 'scoped-hierarchy@core3.local', parent_company_id: 'company-azure', is_company: false },
    });
    expect(scoped).toMatchObject({ company_id: 'company-demo', parent_company_id: 'company-azure', row_version: 1 });
    const beforeScoped = (await repository.query('SELECT name, email, company_id, parent_company_id, row_version FROM base_contacts WHERE id = ?', [scoped.id]))[0];

    await expect(repository.executeMutation(edit.mutation, {
      id: scoped.id, current_company_id: 'company-vietnam', expected_row_version: 1,
      values: { name: 'Should Not Cross Companies', company_type: 'person', email: 'cross-company@core3.local', parent_company_id: 'company-gemini', is_company: false },
    })).rejects.toMatchObject({ status: 403, code: 'BASE_CONTACT_COMPANY_FORBIDDEN' });
    expect((await repository.query('SELECT name, email, company_id, parent_company_id, row_version FROM base_contacts WHERE id = ?', [scoped.id]))[0]).toEqual(beforeScoped);

    await expect(repository.executeMutation(create.mutation, {
      current_company_id: 'company-demo',
      values: { name: 'Duplicate Scoped Contact', company_type: 'person', email: 'scoped-hierarchy@core3.local', parent_company_id: 'company-azure', is_company: false },
    })).rejects.toMatchObject({ status: 409, code: 'BASE_CONTACT_EMAIL_EXISTS' });
    await expect(repository.executeMutation(duplicate.mutation, {
      current_company_id: 'company-demo',
      values: { name: 'Duplicate Action Contact', company_type: 'person', email: 'scoped-hierarchy@core3.local', parent_company_id: 'company-azure', is_company: false },
    })).rejects.toMatchObject({ status: 409, code: 'BASE_CONTACT_EMAIL_EXISTS' });
    expect((await repository.query("SELECT COUNT(*) AS count FROM base_contacts WHERE email = 'scoped-hierarchy@core3.local'"))[0].count).toBe(1);

    for (const parentCompanyId of ['missing-company', 'company-archived', 'contact-berlin']) {
      await expect(repository.executeMutation(edit.mutation, {
        id: scoped.id, expected_row_version: 1,
        values: { name: 'Rejected Parent', company_type: 'person', email: 'scoped-hierarchy@core3.local', parent_company_id: parentCompanyId, is_company: false },
      })).rejects.toMatchObject({ status: 422, code: 'BASE_PARENT_COMPANY_INVALID' });
      expect((await repository.query('SELECT name, email, company_id, parent_company_id, row_version FROM base_contacts WHERE id = ?', [scoped.id]))[0]).toEqual(beforeScoped);
    }

    await repository.executeMutation(edit.mutation, {
      id: 'company-azure', expected_row_version: 1,
      values: { name: 'Azure Interior', company_type: 'company', email: 'azure@core3.local', parent_company_id: 'company-northwind', is_company: true },
    });
    expect((await repository.query('SELECT id, parent_company_id, row_version FROM base_contacts WHERE id = ?', ['company-azure']))[0]).toMatchObject({ id: 'company-azure', parent_company_id: 'company-northwind', row_version: 2 });
    const beforeCycle = (await repository.query('SELECT name, parent_company_id, row_version FROM base_contacts WHERE id = ?', ['company-northwind']))[0];
    await expect(repository.executeMutation(edit.mutation, {
      id: 'company-northwind', expected_row_version: beforeCycle.row_version,
      values: { name: 'Northwind Traders', company_type: 'company', email: 'hello@northwind.core3.local', parent_company_id: 'company-azure', is_company: true },
    })).rejects.toMatchObject({ status: 422, code: 'BASE_PARENT_COMPANY_CYCLE' });
    expect((await repository.query('SELECT name, parent_company_id, row_version FROM base_contacts WHERE id = ?', ['company-northwind']))[0]).toEqual(beforeCycle);

    await expect(repository.executeMutation(edit.mutation, {
      id: scoped.id, expected_row_version: 0,
      values: { name: 'Stale Scoped Contact', company_type: 'person', email: 'stale-scoped@core3.local', parent_company_id: 'company-azure', is_company: false },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    expect((await repository.query('SELECT name, email, company_id, parent_company_id, row_version FROM base_contacts WHERE id = ?', [scoped.id]))[0]).toEqual(beforeScoped);
    await expect(repository.executeMutation(edit.mutation, {
      id: 'missing-contact', expected_row_version: 1,
      values: { name: 'Missing Contact', company_type: 'person', email: 'missing@core3.local', parent_company_id: 'company-azure', is_company: false },
    })).rejects.toMatchObject({ status: 404, code: 'BASE_CONTACT_NOT_FOUND' });
    expect((await repository.query("SELECT COUNT(*) AS count FROM base_contacts WHERE email = 'missing@core3.local'"))[0].count).toBe(0);

    const contacts = source('contacts.yaml', 'contacts');
    const vietnamRows = (await repository.querySource(contacts, { q: null, active: null, company_type: null, country_name: null, fixture_state: null, current_company_id: 'company-vietnam' }, 0, 50)).data;
    expect(vietnamRows.map((row: any) => row.id)).toEqual(expect.arrayContaining(['company-gemini', 'contact-gemini-edwin', 'contact-gemini-jesse']));
    expect(vietnamRows.map((row: any) => row.id)).not.toContain('company-azure');
    const vietnamParents = (await repository.querySource(source('contacts.yaml', 'contact_parent_companies'), { current_company_id: 'company-vietnam' }, 0, 50)).data;
    expect(vietnamParents).toEqual(expect.arrayContaining([{ value: 'company-gemini', label: 'Gemini Furniture' }]));
    expect(vietnamParents).not.toEqual(expect.arrayContaining([{ value: 'company-azure', label: 'Azure Interior' }]));
    database.close();
  });

  test('keeps contact action role and HTTP authentication boundaries explicit', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_contacts_http_boundary_migrations', ['schema', 'data']);
    const apiDefinition = yaml('api/contacts.yaml');
    const page = { page: { id: 'contacts' }, actions: apiDefinition.actions };
    let actor: any = { sub: 'user-admin', name: 'Admin User', roles: ['admin'], permissions: ['base.contacts.read', 'base.contacts.write'], company_id: 'company-demo', view_scope: 'all' };
    const api = createYamlApi({
      repository,
      authProvider: {
        async getCurrentUser() {
          if (actor === null) throw { status: 401, code: 'UNAUTHORIZED', message: 'Unauthorized' };
          return actor;
        },
        hasPermission(user: any, permission: string) { return user.permissions.includes(permission); },
      },
      sources: new Map(),
      pageSources: new Map(),
      pages: new Map([['contacts', page]]),
      catalogs: new Map(),
      menus: new Map(),
      workflows: new Map(),
      workflowFiles: new Map(),
      permissions: { permissions: ['base.contacts.read', 'base.contacts.write', 'base.contacts.manage'] },
      uploadRoot: '/tmp/core3-base-contact-boundary-test',
      eventStore: { publish: async () => {} },
      topics: { request: async () => ({}) },
    });
    const request = async (body: any) => {
      try {
        return await api(new Request('http://localhost/api/actions/base.contacts.update', { method: 'POST', body: JSON.stringify(body) }), new URL('http://localhost/api/actions/base.contacts.update'));
      } catch (error: any) {
        return new Response(JSON.stringify(error), { status: error.status || 500 });
      }
    };
    actor = { sub: 'user-ordinary', name: 'Ordinary User', roles: ['ordinary'], permissions: ['base.contacts.read'], company_id: 'company-demo', view_scope: 'all' };
    expect((await request({ id: 'contact-demo', expected_row_version: 1, values: { name: 'Denied', email: 'denied@core3.local' } })).status).toBe(403);
    actor = null;
    expect((await request({ id: 'contact-demo', expected_row_version: 1, values: { name: 'Anonymous', email: 'anonymous@core3.local' } })).status).toBe(401);
    actor = { sub: 'user-vietnam', name: 'Vietnam User', roles: ['contacts_user'], permissions: ['base.contacts.read', 'base.contacts.write'], company_id: 'company-vietnam', view_scope: 'all' };
    const wrongCompany = await request({ id: 'contact-demo', expected_row_version: 1, values: { name: 'Wrong Company', email: 'wrong-company@core3.local' } });
    expect(wrongCompany.status).toBe(403);
    expect(await wrongCompany.json()).toMatchObject({ code: 'BASE_CONTACT_COMPANY_FORBIDDEN' });
    expect((await repository.query('SELECT name, row_version FROM base_contacts WHERE id = ?', ['contact-demo']))[0]).toMatchObject({ name: 'Demo Contact', row_version: 1 });
    database.close();
  });
});

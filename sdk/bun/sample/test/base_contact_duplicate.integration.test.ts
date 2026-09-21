import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/base');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Base Contacts duplicate workflow', () => {
  test('binds the authenticated Actions menu to the API-owned duplicate action', () => {
    const pages = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/contact-detail.yaml');
    const api = yaml('api/contact-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const uiAction = api.actions.find((action: any) => action.id === 'duplicate_contact_ui');
    const mutationAction = api.actions.find((action: any) => action.id === 'duplicate_contact');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page.id).toBe('contact-detail');
    expect(api.page).toEqual({ id: 'contact-detail' });
    expect(pages.pages.get('contact-detail')?.config.page.id).toBe('contact-detail');
    expect(discoverPageRoutes(pages)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/contacts/detail', page: 'contact-detail', module: 'base' }),
    ]));
    expect(form.action_menu).toMatchObject({ label: 'Actions', aria_label: 'Actions menu', icon: 'more-vertical' });
    expect(form.action_menu.actions).toContainEqual(expect.objectContaining({
      id: 'duplicate_contact_ui', label: 'Duplicate', icon: 'copy', permission: 'base.contacts.write',
    }));
    expect(uiAction).toMatchObject({ type: 'client', permission: 'base.contacts.write' });
    expect(uiAction.script).toContain('/api/actions/base.contacts.duplicate');
    expect(mutationAction).toMatchObject({
      type: 'server', permission: 'base.contacts.write', action: 'base.contacts.duplicate',
      handler: 'yaml_mutation', operation: 'duplicate',
    });
    expect(mutationAction.mutation.steps[0].query).toContain('INSERT INTO base_contacts');
    expect(mutationAction.mutation.steps[1].query).toContain('base_contact_categories_rel');
  });

  test('duplicates contact data and tags with Odoo copy naming and durable guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_contact_duplicate_migrations', ['schema', 'data']);
    const action = yaml('api/contact-detail.yaml').actions.find((candidate: any) => candidate.id === 'duplicate_contact');

    const duplicate = await repository.executeMutation(action.mutation, {
      source_id: 'contact-demo', expected_row_version: 1, current_company_id: 'company-demo',
    }) as any;
    expect(duplicate).toMatchObject({
      id: 'contact-copy-contact-demo-1',
      row_version: 1,
      name: 'Demo Contact (copy)',
      email: 'demo@core3.local',
      company_id: 'company-demo',
      parent_company_id: null,
      active: true,
    });
    expect(await repository.query(
      'SELECT category_id, category_name FROM base_contact_categories_rel WHERE contact_id = ? ORDER BY category_id',
      [duplicate.id],
    )).toEqual([{ category_id: 'category-partner', category_name: 'Partner' }]);
    expect(await repository.query('SELECT row_version FROM base_contacts WHERE id = ?', ['contact-demo']))
      .toEqual([{ row_version: 1 }]);

    await expect(repository.executeMutation(action.mutation, {
      source_id: 'missing-contact', expected_row_version: 1, current_company_id: 'company-demo',
    })).rejects.toMatchObject({ status: 404, code: 'BASE_CONTACT_DUPLICATE_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, {
      source_id: 'contact-archived', expected_row_version: 1, current_company_id: 'company-demo',
    })).rejects.toMatchObject({ status: 403, code: 'BASE_CONTACT_COMPANY_FORBIDDEN' });
    await expect(repository.executeMutation(action.mutation, {
      source_id: 'contact-gemini-edwin', expected_row_version: 1, current_company_id: 'company-demo',
    })).rejects.toMatchObject({ status: 403, code: 'BASE_CONTACT_COMPANY_FORBIDDEN' });
    await expect(repository.executeMutation(action.mutation, {
      source_id: 'contact-demo', expected_row_version: 0, current_company_id: 'company-demo',
    })).rejects.toMatchObject({ status: 409, code: 'BASE_CONTACT_DUPLICATE_STALE' });
    await expect(repository.executeMutation(action.mutation, {
      source_id: 'contact-demo', expected_row_version: 1, duplicate_id: duplicate.id, current_company_id: 'company-demo',
    })).rejects.toMatchObject({ status: 409, code: 'BASE_CONTACT_DUPLICATE_EXISTS' });
    database.close();
  });

  test('retains copies across restart and creates a second copy without mutating the source', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-base-contact-duplicate-'));
    const databasePath = join(directory, 'contacts.duckdb');
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      const migrations = 'base_contact_duplicate_restart_migrations';
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrations, ['schema', 'data']);
      const action = yaml('api/contact-detail.yaml').actions.find((candidate: any) => candidate.id === 'duplicate_contact');
      await repository.executeMutation(action.mutation, { source_id: 'contact-demo', expected_row_version: 1, current_company_id: 'company-demo' });
      database.close();

      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrations, ['schema', 'data']);
      const second = await repository.executeMutation(action.mutation, {
        source_id: 'contact-demo', expected_row_version: 1, current_company_id: 'company-demo',
      }) as any;
      expect(second).toMatchObject({ id: 'contact-copy-contact-demo-2', name: 'Demo Contact (copy)' });
      expect(await repository.query(
        "SELECT id, name, email FROM base_contacts WHERE id LIKE 'contact-copy-contact-demo-%' ORDER BY id",
      )).toEqual([
        { id: 'contact-copy-contact-demo-1', name: 'Demo Contact (copy)', email: 'demo@core3.local' },
        { id: 'contact-copy-contact-demo-2', name: 'Demo Contact (copy)', email: 'demo@core3.local' },
      ]);
      expect(await repository.query('SELECT row_version FROM base_contacts WHERE id = ?', ['contact-demo']))
        .toEqual([{ row_version: 1 }]);
    } finally {
      database?.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

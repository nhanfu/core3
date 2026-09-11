import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Recruitment Settings Odoo parity slice', () => {
  test('keeps the system settings layout and API joined by page.id', () => {
    const page = yaml('pages/settings.yaml');
    const api = yaml('api/settings.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const view = page.components.find((component: any) => component.type === 'SettingsView');
    const menu = manifest.menu.groups.find((group: any) => group.id === 'configuration').items.find((item: any) => item.label === 'Settings');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toHaveLength(1);
    expect(page.actions[0]).toMatchObject({ id: 'save_recruitment_settings', type: 'client', permission: 'recruitment.settings' });
    expect(page.page).toMatchObject({ id: 'recruitment-settings', route: '/recruitment/settings', auth: { require: ['recruitment.settings'] } });
    expect(api.page.id).toBe('recruitment-settings');
    expect(discovered.pages.get('recruitment-settings')?.config.page.id).toBe('recruitment-settings');
    expect(discovered.pageDatasources.get('recruitment-settings')).toEqual(['recruitment_settings']);
    expect(menu).toMatchObject({ path: '/recruitment/settings', label: 'Settings', permission: 'recruitment.settings' });
    expect(view).toMatchObject({ source: 'recruitment_settings', save_action: 'save_recruitment_settings' });
    expect(view.tabs.map((tab: any) => tab.label)).toEqual(['Recruitment']);
    expect(view.tabs[0].sections.map((section: any) => section.title)).toEqual(['Job Posting', 'Process', 'In-App Purchases']);
    expect(view.tabs[0].sections.flatMap((section: any) => section.fields.map((field: any) => field.label))).toEqual([
      'Online Posting', 'Send Interview Survey', 'Send SMS', 'Résumé Digitization (OCR)',
    ]);
    expect(view.tabs[0].sections[2].fields[1]).toMatchObject({ badge: 'Enterprise' });
    expect(view.tabs[0].sections[2].fields[1]).not.toHaveProperty('disabled');
    expect(yaml('permissions.yaml').permissions).toContain('recruitment.settings');
  });

  test('seeds fixed optional-module states and covers empty, permission, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_settings_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_settings_migrations', ['schema', 'data']);

    const source = yaml('api/settings.yaml').datasources[0];
    expect(await repository.querySource(source, { fixture_state: null }, 0, 1)).toMatchObject({
      data: {
        id: 'recruitment-settings', row_version: 1, company_name: 'My Company (San Francisco)',
        module_website_hr_recruitment: false, module_hr_recruitment_survey: false, module_hr_recruitment_extract: false,
      },
    });
    expect((await repository.querySource(source, { fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(source, { fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(source, { fixture_state: 'unauthorized' }, 0, 1)).rejects.toMatchObject({ status: 401, code: 'RECRUITMENT_SETTINGS_UNAUTHORIZED' });
    await expect(repository.querySource(source, { fixture_state: 'forbidden' }, 0, 1)).rejects.toMatchObject({ status: 403, code: 'RECRUITMENT_SETTINGS_FORBIDDEN' });
    await expect(repository.querySource(source, { fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'RECRUITMENT_SETTINGS_UNAVAILABLE' });
    database.close();
  });

  test('persists module choices and rejects invalid, stale, and missing updates', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_settings_mutation_migrations', ['schema', 'data']);
    const mutation = yaml('api/settings.yaml').actions.find((action: any) => action.id === 'recruitment_settings_update_server').mutation;
    const values = { module_website_hr_recruitment: true, module_hr_recruitment_survey: true, module_hr_recruitment_extract: false };

    const updated = await repository.executeMutation(mutation, { id: 'recruitment-settings', expected_row_version: 1, values });
    expect(updated).toMatchObject({ id: 'recruitment-settings', row_version: 2, ...values });
    await expect(repository.executeMutation(mutation, { id: 'recruitment-settings', expected_row_version: 1, values })).rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_SETTINGS_STALE' });
    await expect(repository.executeMutation(mutation, { id: 'missing-settings', expected_row_version: 1, values })).rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_SETTINGS_NOT_FOUND' });
    await expect(repository.executeMutation(mutation, { id: 'recruitment-settings', expected_row_version: 2, values: { ...values, module_hr_recruitment_survey: 'enabled' } })).rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_SETTINGS_VALUES_INVALID' });
    database.close();
  });

  test('keeps the fixture independent from moving time and generated ids', () => {
    const migration = readFileSync(join(root, 'migrations/20260911210000-008-recruitment-settings.yaml'), 'utf8');
    expect(migration).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
    expect(readFileSync(join(root, 'api/settings.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});

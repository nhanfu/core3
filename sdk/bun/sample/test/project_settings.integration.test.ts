import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Project Settings Odoo parity slice', () => {
  test('matches the source form and manager/system visibility contract', () => {
    const page = yaml('pages/settings.yaml');
    const api = yaml('api/settings.yaml');
    const manifest = yaml('manifest.yaml');
    const item = manifest.menu.groups.find((group: any) => group.id === 'configuration').items.find((entry: any) => entry.label === 'Settings');
    const view = page.components[0];
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'project-settings', route: '/project/settings', auth: { require: ['project.settings'] } });
    expect(api.page.id).toBe(page.page.id);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('project-settings')).toEqual(['project_settings']);
    expect(item).toEqual({ path: '/project/settings', label: 'Settings', icon: 'settings', permission: 'project.settings' });
    expect(view.tabs[0].sections.map((section: any) => section.title)).toEqual(['Tasks Management', 'Time Management']);
    expect(view.tabs[0].sections.flatMap((section: any) => section.fields.map((field: any) => field.label))).toEqual(['Project Stages', 'Task Logs']);
    expect(yaml('permissions.yaml').permissions).toContain('project.settings');
  });

  test('is idempotent, deterministic, and protects the settings mutation', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_settings_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_settings_schema_migrations', ['schema', 'data']);
    const api = yaml('api/settings.yaml');
    const source = api.datasources[0];
    expect(await repository.querySource(source, {}, 0, 1)).toMatchObject({ data: { id: 'project-settings-demo', row_version: 1, company_name: 'My Company', group_project_stages: true, module_hr_timesheet: false } });
    expect((await repository.querySource(source, { fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    const mutation = api.actions.find((action: any) => action.id === 'project_settings_update_server').mutation;
    expect(await repository.executeMutation(mutation, { id: 'project-settings-demo', expected_row_version: 1, values: { group_project_stages: false, module_hr_timesheet: true } })).toMatchObject({ row_version: 2, group_project_stages: false, module_hr_timesheet: true });
    await expect(repository.executeMutation(mutation, { id: 'project-settings-demo', expected_row_version: 1, values: { group_project_stages: true, module_hr_timesheet: false } })).rejects.toMatchObject({ status: 409, code: 'PROJECT_SETTINGS_STALE' });
    await expect(repository.executeMutation(mutation, { id: 'missing', expected_row_version: 1, values: { group_project_stages: true, module_hr_timesheet: false } })).rejects.toMatchObject({ status: 404, code: 'PROJECT_SETTINGS_NOT_FOUND' });
  });

  test('uses fixed dates and stable error contracts', () => {
    const migration = readFileSync(join(serviceRoot, 'migrations/20260912100000-011-project-settings.yaml'), 'utf8');
    const api = yaml('api/settings.yaml');
    expect(migration).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
    expect(api.datasources[0].error_states).toMatchObject({ transport_error: { status: 503, code: 'PROJECT_SETTINGS_UNAVAILABLE' } });
  });
});

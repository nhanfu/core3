import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/timesheets');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Timesheets settings parity slice', () => {
  test('keeps the Settings screen layout-only and page.id-bound', () => {
    const page = yaml('pages/settings.yaml');
    const api = yaml('api/settings.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page.id).toBe('timesheets-settings');
    expect(api.page.id).toBe('timesheets-settings');
    expect(discovered.pages.get('timesheets-settings')?.config.page.id).toBe('timesheets-settings');
    expect(discovered.pageDatasources.get('timesheets-settings')).toContain('timesheets_settings');
    expect(yaml('manifest.yaml').menu.groups.flatMap((group: any) => group.items?.map((item: any) => item.label) || [])).toContain('Configuration');
    expect(yaml('permissions.yaml').permissions).toContain('timesheets.settings');
  });

  test('seeds fixed settings, persists valid values, and rejects invalid or stale updates', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_settings_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'timesheets_settings_schema_migrations', ['schema', 'data']);

    const source = yaml('api/settings.yaml').datasources[0];
    const initial = await repository.querySource(source, {}, 0, 1);
    expect(initial.data).toEqual(expect.objectContaining({
      id: 'timesheets-settings-demo',
      company_name: 'My Company',
      project_time_unit: 'hours',
      timesheet_encode_method: 'hours',
      time_off_available: false,
    }));

    const mutation = yaml('api/settings.yaml').actions.find((action: any) => action.id === 'timesheets_settings_update_server').mutation;
    const values = { project_time_unit: 'days', timesheet_encode_method: 'days', reminder_user_allow: true, reminder_allow: true, time_off_integration: false };
    const updated = await repository.executeMutation(mutation, { id: 'timesheets-settings-demo', expected_row_version: 1, values });
    expect(updated).toMatchObject({ project_time_unit: 'days', timesheet_encode_method: 'days', reminder_user_allow: true, row_version: 2 });

    await expect(repository.executeMutation(mutation, {
      id: 'timesheets-settings-demo', expected_row_version: 2, values: { ...values, time_off_integration: true },
    })).rejects.toMatchObject({ status: 422, code: 'TIMESHEETS_SETTINGS_INVALID' });
    await expect(repository.executeMutation(mutation, {
      id: 'timesheets-settings-demo', expected_row_version: 1, values: { ...values, reminder_allow: false },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
  });

  test('does not use moving-clock or generated fixture values', () => {
    const migration = readFileSync(join(serviceRoot, 'migrations/20260910110000-003-timesheets-settings.yaml'), 'utf8');
    expect(migration).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});

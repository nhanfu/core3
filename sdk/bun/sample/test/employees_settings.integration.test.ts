import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Employees Settings Odoo parity slice', () => {
  test('keeps the Settings form layout-only and joins its API by page.id', () => {
    const page = yaml('pages/settings.yaml');
    const api = yaml('api/settings.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const menu = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items.find((item: any) => item.label === 'Settings');
    const view = page.components.find((component: any) => component.type === 'SettingsView');

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'employee-settings', route: '/employees/settings', auth: { require: ['employees.settings'] } });
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pages.get('employee-settings')?.config.page.id).toBe('employee-settings');
    expect(discovered.pageDatasources.get('employee-settings')).toEqual(['employee_settings']);
    expect(menu).toMatchObject({ path: '/employees/settings', label: 'Settings', permission: 'employees.settings' });
    expect(view).toMatchObject({ source: 'employee_settings', save_action: 'employee_settings_update_server' });
    expect(view.tabs.map((tab: any) => tab.label)).toEqual(['Employees']);
    expect(view.tabs[0].sections.map((section: any) => section.title)).toEqual(['Employees', 'Work Organization', 'Contract']);
    expect(view.tabs[0].sections.flatMap((section: any) => section.fields.map((field: any) => field.label))).toEqual([
      'Presence Display', 'Based on user status in system', 'Advanced Presence Control', 'Presence by Sent Emails', 'Presence by IP Address', 'Sent Emails', 'IP Addresses', 'Skills Management',
      'Company Working Hours', 'Contract Expiration Notice Period', 'Work Permit Expiration Notice Period',
    ]);
    expect(yaml('permissions.yaml').permissions).toContain('employees.settings');
  });

  test('seeds deterministic settings, exposes empty and transport states, and guards updates', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'employees_settings_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'employees_settings_schema_migrations', ['schema', 'data']);
    const api = yaml('api/settings.yaml');
    const source = api.datasources[0];
    const populated = await repository.querySource(source, { fixture_state: null }, 0, 1);
    expect(populated.data).toMatchObject({ id: 'employee-settings-demo', row_version: 1, company_name: 'My Company (San Francisco)', module_hr_attendance: true, resource_calendar_name: 'Standard 40 hours/week' });
    expect((await repository.querySource(source, { fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(source, { fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'EMPLOYEES_SETTINGS_UNAVAILABLE' });

    const mutation = api.actions[0].mutation;
    const values = { module_hr_attendance: false, hr_presence_control_login: true, module_hr_presence: true, hr_presence_control_email: true, hr_presence_control_ip: false, hr_presence_control_email_amount: 8, hr_presence_control_ip_list: '192.168.1.0/24', module_hr_skills: true, resource_calendar_name: 'Flexible Hours', contract_expiration_notice_period: 45, work_permit_expiration_notice_period: 90 };
    const updated = await repository.executeMutation(mutation, { id: 'employee-settings-demo', expected_row_version: 1, values });
    expect(updated).toMatchObject({ ...values, row_version: 2 });
    await expect(repository.executeMutation(mutation, { id: 'employee-settings-demo', expected_row_version: 1, values })).rejects.toMatchObject({ status: 409, code: 'EMPLOYEES_SETTINGS_STALE' });
    await expect(repository.executeMutation(mutation, { id: 'missing-settings', expected_row_version: 1, values })).rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_SETTINGS_NOT_FOUND' });
    await expect(repository.executeMutation(mutation, { id: 'employee-settings-demo', expected_row_version: 2, values: { ...values, resource_calendar_name: 'Unknown' } })).rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_SETTINGS_VALUES_INVALID' });
  });

  test('keeps settings fixtures fixed and page YAML free of SQL', () => {
    expect(readFileSync(join(serviceRoot, 'pages/settings.yaml'), 'utf8')).not.toMatch(/\bSELECT\b|\bUPDATE\b|\bINSERT\b/);
    const migration = readFileSync(join(serviceRoot, 'migrations/20260911203000-014-settings.yaml'), 'utf8');
    expect(migration).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});

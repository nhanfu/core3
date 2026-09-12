import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/email-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = () => yaml('api/settings.yaml').actions.find((candidate: any) => candidate.id === 'save_email_marketing_settings');

describe('Email Marketing Settings parity action', () => {
  test('matches the system-only Odoo menu/form and joins page/API by page.id', () => {
    const page = yaml('pages/settings.yaml');
    const api = yaml('api/settings.yaml');
    expect(page.page).toMatchObject({ id: 'email-settings', route: '/email-settings', auth: { require: ['email_marketing.settings'] } });
    expect(page.components[0].tabs[0].sections[0].fields.map((field: any) => field.label)).toEqual(['Mailing Campaigns', 'Contact Naming', 'Allow recipients to blacklist themselves', 'Mailing Reports', 'Dedicated Server', 'Default Server', 'Configure Outgoing Mail Servers']);
    expect(api.page.id).toBe(page.page.id);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('email-settings')).toContain('email_marketing_settings');
    expect(yaml('manifest.yaml').menu['email-marketing'].groups.find((group: any) => group.id === 'configuration').items[0]).toMatchObject({ path: '/email-settings', label: 'Settings', permission: 'email_marketing.settings' });
  });

  test('seeds idempotently and saves with validation and optimistic concurrency', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'email_marketing_settings_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'email_marketing_settings_test', ['schema', 'data']);
    const source = yaml('api/settings.yaml').datasources[0];
    const read = await repository.querySource(source, { fixture_state: null }, 0, 1);
    expect(read.data).toEqual({ id: 'email-marketing-settings', row_version: 1, group_mass_mailing_campaign: true, mass_mailing_split_contact_name: false, show_blacklist_buttons: true, mass_mailing_reports: true, mass_mailing_outgoing_mail_server: false, mass_mailing_mail_server_name: 'Default Server' });
    expect((await repository.querySource(source, { fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    const save = action();
    const updated = await repository.executeMutation(save.mutation, { id: 'email-marketing-settings', expected_row_version: 1, values: { group_mass_mailing_campaign: false, mass_mailing_split_contact_name: true, show_blacklist_buttons: false, mass_mailing_reports: false, mass_mailing_outgoing_mail_server: true, mass_mailing_mail_server_name: 'Marketing SMTP' } });
    expect(updated).toMatchObject({ row_version: 2, mass_mailing_split_contact_name: true, mass_mailing_mail_server_name: 'Marketing SMTP' });
    await expect(repository.executeMutation(save.mutation, { id: 'email-marketing-settings', expected_row_version: 1, values: { group_mass_mailing_campaign: true } })).rejects.toMatchObject({ status: 409, code: 'EMAIL_MARKETING_SETTINGS_STALE' });
    await expect(repository.executeMutation(save.mutation, { id: 'email-marketing-settings-missing', expected_row_version: 1, values: { group_mass_mailing_campaign: true } })).rejects.toMatchObject({ status: 404, code: 'EMAIL_MARKETING_SETTINGS_NOT_FOUND' });
    await expect(repository.executeMutation(save.mutation, { id: 'email-marketing-settings', expected_row_version: 2, values: { group_mass_mailing_campaign: 'invalid' } })).rejects.toMatchObject({ status: 422, code: 'EMAIL_MARKETING_SETTINGS_INVALID' });
  });

  test('keeps the system permission and stable failure contract', () => {
    const api = yaml('api/settings.yaml');
    expect(api.datasources[0]).toMatchObject({ single: true, permission: 'email_marketing.settings', error_states: { transport_error: { status: 503 }, forbidden: { status: 403 } } });
    expect(action()).toMatchObject({ type: 'server_form', permission: 'email_marketing.settings', operation: 'update', handler: 'yaml_mutation' });
    expect(yaml('permissions.yaml').permissions).toContain('email_marketing.settings');
    expect(readFileSync(join(root, 'migrations/20260912130000-017-email-settings.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random_uuid|gen_random_uuid/i);
  });
});

import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((entry: any) => entry.id === id);

async function openRepository(databaseName: string) {
  const database = await DuckDbDatabase.open(databaseName);
  const repository = new YamlRepository(database);
  const migrationName = `fleet_vehicle_mail_${crypto.randomUUID().replaceAll('-', '_')}`;
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository };
}

describe('Fleet Mail to Driver parity', () => {
  test('maps the Odoo bound server action and keeps the list page/API contract joined', () => {
    const page = yaml('pages/vehicles.yaml');
    const api = yaml('api/vehicles.yaml');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/models/fleet_vehicle.py', 'utf8');
    const sourceWizard = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/wizard/fleet_vehicle_send_mail.py', 'utf8');

    expect(sourceView).toContain('id="action_fleet_vehicle_send_mail"');
    expect(sourceView).toContain('<field name="name">Mail to Driver</field>');
    expect(sourceView).toContain('<field name="binding_view_types">list,kanban</field>');
    expect(sourceModel).toContain("'res_model': 'fleet.vehicle.send.mail'");
    expect(sourceWizard).toContain('def action_send(self):');
    expect(sourceWizard).toContain('without_emails');
    expect(page.page.id).toBe('vehicles');
    expect(page.components[0]).toMatchObject({ selectable: true, bulk_actions: [{ id: 'mail_fleet_vehicle_drivers', label: 'Mail to Driver', permission: 'fleet.manage' }] });
    expect(api.page.id).toBe(page.page.id);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('vehicles')).toContain('fleet_vehicles');
    expect(action(api, 'mail_fleet_vehicle_drivers')).toMatchObject({ type: 'server_form', modal_style: 'mail_composer', permission: 'fleet.manage', operation: 'bulk_create', handler: 'yaml_mutation' });
    expect(action(api, 'save_fleet_vehicle_mail_template')).toMatchObject({ type: 'server_form', permission: 'fleet.manage', operation: 'create' });
    expect(api.datasources.find((entry: any) => entry.id === 'fleet_vehicles').query).toContain('driver_email');
  });

  test('sends to selected drivers, saves a durable record, and survives file-backed restart', async () => {
    const databasePath = `/tmp/core3-fleet-vehicle-mail-${crypto.randomUUID()}.duckdb`;
    const first = await openRepository(databasePath);
    const api = yaml('api/vehicles.yaml');
    const send = action(api, 'mail_fleet_vehicle_drivers');
    const result = await first.repository.executeMutation(send.mutation, {
      selectedIds: ['fleet-demo-001'],
      current_company_name: 'Core3 Demo Company',
      current_user_name: 'Fleet QA',
      subject: 'Vehicle inspection reminder',
      body_html: '<p>Please inspect the vehicle this week.</p>',
      template_id: null,
    }) as any;

    expect(result).toMatchObject({ vehicle_id: 'fleet-demo-001', recipient_email: 'admin.user@example.test', subject: 'Vehicle inspection reminder', sent_by: 'Fleet QA', state: 'Sent', row_version: 1 });
    expect(await first.repository.query('SELECT vehicle_id, recipient_email, state FROM fleet_vehicle_mail_messages')).toEqual([
      { vehicle_id: 'fleet-demo-001', recipient_email: 'admin.user@example.test', state: 'Sent' },
    ]);
    first.database.close();

    const second = await openRepository(databasePath);
    expect(await second.repository.query('SELECT subject, sent_by, state FROM fleet_vehicle_mail_messages WHERE vehicle_id = ?', ['fleet-demo-001'])).toEqual([
      { subject: 'Vehicle inspection reminder', sent_by: 'Fleet QA', state: 'Sent' },
    ]);
    second.database.close();
    rmSync(databasePath, { force: true });
  });

  test('enforces selection, actor, company, driver email, template/content, and atomic failure guards', async () => {
    const { database, repository } = await openRepository(':memory:');
    const api = yaml('api/vehicles.yaml');
    const send = action(api, 'mail_fleet_vehicle_drivers');
    const base = {
      selectedIds: ['fleet-demo-001'], current_company_name: 'Core3 Demo Company', current_user_name: 'Fleet QA',
      subject: 'Reminder', body_html: '<p>Message</p>', template_id: null,
    };
    await expect(repository.executeMutation(send.mutation, { ...base, selectedIds: [] })).rejects.toMatchObject({ status: 400, code: 'FLEET_MAIL_SELECTION_REQUIRED' });
    await expect(repository.executeMutation(send.mutation, { ...base, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'FLEET_MAIL_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(send.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'FLEET_MAIL_COMPANY_FORBIDDEN' });
    await expect(repository.executeMutation(send.mutation, { ...base, selectedIds: ['missing-vehicle'] })).rejects.toMatchObject({ status: 404, code: 'FLEET_MAIL_VEHICLE_NOT_FOUND' });
    await expect(repository.executeMutation(send.mutation, { ...base, selectedIds: ['fleet-demo-002'] })).rejects.toMatchObject({ status: 422, code: 'FLEET_MAIL_DRIVER_EMAIL_REQUIRED' });
    await expect(repository.executeMutation(send.mutation, { ...base, subject: '', body_html: '' })).rejects.toMatchObject({ status: 422, code: 'FLEET_MAIL_CONTENT_INVALID' });
    await expect(repository.executeMutation(send.mutation, { ...base, template_id: 'missing-template' })).rejects.toMatchObject({ status: 422, code: 'FLEET_MAIL_TEMPLATE_INVALID' });
    expect(await repository.query('SELECT COUNT(*) AS count FROM fleet_vehicle_mail_messages')).toEqual([{ count: 0 }]);

    const saveTemplate = action(api, 'save_fleet_vehicle_mail_template');
    const template = await repository.executeMutation(saveTemplate.mutation, { current_user_name: 'Fleet QA', name: 'Inspection Reminder', subject: 'Inspection', body_html: '<p>Check it.</p>' }) as any;
    expect(template).toMatchObject({ id: 'fleet-vehicle-mail-template-2', name: 'Inspection Reminder', created_by: 'Fleet QA', active: true, row_version: 1 });
    await expect(repository.executeMutation(saveTemplate.mutation, { current_user_name: 'Fleet QA', name: 'inspection reminder', subject: 'Other', body_html: '' })).rejects.toMatchObject({ status: 409, code: 'FLEET_MAIL_TEMPLATE_EXISTS' });
    expect(await repository.query('SELECT COUNT(*) AS count FROM fleet_vehicle_mail_templates')).toEqual([{ count: 2 }]);
    database.close();
  });
});

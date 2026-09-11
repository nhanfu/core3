import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

describe('Fleet Activity Types configuration parity', () => {
  test('maps live action 766 and keeps Fleet page/API/detail joins explicit', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/mail_activity_views.xml', 'utf8');
    const views = readFileSync('/home/nhanjs/projects/odoo/addons/mail/views/mail_activity_views.xml', 'utf8');
    const mailAccess = readFileSync('/home/nhanjs/projects/odoo/addons/mail/security/ir.model.access.csv', 'utf8');
    const fleetAccess = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/security/ir.model.access.csv', 'utf8');
    expect(source).toContain('id="mail_activity_type_action_config_fleet"');
    expect(source).toContain('<field name="name">Activity Types</field>');
    expect(source).toContain('<field name="res_model">mail.activity.type</field>');
    expect(source).toContain("('res_model', '=', 'fleet.vehicle.log.contract')");
    expect(source).toContain("'default_res_model': 'fleet.vehicle.log.contract'");
    expect(views).toContain('<list string="Activities" sample="1">');
    expect(views).toContain('<form string="Activities">');
    expect(views).toContain('<field name="delay_label" string="Planned in"');
    expect(mailAccess).toContain('model_mail_activity_type,base.group_user,1,0,0,0');
    expect(fleetAccess).toContain('mail.model_mail_activity_type,fleet.fleet_group_manager,1,1,1,1');

    const page = yaml('pages/activity-types.yaml');
    const detail = yaml('pages/activity-type-detail.yaml');
    const api = yaml('api/activity-types.yaml');
    const detailApi = yaml('api/activity-type-detail.yaml');
    const configuration = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration');
    expect(configuration.items).toContainEqual({ path: '/fleet/config/activity-types', label: 'Activity Types', icon: 'activity', permission: 'fleet.manage' });
    expect(page.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'fleet-activity-types', route: '/fleet/config/activity-types', auth: { require: ['fleet.read'] } });
    expect(detail.page).toMatchObject({ id: 'fleet-activity-type-detail', route: '/fleet/config/activity-types/detail' });
    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detail.page.id);
    expect(page.components[0]).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'fleet_activity_types', row_open_action: 'view_fleet_activity_type', form_view: { side_panel: false } });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'card', 'form']);
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual([' ', 'Name', 'Default Summary', 'Planned in', 'Type', ' ']);
    expect(detail.components[0]).toMatchObject({ type: 'OdooFormView', source: 'fleet_activity_type_detail', editable: true });
    expect(detail.components[0].groups.map((group: any) => group.title)).toEqual(['Activity Settings', 'Next Activity']);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('fleet-activity-types')).toEqual(['fleet_activity_types']);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('fleet-activity-type-detail')).toEqual(['fleet_activity_type_detail']);
    expect(discoverPageRoutes(discoverPages(join(import.meta.dir, '..')))).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/fleet/config/activity-types', page: 'fleet-activity-types', module: 'fleet' }),
      expect.objectContaining({ path: '/fleet/config/activity-types/detail', page: 'fleet-activity-type-detail', module: 'fleet' }),
    ]));
    expect(api.datasources[0].permission).toBe('fleet.read');
    expect(detailApi.datasources[0].permission).toBe('fleet.read');
    expect([
      action(api, 'create_fleet_activity_type'), action(api, 'archive_fleet_activity_type'), action(api, 'restore_fleet_activity_type'),
      action(api, 'delete_fleet_activity_type'), action(detailApi, 'edit_fleet_activity_type_detail'),
      action(detailApi, 'archive_fleet_activity_type_detail'), action(detailApi, 'restore_fleet_activity_type_detail'), action(detailApi, 'delete_fleet_activity_type_detail'),
    ].every((entry: any) => entry.permission === 'fleet.manage')).toBe(true);
  });

  test('seeds the six live Fleet rows idempotently and supports filters and error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'fleet_activity_type_state_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'fleet_activity_type_state_migrations', ['schema', 'data']);
    const source = yaml('api/activity-types.yaml').datasources[0];
    const all = await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50);
    expect(all.data.map((row: any) => [row.name, row.summary, row.planned_in, row.res_model])).toEqual([
      ['To-Do', 'To-Do', '5 days', null], ['Email', 'Email', '0 days', null], ['Call', 'Call', '2 days', null],
      ['Meeting', 'Meeting', '0 days', null], ['Contract to Renew', 'Contract to Renew', '0 days', 'fleet.vehicle.log.contract'], ['Document', 'Document', '5 days', null],
    ]);
    expect(all.data.every((row: any) => row.row_version === 1 && row.active === true)).toBe(true);
    expect((await repository.querySource(source, { q: 'contract', active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Contract to Renew']);
    expect((await repository.querySource(source, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: null, fixture_state: 'unauthorized' }, 0, 50)).rejects.toMatchObject({ status: 401, code: 'FLEET_ACTIVITY_TYPES_UNAUTHORIZED' });
    await expect(repository.querySource(source, { q: null, active: null, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'FLEET_ACTIVITY_TYPES_FORBIDDEN' });
    await expect(repository.querySource(source, { q: null, active: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'FLEET_ACTIVITY_TYPES_UNAVAILABLE' });
    database.close();
  });

  test('supports manager CRUD, Odoo protected rows, validation, and stale-write guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_activity_type_mutation_migrations', ['schema', 'data']);
    const api = yaml('api/activity-types.yaml');
    const detailApi = yaml('api/activity-type-detail.yaml');
    const create = action(api, 'create_fleet_activity_type');
    const update = action(detailApi, 'edit_fleet_activity_type_detail');
    const archive = action(api, 'archive_fleet_activity_type');
    const remove = action(api, 'delete_fleet_activity_type');
    expect(create.permission).toBe('fleet.manage');
    expect(update.mutation.concurrency.required).toBe(true);
    expect(archive.mutation.concurrency.required).toBe(true);
    expect(remove.mutation.concurrency.required).toBe(true);
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Contract Review', summary: 'Review the renewal', res_model: 'fleet.vehicle.log.contract', delay_count: 3 } });
    expect(created).toMatchObject({ id: 'fleet-activity-type-custom-contract-review', row_version: 1, name: 'Contract Review', res_model: 'fleet.vehicle.log.contract', delay_count: 3 });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' ' } })).rejects.toMatchObject({ status: 422, code: 'FLEET_ACTIVITY_TYPE_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Other Model', res_model: 'fleet.vehicle' } })).rejects.toMatchObject({ status: 422, code: 'FLEET_ACTIVITY_TYPE_MODEL_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Negative Delay', delay_count: -1 } })).rejects.toMatchObject({ status: 422, code: 'FLEET_ACTIVITY_TYPE_DELAY_INVALID' });
    const edited = await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Contract Review Updated', res_model: null, delay_count: 4 } });
    expect(edited).toMatchObject({ row_version: 2, name: 'Contract Review Updated', res_model: null, delay_count: 4 });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale activity' } })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(archive.mutation, { id: 'fleet-activity-type-todo', expected_row_version: 1, values: { active: false } })).rejects.toMatchObject({ status: 422, code: 'FLEET_ACTIVITY_TYPE_PROTECTED' });
    await expect(repository.executeMutation(remove.mutation, { id: 'fleet-activity-type-call', expected_row_version: 1 })).rejects.toMatchObject({ status: 422, code: 'FLEET_ACTIVITY_TYPE_PROTECTED' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'FLEET_ACTIVITY_TYPE_NOT_FOUND' });
    database.close();
  });

  test('keeps Activity Types fixtures fixed and independent from current time or generated UUIDs', () => {
    const schema = readFileSync(join(root, 'migrations/20260911260000-025-fleet-activity-types-schema.yaml'), 'utf8');
    const data = readFileSync(join(root, 'migrations/20260911261000-026-fleet-activity-types-data.yaml'), 'utf8');
    expect(schema).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(data).toContain("'fleet-activity-type-todo'");
    expect(`${schema}\n${data}\n${readFileSync(join(root, 'api/activity-types.yaml'), 'utf8')}`).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});

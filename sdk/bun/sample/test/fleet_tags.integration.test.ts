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

describe('Fleet Vehicle Tags configuration parity', () => {
  test('maps the live Odoo fleet_vehicle_tag_action and keeps page/API joins explicit', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml', 'utf8');
    const access = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/security/ir.model.access.csv', 'utf8');
    expect(source).toContain('id="fleet_vehicle_tag_action"');
    expect(source).toContain('<field name="name">Tags</field>');
    expect(source).toContain('<field name="res_model">fleet.vehicle.tag</field>');
    expect(source).toContain('<list string="Vehicle Tags" editable="bottom">');
    expect(source).toContain('<field name="color" widget="color_picker"/>');
    expect(source).toContain('id="fleet_vehicle_tag_menu"');
    expect(source).toContain('groups="base.group_no_one"');
    expect(access).toContain('model_fleet_vehicle_tag,fleet_group_user,1,0,0,0');
    expect(access).toContain('model_fleet_vehicle_tag,fleet_group_manager,1,1,1,1');

    const page = yaml('pages/tags.yaml');
    const detail = yaml('pages/fleet-tag-detail.yaml');
    const api = yaml('api/tags.yaml');
    const detailApi = yaml('api/tag-detail.yaml');
    const configuration = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration');
    expect(configuration.items).toContainEqual({ path: '/fleet/config/tags', label: 'Tags', icon: 'tag', permission: 'fleet.manage' });
    expect(page.datasources).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'fleet-tags', route: '/fleet/config/tags', auth: { require: ['fleet.read'] } });
    expect(detail.page).toMatchObject({ id: 'fleet-tag-detail', route: '/fleet/config/tags/detail' });
    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detail.page.id);
    expect(page.components[0]).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'fleet_vehicle_tags', row_open_action: 'edit_fleet_vehicle_tag', form_view: { side_panel: false } });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form']);
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual(['Tag Name', 'Color']);
    expect(page.components[0].columns.find((column: any) => column.field === 'color')).toMatchObject({ type: 'ColorCell' });
    expect(page.components[0].inline_edit.fields.find((field: any) => field.field === 'color')).toMatchObject({ type: 'color', palette: 'odoo' });
    expect(page.components[0].inline_edit.fields.map((field: any) => field.field)).toEqual(['name', 'color']);
    expect(detail.components[0]).toMatchObject({ type: 'OdooFormView', source: 'fleet_vehicle_tag_detail', editable: true });
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('fleet-tags')).toEqual(['fleet_vehicle_tags']);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('fleet-tag-detail')).toEqual(['fleet_vehicle_tag_detail']);
    expect(discoverPageRoutes(discoverPages(join(import.meta.dir, '..')))).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/fleet/config/tags', page: 'fleet-tags', module: 'fleet' }),
      expect.objectContaining({ path: '/fleet/config/tags/detail', page: 'fleet-tag-detail', module: 'fleet' }),
    ]));
    expect(api.datasources[0].permission).toBe('fleet.read');
    expect(detailApi.datasources[0].permission).toBe('fleet.read');
    expect([action(api, 'create_fleet_vehicle_tag_inline'), action(api, 'update_fleet_vehicle_tag_inline'), action(api, 'delete_fleet_vehicle_tag'), action(detailApi, 'edit_fleet_vehicle_tag_detail'), action(detailApi, 'delete_fleet_vehicle_tag_detail')].every((entry: any) => entry.permission === 'fleet.manage')).toBe(true);
  });

  test('seeds the four Odoo tags idempotently and supports search, empty, not-found, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'fleet_tag_state_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'fleet_tag_state_migrations', ['schema', 'data']);
    const source = yaml('api/tags.yaml').datasources[0];
    const all = await repository.querySource(source, { q: null, fixture_state: null }, 0, 50);
    expect(all.data.map((row: any) => row.name)).toEqual(['Junior', 'Senior', 'Employee Car', 'Purchased']);
    expect(all.data.map((row: any) => row.color)).toEqual([1, 2, 3, 4]);
    expect(all.data.every((row: any) => row.row_version === 1)).toBe(true);
    expect((await repository.querySource(source, { q: 'employee', fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Employee Car']);
    expect((await repository.querySource(source, { q: 'missing', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, fixture_state: 'unauthorized' }, 0, 50)).rejects.toMatchObject({ status: 401, code: 'FLEET_TAGS_UNAUTHORIZED' });
    await expect(repository.querySource(source, { q: null, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'FLEET_TAGS_FORBIDDEN' });
    await expect(repository.querySource(source, { q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'FLEET_TAGS_UNAVAILABLE' });
    database.close();
  });

  test('supports manager create/update/delete with name and color validation plus stale-write guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'fleet_tag_mutation_migrations', ['schema', 'data']);
    const api = yaml('api/tags.yaml');
    const create = action(api, 'create_fleet_vehicle_tag_inline');
    const update = action(api, 'update_fleet_vehicle_tag_inline');
    const remove = action(api, 'delete_fleet_vehicle_tag');
    const detailUpdate = action(yaml('api/tag-detail.yaml'), 'edit_fleet_vehicle_tag_detail');
    expect(create.permission).toBe('fleet.manage');
    expect(update.mutation.concurrency.required).toBe(true);
    expect(remove.mutation.concurrency.required).toBe(true);
    expect(detailUpdate.mutation.fields).toEqual(['name']);
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Core3 Pool', color: 7 } });
    expect(created).toMatchObject({ id: 'fleet-tag-custom-core3-pool', row_version: 1, name: 'Core3 Pool', color: 7 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'junior', color: 8 } })).rejects.toMatchObject({ status: 409, code: 'FLEET_TAG_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' ', color: 1 } })).rejects.toMatchObject({ status: 422, code: 'FLEET_TAG_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Bad color', color: 12 } })).rejects.toMatchObject({ status: 422, code: 'FLEET_TAG_COLOR_INVALID' });
    const edited = await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Core3 Pool Updated', color: 8 } });
    expect(edited).toMatchObject({ row_version: 2, name: 'Core3 Pool Updated', color: 8 });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale tag', color: 9 } })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(update.mutation, { id: 'missing-tag', expected_row_version: 1, values: { name: 'Missing', color: 1 } })).rejects.toMatchObject({ status: 404, code: 'FLEET_TAG_NOT_FOUND' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'FLEET_TAG_NOT_FOUND' });
    database.close();
  });

  test('keeps tag fixtures fixed and independent from current time or generated UUIDs', () => {
    const schema = readFileSync(join(root, 'migrations/20260911242000-023-fleet-tags-schema.yaml'), 'utf8');
    const data = readFileSync(join(root, 'migrations/20260911243000-024-fleet-tags-data.yaml'), 'utf8');
    expect(schema).toContain("TIMESTAMP '2026-01-15 00:00:00'");
    expect(data).toContain("'fleet-tag-001'");
    expect(`${schema}\n${data}\n${readFileSync(join(root, 'api/tags.yaml'), 'utf8')}`).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
  });
});

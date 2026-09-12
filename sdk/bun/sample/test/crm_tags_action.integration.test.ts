import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

describe('CRM Tags Odoo action parity', () => {
  test('maps the source action and keeps page/API/detail joins explicit', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/sales_team/views/crm_tag_views.xml', 'utf8');
    expect(source).toContain('id="sales_team_crm_tag_action"');
    expect(source).toContain('<field name="name">Tags</field>');
    expect(source).toContain('<field name="res_model">crm.tag</field>');
    expect(source).toContain('<list string="Tags" editable="bottom"');
    expect(source).toContain('widget="color_picker"');
    const page = yaml('pages/tags.yaml');
    const detail = yaml('pages/crm-tag-detail.yaml');
    const api = yaml('api/tags.yaml');
    const detailApi = yaml('api/tag-detail.yaml');
    const pipeline = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items.find((item: any) => item.label === 'Configuration').children.find((item: any) => item.label === 'Pipeline');
    expect(pipeline.children).toContainEqual({ path: '/crm/tags', label: 'Tags', icon: 'tag', permission: 'crm.manage' });
    expect(page.page).toMatchObject({ id: 'crm-tags', route: '/crm/tags' });
    expect(detail.page).toMatchObject({ id: 'crm-tag-detail', route: '/crm/tags/detail' });
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detail.page.id);
    expect(page.components[0]).toMatchObject({ source: 'crm_tag_configuration', create_action: 'create_crm_tag_inline', row_open_action: 'edit_crm_tag' });
    expect(page.components[0].columns.map((column: any) => column.label)).toEqual(['Tag Name', 'Color', '']);
    expect(page.components[0].columns[1]).toMatchObject({ type: 'ColorCell', palette: 'odoo' });
    expect(detail.components[0]).toMatchObject({ type: 'OdooFormView', source: 'crm_tag_detail', editable: true });
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('crm-tags')).toEqual(['crm_tag_configuration']);
    expect(discoverPageRoutes(discoverPages(join(import.meta.dir, '..')))).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/crm/tags', page: 'crm-tags', module: 'crm' }),
      expect.objectContaining({ path: '/crm/tags/detail', page: 'crm-tag-detail', module: 'crm' }),
    ]));
  });

  test('seeds the eight Odoo demo tags idempotently and exposes state/error reads', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_tags_state', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_tags_state', ['schema', 'data']);
    const source = yaml('api/tags.yaml').datasources[0];
    const rows = (await repository.querySource(source, { q: null, fixture_state: null }, 0, 50)).data;
    expect(rows.map((row: any) => row.name)).toEqual(['Consulting', 'Design', 'Information', 'Other', 'Product', 'Services', 'Software', 'Training']);
    expect(rows.every((row: any) => row.row_version === 1)).toBe(true);
    expect((await repository.querySource(source, { q: 'service', fixture_state: null }, 0, 50)).data).toMatchObject([{ id: 'crm-tag-services', color: 3 }]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: 'missing', fixture_state: null }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, fixture_state: 'unauthorized' }, 0, 50)).rejects.toMatchObject({ status: 401, code: 'CRM_TAGS_UNAUTHORIZED' });
    await expect(repository.querySource(source, { q: null, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'CRM_TAGS_FORBIDDEN' });
    await expect(repository.querySource(source, { q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'CRM_TAGS_UNAVAILABLE' });
    database.close();
  });

  test('enforces manager CRUD, color/name validation, not-found, and stale writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_tags_crud', ['schema', 'data']);
    const api = yaml('api/tags.yaml');
    const create = action(api, 'create_crm_tag_inline');
    const update = action(api, 'update_crm_tag_inline');
    const remove = action(yaml('api/tag-detail.yaml'), 'delete_crm_tag_detail');
    expect([create, update, remove].every((entry: any) => entry.permission === 'crm.manage')).toBe(true);
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Core3 Pool', color: 7 } });
    expect(created).toMatchObject({ id: 'crm-tag-core3-pool', row_version: 1, name: 'Core3 Pool', color: 7 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'services', color: 8 } })).rejects.toMatchObject({ status: 409, code: 'CRM_TAG_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' ', color: 1 } })).rejects.toMatchObject({ status: 422, code: 'CRM_TAG_NAME_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'Bad color', color: 12 } })).rejects.toMatchObject({ status: 422, code: 'CRM_TAG_COLOR_INVALID' });
    const edited = await repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Core3 Pool Updated', color: 8 } });
    expect(edited).toMatchObject({ row_version: 2, name: 'Core3 Pool Updated', color: 8 });
    await expect(repository.executeMutation(update.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale', color: 9 } })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(update.mutation, { id: 'missing-tag', expected_row_version: 1, values: { name: 'Missing', color: 1 } })).rejects.toMatchObject({ status: 404, code: 'CRM_TAG_NOT_FOUND' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'CRM_TAG_NOT_FOUND' });
    database.close();
  });
});

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const listApi = () => yaml('api/lost-reasons.yaml');
const detailApi = () => yaml('api/lost-reason-detail.yaml');
const action = (id: string) => [...listApi().actions, ...detailApi().actions].find((candidate: any) => candidate.id === id);

describe('CRM Lost Reasons Odoo action parity', () => {
  test('keeps Odoo list/form, manifest route, and page.id API joins aligned', () => {
    const page = yaml('pages/lost-reasons.yaml');
    const detail = yaml('pages/crm-lost-reason-detail.yaml');
    const manifest = yaml('manifest.yaml');
    const configuration = manifest.menu.groups.find((group: any) => group.id === 'configuration');
    expect(page.page).toMatchObject({ id: 'crm-lost-reasons', route: '/lost-reasons' });
    expect(detail.page.id).toBe('crm-lost-reason-detail');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(listApi().page.id).toBe(page.page.id);
    expect(detailApi().page.id).toBe(detail.page.id);
    expect(detailApi().datasources[0]).toMatchObject({ id: 'crm_lost_reason_detail', single: true });
    expect(configuration.items).toContainEqual({ path: '/lost-reasons', label: 'Lost Reasons', icon: 'archive', permission: 'crm.manage' });
    expect(page.components[0]).toMatchObject({ source: 'crm_lost_reason_action', create_action: 'create_crm_lost_reason', row_open_action: 'edit_crm_lost_reason' });
    expect(page.components[0].columns[0]).toMatchObject({ field: 'name', label: 'Description' });
    expect(detail.components[0].stat_buttons).toEqual([{ id: 'view_lost_reason_leads', label: 'Leads', value_field: 'leads_count', permission: 'crm.read' }]);
    expect(listApi().datasources[0].error_states).toMatchObject({
      unauthorized: { status: 401, code: 'CRM_LOST_REASONS_UNAUTHORIZED' },
      forbidden: { status: 403, code: 'CRM_LOST_REASONS_FORBIDDEN' },
      transport_error: { status: 503, code: 'CRM_LOST_REASONS_UNAVAILABLE' },
    });
    expect(detailApi().datasources[0].error_states).toMatchObject({
      unauthorized: { status: 401, code: 'CRM_LOST_REASON_DETAIL_UNAUTHORIZED' },
      forbidden: { status: 403, code: 'CRM_LOST_REASON_DETAIL_FORBIDDEN' },
      not_found: { status: 404, code: 'CRM_LOST_REASON_NOT_FOUND' },
    });
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pages.get('crm-lost-reasons')?.config.page.id).toBe('crm-lost-reasons');
    expect(discovered.pageDatasources.get('crm-lost-reasons')).toEqual(['crm_lost_reason_action']);
    expect(discoverPageRoutes(discovered)).toContainEqual(expect.objectContaining({ path: '/lost-reasons', page: 'crm-lost-reasons', module: 'crm' }));
  });

  test('seeds active and archived reasons deterministically and exposes search, empty, no-results, and transport-error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_lost_reasons_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_lost_reasons_test', ['schema', 'data']);
    const source = listApi().datasources[0];
    const active = (await repository.querySource(source, { q: null, active: null, fixture_state: null }, 0, 50)).data;
    expect(active.map((row: any) => row.name)).toEqual(['Not enough stock', 'Too expensive', "We don't have people/skills"]);
    expect(active.every((row: any) => row.active === true && row.row_version === 1)).toBe(true);
    expect((await repository.querySource(source, { q: 'expensive', active: null, fixture_state: null }, 0, 50)).data).toMatchObject([{ id: 'crm-lost-expensive', name: 'Too expensive', leads_count: 0 }]);
    expect((await repository.querySource(source, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data).toMatchObject([
      { id: 'crm-lost-timing', name: 'Bad timing', active: false },
      { id: 'crm-lost-legacy', name: 'Legacy no decision', active: false },
      { id: 'crm-lost-budget', name: 'Not enough budget', active: false },
    ]);
    expect((await repository.querySource(source, { q: 'missing', active: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, active: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'CRM_LOST_REASONS_UNAVAILABLE' });
    await expect(repository.querySource(source, { q: null, active: null, fixture_state: 'unauthorized' }, 0, 50)).rejects.toMatchObject({ status: 401, code: 'CRM_LOST_REASONS_UNAUTHORIZED' });
    await expect(repository.querySource(source, { q: null, active: null, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'CRM_LOST_REASONS_FORBIDDEN' });
    database.close();
  });

  test('enforces manager CRUD, archive/restore/delete, validation, in-use, and stale-row boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_lost_reasons_crud', ['schema', 'data']);
    const create = action('create_crm_lost_reason');
    const edit = action('edit_crm_lost_reason');
    const archive = action('archive_crm_lost_reason');
    const restore = action('unarchive_crm_lost_reason');
    const remove = action('delete_crm_lost_reason');
    expect([create, edit, archive, restore, remove].every((entry: any) => entry.permission === 'crm.manage')).toBe(true);
    expect(edit.mutation.concurrency.required).toBe(true);
    await expect(repository.executeMutation(create.mutation, { values: { name: '  ' } })).rejects.toMatchObject({ status: 422, code: 'CRM_LOST_REASON_NAME_REQUIRED' });
    const created = await repository.executeMutation(create.mutation, { values: { name: 'No decision' } });
    expect(created).toMatchObject({ name: 'No decision', active: true, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'no decision' } })).rejects.toMatchObject({ status: 409, code: 'CRM_LOST_REASON_EXISTS' });
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'No decision yet' } });
    expect(edited).toMatchObject({ name: 'No decision yet', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale' } })).rejects.toMatchObject({ status: 409 });
    await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 2, values: { active: false } });
    expect((await repository.querySource(listApi().datasources[0], { q: 'No decision yet', active: 'archived', fixture_state: null }, 0, 50)).data).toMatchObject([{ active: false, row_version: 3 }]);
    await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 3, values: { active: true } });
    await repository.run(`INSERT INTO crm_leads(id, name, type, stage, lost_reason) VALUES ('crm-lost-reason-use', 'Lost reason usage', 'opportunity', 'Lost', '${created.id}')`);
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 })).rejects.toMatchObject({ status: 409, code: 'CRM_LOST_REASON_IN_USE' });
    await repository.run(`UPDATE crm_leads SET lost_reason = NULL WHERE id = 'crm-lost-reason-use'`);
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 4 });
    expect((await repository.querySource(listApi().datasources[0], { q: 'No decision yet', active: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    database.close();
  });
});

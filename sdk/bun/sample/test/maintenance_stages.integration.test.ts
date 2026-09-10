import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/stages.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Maintenance Stages Odoo action parity', () => {
  test('keeps the stage list and form presentation-only and joins API sources by page id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const listPage = yaml('pages/stages.yaml');
    const detailPage = yaml('pages/maintenance-stage-detail.yaml');
    const api = yaml('api/stages.yaml');

    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(detailPage.actions).toBeUndefined();
    expect(listPage.page).toMatchObject({ id: 'maintenance-stages', route: '/maintenance-stages' });
    expect(detailPage.page).toMatchObject({ id: 'maintenance-stage-detail', route: '/maintenance-stages/detail' });
    const detailApi = yaml('api/stage-detail.yaml');
    expect(api.page.id).toBe('maintenance-stages');
    expect(detailApi.page.id).toBe('maintenance-stage-detail');
    expect(discovered.pages.get('maintenance-stages')?.config.page.id).toBe('maintenance-stages');
    expect(discovered.pageDatasources.get('maintenance-stages')).toEqual(expect.arrayContaining(['maintenance_stages']));
    expect(discovered.pageDatasources.get('maintenance-stage-detail')).toEqual(expect.arrayContaining(['maintenance_stage_detail']));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/maintenance-stages', page: 'maintenance-stages', module: 'maintenance' }),
      expect.objectContaining({ path: '/maintenance-stages/detail', page: 'maintenance-stage-detail', module: 'maintenance' }),
    ]));

    const list = listPage.components[0];
    expect(list).toMatchObject({ source: 'maintenance_stages', create_action: 'create_maintenance_stage', row_open_action: 'edit_maintenance_stage' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'kanban', 'card', 'form']);
    expect(list.views.find((view: any) => view.id === 'card')).toMatchObject({ card: { title: 'name', subtitle: 'sequence' } });
    expect(list.views.filter((view: any) => view.mobile === false).map((view: any) => view.id)).toEqual(['list', 'kanban']);
    expect(list.form_view.page).toBe('apps/services/maintenance/pages/maintenance-stage-detail.yaml');
    expect(list.columns.map((column: any) => column.field)).toEqual(['sequence', 'name', 'fold', 'done', 'id']);
  });

  test('seeds fixed stages and supports search, empty, detail, CRUD, and delete guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'maintenance_stages_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'maintenance_stages_test_migrations', ['schema', 'data']);

    const source = yaml('api/stages.yaml').datasources.find((item: any) => item.id === 'maintenance_stages');
    const rows = await repository.querySource(source, { q: null, fixture_state: null }, 0, 50);
    expect(rows.data.map((row: any) => row.name)).toEqual(['New Request', 'In Progress', 'Repaired', 'Scrap']);
    expect(rows.data.find((row: any) => row.name === 'Repaired')).toMatchObject({ sequence: 30, fold: false, done: true, row_version: 1 });
    expect((await repository.querySource(source, { q: 'Scrap', fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['maintenance-stage-scrap']);
    expect((await repository.querySource(source, { q: 'missing', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const detail = yaml('api/stage-detail.yaml').datasources.find((item: any) => item.id === 'maintenance_stage_detail');
    expect((await repository.querySource(detail, { id: 'maintenance-stage-progress', fixture_state: null }, 0, 1)).data).toMatchObject({ id: 'maintenance-stage-progress', name: 'In Progress' });
    expect((await repository.querySource(detail, { id: 'maintenance-stage-missing', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});

    const created = await repository.executeMutation(action('create_maintenance_stage').mutation, { values: { name: 'Quality Review', sequence: 25, fold: false, done: false } });
    expect(created).toMatchObject({ name: 'Quality Review', sequence: 25, fold: false, done: false, active: true, row_version: 1 });
    await expect(repository.executeMutation(action('create_maintenance_stage').mutation, { values: { name: 'quality review' } })).rejects.toMatchObject({ status: 409, code: 'MAINTENANCE_STAGE_NAME_EXISTS' });

    const edited = await repository.executeMutation(action('edit_maintenance_stage').mutation, { id: created.id, expected_row_version: 1, values: { name: 'Quality Review', sequence: 26, fold: true, done: false } });
    expect(edited).toMatchObject({ id: created.id, sequence: 26, fold: true, row_version: 2 });
    await expect(repository.executeMutation(action('edit_maintenance_stage').mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale Review' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(action('edit_maintenance_stage').mutation, { id: 'maintenance-stage-missing', expected_row_version: 1, values: { name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'MAINTENANCE_STAGE_NOT_FOUND' });

    await expect(repository.executeMutation(action('delete_maintenance_stage').mutation, { id: 'maintenance-stage-progress', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'MAINTENANCE_STAGE_IN_USE' });
    await repository.executeMutation(action('delete_maintenance_stage').mutation, { id: created.id, expected_row_version: 2 });
    expect((await repository.querySource(source, { q: 'Quality Review', fixture_state: null }, 0, 50)).data).toEqual([]);
    await expect(repository.executeMutation(action('delete_maintenance_stage').mutation, { id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'MAINTENANCE_STAGE_NOT_FOUND' });

    database.close();
  });

  test('keeps manager permissions and unavailable/error contracts explicit', () => {
    const api = yaml('api/stages.yaml');
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/maintenance-stages', label: 'Maintenance Stages', permission: 'maintenance.manage' }),
    ]));
    for (const source of [...api.datasources, ...yaml('api/stage-detail.yaml').datasources]) {
      expect(source.permission, source.id).toBe('maintenance.manage');
      expect(source.error_states.transport_error.status, source.id).toBe(503);
    }
    for (const id of ['create_maintenance_stage', 'edit_maintenance_stage', 'delete_maintenance_stage']) {
      expect(action(id).permission, id).toBe('maintenance.manage');
      expect(action(id).handler, id).toBe('yaml_mutation');
      expect(action(id).mutation, id).toBeDefined();
    }
    expect(yaml('api/stage-detail.yaml').actions.find((item: any) => item.id === 'edit_maintenance_stage_detail')).toMatchObject({ permission: 'maintenance.manage', handler: 'yaml_mutation' });
    expect(action('create_maintenance_stage').mutation.guards[0]).toMatchObject({ status: 409, code: 'MAINTENANCE_STAGE_NAME_EXISTS' });
    expect(action('delete_maintenance_stage').mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 404, code: 'MAINTENANCE_STAGE_NOT_FOUND' }),
      expect.objectContaining({ status: 409, code: 'MAINTENANCE_STAGE_IN_USE' }),
    ]));
    expect(action('edit_maintenance_stage').mutation.concurrency.required).toBe(true);
    expect(action('delete_maintenance_stage').mutation.concurrency.required).toBe(true);
  });
});

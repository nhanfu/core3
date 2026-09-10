import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Events Event Stages detail parity', () => {
  test('binds the list/detail route through page IDs and Odoo form controls', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const list = yaml('pages/event-stages.yaml');
    const detail = yaml('pages/event-stage-detail.yaml');
    expect(list.components[0]).toMatchObject({ row_open_action: 'view_event_stage', row_double_click_action: 'view_event_stage' });
    expect(discovered.pages.get('event-stage-detail')?.config.page.route).toBe('/events/stages/detail');
    expect(discovered.pageDatasources.get('event-stage-detail')).toEqual(['event_stage_detail']);
    expect(detail.components[0].header_actions.map((action: any) => action.id)).toEqual(['back_to_event_stages', 'edit_event_stage', 'delete_event_stage']);
  });

  test('seeds stages and enforces duplicate, sequence, and delete boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_stage_detail_test_migrations', ['schema', 'data']);
    const source = yaml('api/event-stage-detail.yaml').datasources[0];
    expect(await repository.querySource(source, { id: 'stage-booked', fixture_state: null }, 0, 1)).toMatchObject({ data: { name: 'Booked', sequence: 2, row_version: 1 } });
    const create = yaml('pages/event-stages.yaml').actions.find((action: any) => action.id === 'create_event_stage');
    const edit = yaml('pages/event-stage-detail.yaml').actions.find((action: any) => action.id === 'edit_event_stage');
    const remove = yaml('pages/event-stage-detail.yaml').actions.find((action: any) => action.id === 'delete_event_stage');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Review', sequence: 5, fold: false } });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'review', sequence: 6 } })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Review', sequence: 0, fold: false } })).rejects.toMatchObject({ status: 422 });
    const updated = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Review 2027', sequence: 6, fold: true } });
    expect(updated).toMatchObject({ name: 'Review 2027', sequence: 6, row_version: 2 });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    expect((await repository.querySource(source, { id: created.id, fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
  });
});

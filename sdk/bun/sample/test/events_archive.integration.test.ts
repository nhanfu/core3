import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const source = (file: string, id: string) => yaml(file).datasources.find((candidate: any) => candidate.id === id);

describe('Events event.archive parity', () => {
  test('maps Odoo active/archive behavior through the page and API contracts', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/event/views/event_event_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/event/models/event_event.py', 'utf8');
    const eventsPage = yaml('pages/events.yaml');
    const eventDetail = yaml('pages/event-detail.yaml');
    const eventsApi = yaml('api/events.yaml');
    const detailApi = yaml('api/event-detail.yaml');
    const list = eventsPage.components.find((component: any) => component.type === 'ListView');

    expect(sourceModel).toContain('active = fields.Boolean(default=True)');
    expect(sourceView).toContain('text="Archived"');
    expect(sourceView).toContain("name=\"filter_inactive\"");
    expect(eventsPage.page.id).toBe(eventsApi.page.id);
    expect(eventDetail.page.id).toBe(detailApi.page.id);
    expect(list.default_filters).toEqual({ active: 'active' });
    expect(list.filters).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'active', options_source: 'event_active_states' }),
    ]));
    expect(list.columns).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'active' })]));
    expect(eventsApi.datasources.map((item: any) => item.id)).toEqual(['event_states', 'event_active_states', 'events']);
    expect(eventsApi.datasources.find((item: any) => item.id === 'events').query).toContain('e.active');
    expect(eventsPage.actions.find((action: any) => action.id === 'archive_event')).toMatchObject({ permission: 'events.write', handler: 'yaml_mutation' });
    expect(eventsPage.actions.find((action: any) => action.id === 'unarchive_event')).toMatchObject({ permission: 'events.write', handler: 'yaml_mutation' });
    expect(eventDetail.components[0].header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'archive_event_detail', permission: 'events.write' }),
      expect.objectContaining({ id: 'unarchive_event_detail', permission: 'events.write' }),
    ]));
    expect(detailApi.actions.map((action: any) => action.id)).toEqual(expect.arrayContaining(['archive_event_detail', 'unarchive_event_detail']));
    expect(yaml('migrations/20260922260000-044-event-archive.yaml').type.postgres.up).toContain('active BOOLEAN');
  });

  test('persists archive and restore, filters the list, guards stale writes, and survives restart', async () => {
    const databasePath = `/tmp/core3-events-archive-${crypto.randomUUID()}.duckdb`;
    const migrationName = `events_archive_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);

      const listSource = source('api/events.yaml', 'events');
      const archivedSource = await repository.querySource(listSource, { active: 'archived', q: null, state: null, fixture_state: null }, 0, 50);
      expect(archivedSource.data).toEqual([expect.objectContaining({ id: 'event-archive-20260115', active: false, row_version: 1 })]);
      const activeSource = await repository.querySource(listSource, { active: null, q: null, state: null, fixture_state: null }, 0, 50);
      expect(activeSource.data).toHaveLength(10);
      expect(activeSource.data.some((row: any) => row.id === 'event-archive-20260115')).toBe(false);

      const detailSource = source('api/event-detail.yaml', 'event_detail');
      expect((await repository.querySource(detailSource, { id: 'event-archive-20260115', fixture_state: null }, 0, 1)).data)
        .toMatchObject({ id: 'event-archive-20260115', active: false });

      const archive = yaml('pages/events.yaml').actions.find((action: any) => action.id === 'archive_event');
      const restore = yaml('api/event-detail.yaml').actions.find((action: any) => action.id === 'unarchive_event_detail');
      const activeEvent = (await repository.querySource(listSource, { active: null, q: 'OpenWood', state: null, fixture_state: null }, 0, 1)).data[0] as any;
      const archived = await repository.executeMutation(archive.mutation, { id: activeEvent.id, expected_row_version: activeEvent.row_version }) as any;
      expect(archived).toMatchObject({ id: activeEvent.id, active: false, row_version: activeEvent.row_version + 1 });
      expect((await repository.querySource(listSource, { active: null, q: 'OpenWood', state: null, fixture_state: null }, 0, 1)).data).toEqual([]);
      expect((await repository.querySource(listSource, { active: 'archived', q: 'OpenWood', state: null, fixture_state: null }, 0, 1)).data)
        .toMatchObject([expect.objectContaining({ id: activeEvent.id, active: false })]);
      await expect(repository.executeMutation(archive.mutation, { id: activeEvent.id, expected_row_version: activeEvent.row_version }))
        .rejects.toMatchObject({ status: 409, code: 'EVENT_ARCHIVE_STALE' });

      const restored = await repository.executeMutation(restore.mutation, { id: activeEvent.id, expected_row_version: archived.row_version }) as any;
      expect(restored).toMatchObject({ id: activeEvent.id, active: true, row_version: archived.row_version + 1 });
      await expect(repository.executeMutation(restore.mutation, { id: 'missing-event', expected_row_version: 1 }))
        .rejects.toMatchObject({ status: 404, code: 'EVENT_NOT_FOUND' });

      await database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect((await repository.querySource(detailSource, { id: activeEvent.id, fixture_state: null }, 0, 1)).data)
        .toMatchObject({ id: activeEvent.id, active: true, row_version: activeEvent.row_version + 2 });
    } finally {
      await database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});

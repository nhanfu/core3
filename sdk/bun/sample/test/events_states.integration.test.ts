import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const apiSource = (file: string, id: string) => yaml(`api/${file}`).datasources.find((source: any) => source.id === id);

describe('Events datasource ownership and state parity', () => {
  test('keeps list, detail, and analysis pages layout-only with page-ID API ownership', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const screens = [
      ['pages/events.yaml', 'events', 'events'],
      ['pages/event-detail.yaml', 'event-detail', 'event_detail'],
      ['pages/analysis.yaml', 'events-analysis', 'event_analysis_states'],
    ] as const;

    for (const [pageFile, pageId, sourceId] of screens) {
      const page = yaml(pageFile);
      expect(page.datasources, pageFile).toBeUndefined();
      expect(page.page.auth.require, pageFile).toEqual(['events.read']);
      expect(discovered.pages.get(pageId)?.config.page.id, pageFile).toBe(pageId);
      expect(discovered.pageDatasources.get(pageId), pageFile).toContain(sourceId);
      const apiFile = pageId === 'events' ? 'events.yaml' : pageId === 'event-detail' ? 'event-detail.yaml' : 'analysis.yaml';
      expect(yaml(`api/${apiFile}`).page.id, pageFile).toBe(pageId);
    }

    const eventsList = yaml('pages/events.yaml').components.find((component: any) => component.type === 'ListView');
    expect(eventsList.empty_state).toEqual({ title: 'No events', description: 'No events match the current search or filters.' });
    const analysisList = yaml('pages/analysis.yaml').components.find((component: any) => component.type === 'ListView');
    expect(analysisList).toMatchObject({ source: 'event_analysis_states', empty_state: { title: 'No event analysis data' } });
  });

  test('returns stable default, search, empty, and missing fixtures', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_state_test_schema_migrations', ['schema', 'data']);

    const events = apiSource('events.yaml', 'events');
    const eventRows = await repository.querySource(events, { q: null, fixture_state: null }, 0, 50);
    expect(eventRows.data).toHaveLength(10);
    expect(eventRows.data.map((row: any) => row.id)).toContain('event-demo-007');
    expect(eventRows.data.every((row: any) => String(row.start_at).startsWith('2026-'))).toBe(true);

    const searchRows = await repository.querySource(events, { q: 'OpenWood', fixture_state: null }, 0, 50);
    expect(searchRows.data.map((row: any) => row.id)).toEqual(['event-demo-007']);
    const noSearchRows = await repository.querySource(events, { q: 'No matching event', fixture_state: null }, 0, 50);
    expect(noSearchRows.data).toEqual([]);
    const emptyRows = await repository.querySource(events, { q: null, fixture_state: 'empty' }, 0, 50);
    expect(emptyRows.data).toEqual([]);

    const detail = apiSource('event-detail.yaml', 'event_detail');
    const detailRow = await repository.querySource(detail, { id: 'event-demo-007', fixture_state: null }, 0, 1);
    expect(detailRow.data).toMatchObject({ id: 'event-demo-007', name: 'OpenWood Collection Online Reveal', state: 'Published' });
    const missingDetail = await repository.querySource(detail, { id: 'event-does-not-exist', fixture_state: 'not_found' }, 0, 1);
    expect(missingDetail.data).toEqual({});

    const analysisTotals = apiSource('analysis.yaml', 'event_analysis_totals');
    const totals = await repository.querySource(analysisTotals, { q: null, fixture_state: null }, 0, 1);
    expect(totals.data).toMatchObject({ event_count: 10 });
    const analysisStates = apiSource('analysis.yaml', 'event_analysis_states');
    const searchedStates = await repository.querySource(analysisStates, { q: 'Hockey', fixture_state: null }, 0, 25);
    expect(searchedStates.data).toEqual([{ category: 'Published', event_count: 1 }]);
    const emptyAnalysis = await repository.querySource(analysisStates, { q: null, fixture_state: 'empty' }, 0, 25);
    expect(emptyAnalysis.data).toEqual([]);

  });

  test('keeps read permission and mutation error boundaries explicit', () => {
    for (const file of ['api/events.yaml', 'api/event-detail.yaml', 'api/analysis.yaml']) {
      for (const source of yaml(file).datasources) expect(source.permission, file).toBe('events.read');
    }
    expect(yaml('pages/events.yaml').page.auth.require).toEqual(['events.read']);
    expect(yaml('pages/event-detail.yaml').page.auth.require).toEqual(['events.read']);
    expect(yaml('pages/analysis.yaml').page.auth.require).toEqual(['events.read']);

    const workflow = yaml('pages/event-workflow.yaml').workflow;
    expect(workflow.transitions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'publish', permission: 'events.write' }),
      expect.objectContaining({ id: 'complete', permission: 'events.manage' }),
      expect.objectContaining({ id: 'cancel', permission: 'events.manage' }),
    ]));
    expect(workflow.transitions.every((transition: any) => transition.mutation.guards?.[0]?.status === 409)).toBe(true);

    const eventPage = yaml('pages/events.yaml');
    const registration = eventPage.actions.find((action: any) => action.id === 'register_event_attendee');
    expect(registration.mutation.guards[0]).toMatchObject({ status: 409, message: 'The event is not open or has reached capacity' });
    expect(eventPage.actions.find((action: any) => action.id === 'create_event').mutation.required).toEqual(['name', 'start_at']);
    const detailEdit = yaml('pages/event-detail.yaml').actions.find((action: any) => action.id === 'edit_event_detail');
    expect(detailEdit.mutation.required).toEqual(['name']);
  });
});

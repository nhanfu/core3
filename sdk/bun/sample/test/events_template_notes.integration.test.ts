import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/event-template-detail.yaml');
const page = yaml('pages/event-template-detail.yaml');
const source = api.datasources.find((candidate: any) => candidate.id === 'event_template_detail');
const action = page.actions.find((candidate: any) => candidate.id === 'edit_event_template_notes');

describe('Events event template Notes tab parity', () => {
  test('maps Odoo event.type note fields through the existing page/API pair', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/event/views/event_type_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/event/models/event_type.py', 'utf8');
    const notesTab = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'notes');

    expect(sourceView).toContain('name="note"');
    expect(sourceView).toContain('name="ticket_instructions"');
    expect(sourceModel).toContain("note = fields.Html");
    expect(sourceModel).toContain("ticket_instructions = fields.Html");
    expect(notesTab.fields.map((field: any) => field.field)).toEqual(['ticket_instructions', 'note']);
    expect(api.page).toEqual({ id: 'event-template-detail' });
    expect(page.page.id).toBe(api.page.id);
    expect(source.query).toContain('ticket_instructions');
    expect(action).toMatchObject({ permission: 'events.write', handler: 'yaml_mutation', operation: 'update' });
    expect(action.mutation).toMatchObject({ table: 'event_templates', fields: ['ticket_instructions', 'note'], concurrency: { required: true } });
  });

  test('persists safe notes with permission and stale-row guards across restart', async () => {
    const databasePath = `/tmp/core3-events-template-notes-${crypto.randomUUID()}.duckdb`;
    const migrationName = `events_template_notes_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);

      const initial = (await repository.querySource(source, { id: 'template-exhibition', fixture_state: null }, 0, 1)).data as any;
      expect(initial).toMatchObject({ id: 'template-exhibition', row_version: 1, note: 'Coordinate the exhibition welcome desk.', ticket_instructions: '<p>Bring your ticket to the registration desk.</p>' });
      const values = { note: 'Meet the venue team at 08:30.', ticket_instructions: '<p>Bring the printed ticket to the welcome desk.</p>' };
      const updated = await repository.executeMutation(action.mutation, { id: initial.id, expected_row_version: initial.row_version, values }) as any;
      expect(updated).toMatchObject({ id: initial.id, ...values, row_version: 2 });

      await expect(repository.executeMutation(action.mutation, { id: initial.id, expected_row_version: initial.row_version, values }))
        .rejects.toMatchObject({ status: 409, code: 'EVENT_TEMPLATE_NOTES_STALE' });
      await expect(repository.executeMutation(action.mutation, { id: initial.id, expected_row_version: updated.row_version, values: { ...values, note: '<script>alert(1)</script>' } }))
        .rejects.toMatchObject({ status: 422, code: 'EVENT_TEMPLATE_NOTE_INVALID' });
      await expect(repository.executeMutation(action.mutation, { id: initial.id, expected_row_version: updated.row_version, values: { ...values, ticket_instructions: 'x'.repeat(10001) } }))
        .rejects.toMatchObject({ status: 422, code: 'EVENT_TEMPLATE_TICKET_INSTRUCTIONS_INVALID' });

      await database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect((await repository.querySource(source, { id: initial.id, fixture_state: null }, 0, 1)).data).toMatchObject({ ...values, row_version: 2 });
    } finally {
      await database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});

import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

describe('Events Notes and Documents parity slice', () => {
  test('maps the Odoo event fields and keeps page/API ownership joined by page.id', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/event/models/event_event.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/event/views/event_event_views.xml', 'utf8');
    const page = yaml('pages/event-detail.yaml');
    const api = yaml('api/event-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');

    expect(sourceModel).toContain("badge_format = fields.Selection");
    expect(sourceModel).toContain("badge_image = fields.Image");
    expect(sourceModel).toContain("ticket_instructions = fields.Html");
    expect(sourceModel).toContain("note = fields.Html");
    expect(sourceView).toContain('page string="Notes &amp; Documents"');
    expect(sourceView).toContain('field name="badge_format"');
    expect(sourceView).toContain('name="ticket_instructions"');
    expect(sourceView).toContain('name="note"');
    expect(api.page).toEqual({ id: page.page.id });
    expect(form).toMatchObject({ attachment_source: 'event_badge_background', attachment_upload_action: 'upload_event_badge_background' });
    expect(form.notebook.tabs.find((tab: any) => tab.id === 'notes').fields.map((field: any) => field.field))
      .toEqual(['badge_format', 'badge_image_file_name', 'ticket_instructions', 'note']);
    expect(api.datasources.map((source: any) => source.id)).toContain('event_badge_background');
    expect(action(api, 'upload_event_badge_background')).toMatchObject({ type: 'upload', permission: 'events.write', kind: 'event_badge_background' });
    expect(action(api, 'remove_event_badge_background')).toMatchObject({ type: 'server', permission: 'events.write' });
    expect(yaml('storage.yaml').attachments.event_badge_background.download).toMatchObject({ route: '/api/events/badge-backgrounds', permission: 'events.read' });
  });

  test('persists Notes and Documents with validation and stale-row guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, root + '/migrations', undefined, 'events_notes_documents_guards', ['schema', 'data']);
    const edit = action(yaml('pages/event-detail.yaml'), 'edit_event_detail');
    const initial = (await repository.query("SELECT * FROM events WHERE id = 'event-demo-001'"))[0] as any;
    const values = { name: initial.name, event_type: initial.event_type, organizer: initial.organizer, venue: initial.venue, description: initial.description, capacity: initial.capacity, start_at: '2026-10-09 16:30:00', end_at: '2026-10-09 19:30:00', badge_format: 'four_per_sheet', ticket_instructions: '<p>Bring your ticket.</p>', note: 'Doors open at 16:00.' };
    const updated = await repository.executeMutation(edit.mutation, { id: 'event-demo-001', expected_row_version: initial.row_version, values }) as any;
    expect(updated).toMatchObject({ id: 'event-demo-001', badge_format: 'four_per_sheet', ticket_instructions: '<p>Bring your ticket.</p>', note: 'Doors open at 16:00.' });
    expect(Number(updated.row_version)).toBe(Number(initial.row_version) + 1);
    await expect(repository.executeMutation(edit.mutation, { id: 'event-demo-001', expected_row_version: initial.row_version, values })).rejects.toMatchObject({ status: 409, code: 'EVENT_NOTES_STALE' });
    await expect(repository.executeMutation(edit.mutation, { id: 'event-demo-001', expected_row_version: updated.row_version, values: { ...values, badge_format: 'bad' } })).rejects.toMatchObject({ status: 422, code: 'EVENT_BADGE_FORMAT_INVALID' });
    await expect(repository.executeMutation(edit.mutation, { id: 'event-demo-001', expected_row_version: updated.row_version, values: { ...values, note: '<script>alert(1)</script>' } })).rejects.toMatchObject({ status: 422, code: 'EVENT_NOTE_INVALID' });
    await database.close();
  });

  test('uploads, removes, and preserves badge background metadata through restart', async () => {
    const databasePath = `/tmp/core3-events-notes-${crypto.randomUUID()}.duckdb`;
    const uploadRoot = `/tmp/core3-events-notes-uploads-${crypto.randomUUID()}`;
    const migrationName = `events_notes_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const apiDefinition = yaml('api/event-detail.yaml');
    const upload = action(apiDefinition, 'upload_event_badge_background');
    const remove = action(apiDefinition, 'remove_event_badge_background');
    const user: any = { sub: 'events-manager', email: 'events@core3.local', name: 'Events Manager', permissions: ['events.read', 'events.write'] };
    const createApi = (repository: YamlRepository) => createYamlApi({
      repository,
      authProvider: { async getCurrentUser() { return user; }, hasPermission(candidate: any, permission: string) { return candidate.permissions.includes(permission); } },
      sources: new Map(apiDefinition.datasources.map((source: any) => [source.id, source])),
      pageSources: new Map(), pages: new Map([['event-detail', { actions: [upload, remove] }]]), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(),
      permissions: { permissions: ['events.read', 'events.write'], tables: {}, endpoints: {} }, uploadRoot, eventStore: {}, topics: {}, storage: yaml('storage.yaml'),
    });
    let first: DuckDbDatabase | undefined;
    let second: DuckDbDatabase | undefined;
    try {
      first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
      const initial = (await firstRepository.query("SELECT row_version FROM events WHERE id = 'event-demo-001'"))[0] as any;
      const form = new FormData();
      form.set('file', new File([new Uint8Array([80, 78, 71, 49])], 'badge-background.png', { type: 'image/png' }));
      form.set('meta', JSON.stringify({ kind: 'event_badge_background', id: 'event-demo-001', expected_row_version: initial.row_version }));
      const response = await createApi(firstRepository)(new Request('http://events.test/api/upload', { method: 'POST', body: form }), new URL('http://events.test/api/upload'));
      expect(response?.status).toBe(200);
      expect(await response!.json()).toMatchObject({ id: 'event-demo-001', file_name: 'badge-background.png', size_bytes: 4 });
      first.close();
      first = undefined;
      second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, root + '/migrations', undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query("SELECT badge_image_file_name, badge_image_mime_type, badge_image_size_bytes FROM events WHERE id = 'event-demo-001'"))
        .toEqual([{ badge_image_file_name: 'badge-background.png', badge_image_mime_type: 'image/png', badge_image_size_bytes: 4 }]);
      const downloaded = await createApi(secondRepository)(new Request('http://events.test/api/events/badge-backgrounds/event-demo-001'), new URL('http://events.test/api/events/badge-backgrounds/event-demo-001'));
      expect(downloaded?.status).toBe(200);
      expect(downloaded?.headers.get('content-type')).toBe('image/png');
      expect([...new Uint8Array(await downloaded!.arrayBuffer())]).toEqual([80, 78, 71, 49]);
      const current = (await secondRepository.query("SELECT row_version FROM events WHERE id = 'event-demo-001'"))[0] as any;
      await secondRepository.executeMutation(remove.mutation, { id: 'event-demo-001', expected_row_version: current.row_version });
      expect(await secondRepository.query("SELECT badge_image_file_name FROM events WHERE id = 'event-demo-001'"))
        .toEqual([{ badge_image_file_name: null }]);
    } finally {
      second?.close();
      first?.close();
      rmSync(databasePath, { force: true });
      rmSync(uploadRoot, { recursive: true, force: true });
    }
  });
});

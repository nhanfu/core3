import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Events attendee edit parity', () => {
  test('exposes an editable detail form through the page-owned API', () => {
    const page = yaml('pages/attendee-detail.yaml');
    const api = yaml('api/attendee-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const edit = api.actions.find((action: any) => action.id === 'edit_event_attendee');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(form).toMatchObject({ source: 'event_attendee_detail', editable: true });
    expect(form.header_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'edit_event_attendee', permission: 'events.write' }),
    ]));
    expect(edit).toMatchObject({ type: 'server_form', permission: 'events.write', action: 'events.registrations.update', handler: 'yaml_mutation', operation: 'update' });
    expect(edit.mutation).toMatchObject({ operation: 'update', table: 'event_registrations', concurrency: { required: true } });
    expect(discovered.pageDatasources.get('event-attendee-detail')).toContain('event_attendee_detail');
  });

  test('persists attendee edits and rejects missing, blank, and stale writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'events_attendee_edit_migrations', ['schema', 'data']);
    const edit = yaml('api/attendee-detail.yaml').actions.find((action: any) => action.id === 'edit_event_attendee');
    const values = { attendee_name: 'Updated Guest', attendee_email: 'updated@example.com', attendee_phone: '+1 202 555 0199', company_name: 'Updated Company', ticket_type: 'VIP' };

    const updated = await repository.executeMutation(edit.mutation, { id: 'registration-demo-unconfirmed', expected_row_version: 1, values });
    expect(updated).toMatchObject({ id: 'registration-demo-unconfirmed', ...values, state: 'Unconfirmed', row_version: 2 });
    expect(await repository.querySource(yaml('api/attendee-detail.yaml').datasources[0], { id: 'registration-demo-unconfirmed', fixture_state: null }, 0, 1))
      .toMatchObject({ data: expect.objectContaining({ attendee_name: 'Updated Guest', attendee_email: 'updated@example.com', row_version: 2 }) });
    await expect(repository.executeMutation(edit.mutation, { id: 'registration-demo-unconfirmed', expected_row_version: 1, values }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'registration-demo-unconfirmed', expected_row_version: 2, values: { ...values, attendee_name: ' ' } }))
      .rejects.toMatchObject({ status: 422, code: 'EVENT_ATTENDEE_NAME_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-registration', expected_row_version: 1, values }))
      .rejects.toMatchObject({ status: 404, code: 'EVENT_ATTENDEE_NOT_FOUND' });
    database.close();
  });
});

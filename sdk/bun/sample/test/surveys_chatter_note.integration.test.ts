import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Surveys chatter note parity', () => {
  test('joins Odoo mail.thread chatter to the existing activity page/API pair', () => {
    const page = yaml('pages/survey-detail.yaml');
    const api = yaml('api/survey-detail.yaml');
    const messages = api.datasources.find((source: any) => source.id === 'survey_activities');
    const note = api.actions.find((candidate: any) => candidate.id === 'log_survey_note');

    expect(page.page.id).toBe('survey-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0]).toMatchObject({ message_source: 'survey_activities', note_action: 'log_survey_note' });
    expect(messages.query).toContain('FROM survey_messages');
    expect(note).toMatchObject({ type: 'server_form', permission: 'surveys.write', action: 'surveys.records.chatter.note', handler: 'order_chatter' });
    expect(note.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_NOTE_ACTOR_REQUIRED', 'SURVEY_NOTE_STALE', 'SURVEY_NOTE_INVALID',
    ]);
  });

  test('logs notes with actor, permission, parent, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_chatter_note_guards', ['schema', 'data']);
    const messages = yaml('api/survey-detail.yaml').datasources.find((source: any) => source.id === 'survey_activities');
    const note = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'log_survey_note');
    const before = (await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-001'"))[0].row_version;

    await expect(repository.executeMutation(note.mutation, {
      id: 'survey-demo-001', expected_row_version: before, current_user_id: '',
      values: { content: 'Missing actor note' },
    })).rejects.toMatchObject({ status: 403, code: 'SURVEY_NOTE_ACTOR_REQUIRED' });
    const created = await repository.executeMutation(note.mutation, {
      id: 'survey-demo-001', expected_row_version: before, current_user_id: 'user-demo', current_user_name: 'Demo Survey Officer',
      values: { content: 'Confirm the public response owner before publishing.' },
    });
    expect(created).toMatchObject({ id: 'survey-demo-001-message-2', survey_id: 'survey-demo-001', actor_name: 'Demo Survey Officer', detail: 'Confirm the public response owner before publishing.' });
    expect((await repository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-001'"))[0].row_version).toBe(before + 1);
    expect((await repository.querySource(messages, { id: 'survey-demo-001' }, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: created.id, activity_type: 'note', summary: 'Internal note', actor_name: 'Demo Survey Officer' }),
    ]));
    await expect(repository.executeMutation(note.mutation, {
      id: 'survey-demo-001', expected_row_version: before, current_user_id: 'user-demo',
      values: { content: 'Stale replay' },
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_NOTE_STALE' });
    database.close();
  });

  test('preserves notes through file-backed restart and migration replay', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-chatter-note-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_chatter_note_restart', ['schema', 'data']);
      const note = yaml('api/survey-detail.yaml').actions.find((candidate: any) => candidate.id === 'log_survey_note');
      const before = (await firstRepository.query("SELECT row_version FROM surveys WHERE id = 'survey-demo-001'"))[0].row_version;
      const created = await firstRepository.executeMutation(note.mutation, {
        id: 'survey-demo-001', expected_row_version: before, current_user_id: 'user-admin',
        values: { content: 'Restart-safe internal note' },
      });
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_chatter_note_restart', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT survey_id, actor_name, detail FROM survey_messages WHERE id = ?", [created.id]))
        .toEqual([{ survey_id: 'survey-demo-001', actor_name: 'Admin User', detail: 'Restart-safe internal note' }]);
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

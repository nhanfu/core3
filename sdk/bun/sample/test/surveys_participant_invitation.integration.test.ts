import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((candidate: any) => candidate.id === id);

describe('Surveys participant invitation workflow', () => {
  test('keeps the Odoo resend boundary separate, permissioned, and deterministic', () => {
    const page = yaml('pages/participants.yaml');
    const api = yaml('api/participants.yaml');
    const invite = action(api, 'send_survey_invitation');
    const resend = action(api, 'resend_survey_invitation');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const rowActions = list.columns.find((column: any) => column.field === 'actions').actions;

    expect(api.page.id).toBe(page.page.id);
    expect(list.source).toBe('survey_participants');
    expect(rowActions).toContainEqual(expect.objectContaining({ id: 'send_survey_invitation', label: 'Send invitation', permission: 'surveys.write' }));
    expect(rowActions).toContainEqual(expect.objectContaining({ id: 'resend_survey_invitation', label: 'Resend invitation', permission: 'surveys.write' }));
    expect(invite).toMatchObject({ permission: 'surveys.write', action: 'surveys.participants.invite', handler: 'yaml_mutation', result: 'alert' });
    expect(resend).toMatchObject({ permission: 'surveys.write', action: 'surveys.participants.resend', handler: 'yaml_mutation', result: 'alert' });
    expect(invite.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_PARTICIPANT_INVITE_STATE',
      'SURVEY_PARTICIPANT_INVITE_EMAIL_REQUIRED',
    ]);
    expect(resend.mutation.guards.map((guard: any) => guard.code)).toEqual([
      'SURVEY_PARTICIPANT_RESEND_STATE',
      'SURVEY_PARTICIPANT_RESEND_EMAIL_REQUIRED',
    ]);
    expect(String(invite.mutation.steps[0].query)).toContain("TIMESTAMP '2026-01-15 09:10:00'");
    expect(String(resend.mutation.steps[0].query)).toContain("TIMESTAMP '2026-01-15 09:15:00'");
  });

  test('sends new and resends in-progress invitations with guarded durable state transitions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_participant_invitation_workflow', ['schema', 'data']);
    const api = yaml('api/participants.yaml');
    const invite = action(api, 'send_survey_invitation');
    const resend = action(api, 'resend_survey_invitation');

    const sent = await repository.executeMutation(invite.mutation, {
      id: 'participant-burger-new',
      expected_row_version: 1,
    });
    expect(sent).toMatchObject({ message: 'Invitation sent to furnico@example.com', invitation_status: 'Sent', invitation_count: 1 });
    expect(await repository.query("SELECT state, invitation_status, invitation_count, CAST(invitation_sent_at AS VARCHAR) AS invitation_sent_at, row_version FROM survey_participants WHERE id = 'participant-burger-new'")).toEqual([
      { state: 'New', invitation_status: 'Sent', invitation_count: 1, invitation_sent_at: '2026-01-15 09:10:00', row_version: 2 },
    ]);

    const resent = await repository.executeMutation(resend.mutation, {
      id: 'participant-feedback-in-progress',
      expected_row_version: 1,
    });
    expect(resent).toMatchObject({ message: 'Invitation resent to acme@example.com', invitation_status: 'Sent', invitation_count: 2 });
    expect(await repository.query("SELECT state, invitation_status, invitation_count, CAST(invitation_sent_at AS VARCHAR) AS invitation_sent_at, row_version FROM survey_participants WHERE id = 'participant-feedback-in-progress'")).toEqual([
      { state: 'In Progress', invitation_status: 'Sent', invitation_count: 2, invitation_sent_at: '2026-01-15 09:15:00', row_version: 2 },
    ]);
    database.close();
  });

  test('rejects missing email, completed state, and stale replay without mutation', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_participant_invitation_guards', ['schema', 'data']);
    const api = yaml('api/participants.yaml');
    const invite = action(api, 'send_survey_invitation');
    const resend = action(api, 'resend_survey_invitation');
    const beforeNoEmail = await repository.query("SELECT state, invitation_status, invitation_count, row_version FROM survey_participants WHERE id = 'participant-burger-no-email'");

    await expect(repository.executeMutation(invite.mutation, { id: 'participant-burger-no-email', expected_row_version: 1 })).rejects.toMatchObject({ status: 400, code: 'SURVEY_PARTICIPANT_INVITE_EMAIL_REQUIRED' });
    await expect(repository.executeMutation(resend.mutation, { id: 'participant-feedback', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'SURVEY_PARTICIPANT_RESEND_STATE' });
    await expect(repository.executeMutation(invite.mutation, { id: 'participant-burger-new', expected_row_version: 0 })).rejects.toMatchObject({ status: 409, code: 'SURVEY_PARTICIPANT_INVITE_STATE' });
    expect(await repository.query("SELECT state, invitation_status, invitation_count, row_version FROM survey_participants WHERE id = 'participant-burger-no-email'")).toEqual(beforeNoEmail);
    database.close();
  });

  test('retains invitation state and rejects a replay after a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-surveys-participant-invite-'));
    const databasePath = join(directory, 'surveys.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'surveys_participant_invitation_restart', ['schema', 'data']);
      const invite = action(yaml('api/participants.yaml'), 'send_survey_invitation');
      await firstRepository.executeMutation(invite.mutation, { id: 'participant-burger-new', expected_row_version: 1 });
      firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrateDatabase(reopenedRepository, join(root, 'migrations'), undefined, 'surveys_participant_invitation_restart', ['schema', 'data']);
      expect(await reopenedRepository.query("SELECT invitation_status, invitation_count, CAST(invitation_sent_at AS VARCHAR) AS invitation_sent_at, row_version FROM survey_participants WHERE id = 'participant-burger-new'")).toEqual([
        { invitation_status: 'Sent', invitation_count: 1, invitation_sent_at: '2026-01-15 09:10:00', row_version: 2 },
      ]);
      await expect(reopenedRepository.executeMutation(invite.mutation, { id: 'participant-burger-new', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'SURVEY_PARTICIPANT_INVITE_STATE' });
      expect(await reopenedRepository.query("SELECT invitation_count, row_version FROM survey_participants WHERE id = 'participant-burger-new'")).toEqual([{ invitation_count: 1, row_version: 2 }]);
      reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

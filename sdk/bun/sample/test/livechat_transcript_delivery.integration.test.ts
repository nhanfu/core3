import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any) => api.actions.find((candidate: any) => candidate.id === 'email_livechat_session_transcript');

describe('Live Chat transcript delivery action parity', () => {
  test('maps Odoo transcript sender to the existing session-detail page/API join', () => {
    const page = yaml('pages/session-detail.yaml');
    const api = yaml('api/session-detail.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/im_livechat/static/src/core/common/transcript_sender.js', 'utf8');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const transcript = action(api);

    expect(source).toContain('rpc("/im_livechat/email_livechat_transcript"');
    expect(page.page).toMatchObject({ id: 'livechat-session-detail', route: '/livechat-session-detail' });
    expect(api.page).toEqual({ id: page.page.id });
    expect(discovered.pageDatasources.get(page.page.id)).toContain('livechat_session_detail');
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'email_livechat_session_transcript', show_if: "record.status === 'Closed'" }));
    expect(transcript).toMatchObject({
      type: 'server_form', permission: 'livechat.write', action: '/im_livechat/email_livechat_transcript',
      operation: 'transcript', success_message: 'Conversation transcript queued for delivery.',
    });
    expect(transcript.fields).toContainEqual(expect.objectContaining({ field: 'email', type: 'email', required: true }));
    expect(transcript.mutation.concurrency).toEqual({ required: true });
    expect(transcript.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'LIVECHAT_SESSION_NOT_FOUND', status: 404 }),
      expect.objectContaining({ code: 'LIVECHAT_TRANSCRIPT_SESSION_OPEN', status: 409 }),
      expect.objectContaining({ code: 'LIVECHAT_TRANSCRIPT_EMAIL_INVALID', status: 422 }),
    ]));
  });

  test('queues only valid closed-session transcripts and preserves durable history', async () => {
    const db = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(db);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'livechat_transcript_delivery_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'livechat_transcript_delivery_test', ['schema', 'data']);
    const api = yaml('api/session-detail.yaml');
    const send = action(api);
    const before = await repository.querySource(api.datasources[0], { id: 'livechat-session-demo-001', fixture_state: null, view_scope: 'all' }, 0, 1);
    expect(before.data).toMatchObject({ status: 'Closed', transcript_last_sent_to: 'visitor.a@example.com' });
    expect(before.data.transcript_delivery_count).toBe(1);

    const queued = await repository.executeMutation(send.mutation, {
      id: 'livechat-session-demo-001', expected_row_version: before.data.row_version,
      current_user_id: 'livechat-agent', current_user_name: 'Live Chat Agent', view_scope: 'all',
      values: { email: 'visitor.b@example.com' },
    });
    expect(queued).toMatchObject({ recipient_email: 'visitor.b@example.com', state: 'Queued', message: 'Conversation transcript queued for delivery.' });
    const after = await repository.querySource(api.datasources[0], { id: 'livechat-session-demo-001', fixture_state: null, view_scope: 'all' }, 0, 1);
    expect(after.data).toMatchObject({ transcript_last_sent_to: 'visitor.b@example.com', transcript_delivery_count: 2, row_version: before.data.row_version + 1 });

    await expect(repository.executeMutation(send.mutation, {
      id: 'livechat-session-demo-001', expected_row_version: after.data.row_version,
      current_user_id: 'livechat-agent', view_scope: 'all', values: { email: 'invalid-email' },
    })).rejects.toMatchObject({ status: 422, code: 'LIVECHAT_TRANSCRIPT_EMAIL_INVALID' });
    await expect(repository.executeMutation(send.mutation, {
      id: 'livechat-session-demo-002', expected_row_version: 1,
      current_user_id: 'livechat-agent', view_scope: 'all', values: { email: 'visitor.b@example.com' },
    })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_TRANSCRIPT_SESSION_OPEN' });
    await expect(repository.executeMutation(send.mutation, {
      id: 'missing-livechat-session', expected_row_version: 1,
      current_user_id: 'livechat-agent', view_scope: 'all', values: { email: 'visitor.b@example.com' },
    })).rejects.toMatchObject({ status: 404, code: 'LIVECHAT_SESSION_NOT_FOUND' });
    await expect(repository.executeMutation(send.mutation, {
      id: 'livechat-session-demo-001', expected_row_version: after.data.row_version,
      current_user_id: 'other-livechat-agent', view_scope: 'assigned', values: { email: 'visitor.c@example.com' },
    })).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_SESSION_OUTSIDE_OPERATOR_SCOPE' });
    await expect(repository.executeMutation(send.mutation, {
      id: 'livechat-session-demo-001', expected_row_version: after.data.row_version,
      current_user_id: '', view_scope: 'all', values: { email: 'visitor.c@example.com' },
    })).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_TRANSCRIPT_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(send.mutation, {
      id: 'livechat-session-demo-001', expected_row_version: before.data.row_version,
      current_user_id: 'livechat-agent', view_scope: 'all', values: { email: 'visitor.c@example.com' },
    })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_TRANSCRIPT_STALE' });
    db.close();
  });

  test('retains transcript delivery state after a file-backed restart', async () => {
    const databasePath = `/tmp/core3-livechat-transcript-${crypto.randomUUID()}.duckdb`;
    const migrationName = `livechat_transcript_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const send = action(yaml('api/session-detail.yaml'));
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await firstRepository.executeMutation(send.mutation, {
      id: 'livechat-session-demo-001', expected_row_version: 1,
      current_user_id: 'livechat-agent', view_scope: 'all', values: { email: 'restart@example.com' },
    });
    first.close();

    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query('SELECT recipient_email, state FROM livechat_transcript_deliveries WHERE session_id = ? ORDER BY requested_at, id', ['livechat-session-demo-001']))
      .toEqual([
        { recipient_email: 'visitor.a@example.com', state: 'Queued' },
        { recipient_email: 'restart@example.com', state: 'Queued' },
      ]);
    second.close();
  });
});

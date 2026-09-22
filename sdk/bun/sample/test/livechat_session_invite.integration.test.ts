import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Live Chat Invite People parity', () => {
  test('traces the Odoo livechat action and joins the existing session page/API', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/im_livechat/static/src/core/common/thread_actions_patch.js', 'utf8');
    const invitation = readFileSync('/home/nhanjs/projects/odoo/addons/mail/static/src/discuss/core/common/channel_invitation.js', 'utf8');
    const page = yaml('pages/session-detail.yaml');
    const api = yaml('api/session-detail.yaml');
    expect(source).toContain('threadActionsRegistry.get("invite-people")');
    expect(source).toContain('!thread.livechat_end_dt');
    expect(invitation).toContain('this.orm.call("discuss.channel", "add_members"');
    expect(page.page).toMatchObject({ id: 'livechat-session-detail', route: '/livechat-session-detail' });
    expect(api.page).toEqual({ id: page.page.id });
    expect(api.datasources.map((candidate: any) => candidate.id)).toEqual(expect.arrayContaining(['livechat_session_detail', 'livechat_session_members', 'livechat_session_invite_options']));
    expect(action(api, 'invite_livechat_session_member')).toMatchObject({
      type: 'server_form', permission: 'livechat.write', action: 'discuss.channel.add_members', operation: 'invite_member',
    });
    expect(action(api, 'invite_livechat_session_member').fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'member_id', options_source: 'livechat_session_invite_options' }),
      expect.objectContaining({ field: 'expected_row_version', readonly: true }),
    ]));
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'invite_livechat_session_member', label: 'Invite People', permission: 'livechat.write' }));
    expect(page.components[1]).toMatchObject({ type: 'ListView', source: 'livechat_session_members' });
  });

  test('persists one invite, posts the Odoo-style notification, and guards state, scope, and duplicates', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'livechat_session_invite_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'livechat_session_invite_test', ['schema', 'data']);
    const api = yaml('api/session-detail.yaml');
    const invite = action(api, 'invite_livechat_session_member');
    const detail = api.datasources.find((candidate: any) => candidate.id === 'livechat_session_detail');
    expect(await repository.querySource(detail, { id: 'livechat-session-demo-002', fixture_state: null, view_scope: 'all', current_user_id: 'livechat-agent' }, 0, 1)).toMatchObject({ data: { member_count: 2, member_names: 'Support Agent, Visitor B' } });
    await expect(repository.executeMutation(invite.mutation, { id: 'missing-session', member_id: 'user-admin', expected_row_version: 1, current_user_id: 'livechat-agent' })).rejects.toMatchObject({ status: 404, code: 'LIVECHAT_SESSION_NOT_FOUND' });
    await expect(repository.executeMutation(invite.mutation, { id: 'livechat-session-scope-001', member_id: 'user-admin', expected_row_version: 1, current_user_id: 'livechat-agent', view_scope: 'assigned' })).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_SESSION_OUTSIDE_OPERATOR_SCOPE' });
    const created = await repository.executeMutation(invite.mutation, { id: 'livechat-session-demo-002', member_id: 'user-admin', expected_row_version: 1, current_user_id: 'livechat-agent', current_user_name: 'Support Agent' });
    expect(created).toMatchObject({ id: 'livechat-session-member-livechat-session-demo-002-user-admin', member_id: 'user-admin', member_name: 'Mitchell Admin', member_type: 'agent' });
    expect(await repository.query("SELECT member_name, invited_by FROM livechat_session_members WHERE session_id = 'livechat-session-demo-002' ORDER BY member_name")).toEqual([
      { member_name: 'Mitchell Admin', invited_by: 'livechat-agent' },
      { member_name: 'Support Agent', invited_by: '' },
      { member_name: 'Visitor B', invited_by: '' },
    ]);
    expect((await repository.query("SELECT action, action_label, body FROM livechat_session_messages WHERE id = 'livechat-session-invite-livechat-session-demo-002-user-admin'"))[0]).toMatchObject({ action: 'invite', action_label: 'Invite', body: 'invited Mitchell Admin to the conversation' });
    await expect(repository.executeMutation(invite.mutation, { id: 'livechat-session-demo-002', member_id: 'user-admin', expected_row_version: 2, current_user_id: 'livechat-agent' })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_MEMBER_ALREADY_INVITED' });
    await expect(repository.executeMutation(invite.mutation, { id: 'livechat-session-demo-002', member_id: 'user-disp', expected_row_version: 1, current_user_id: 'livechat-agent' })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_SESSION_INVITE_STALE' });
    await repository.run("UPDATE livechat_sessions SET status = 'Closed' WHERE id = 'livechat-session-demo-002'");
    await expect(repository.executeMutation(invite.mutation, { id: 'livechat-session-demo-002', member_id: 'user-disp', expected_row_version: 2, current_user_id: 'livechat-agent' })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_SESSION_INVITE_CLOSED' });
    database.close();
  });

  test('replays the durable member roster through a file-backed restart', async () => {
    const databasePath = `/tmp/core3-livechat-session-invite-${crypto.randomUUID()}.duckdb`;
    const migrationName = `livechat_session_invite_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let first: DuckDbDatabase | undefined;
    let second: DuckDbDatabase | undefined;
    try {
      first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const invite = action(yaml('api/session-detail.yaml'), 'invite_livechat_session_member');
      await firstRepository.executeMutation(invite.mutation, { id: 'livechat-session-demo-002', member_id: 'user-disp', expected_row_version: 1, current_user_id: 'livechat-agent' });
      first.close(); first = undefined;
      second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query("SELECT member_id, member_name FROM livechat_session_members WHERE session_id = 'livechat-session-demo-002' ORDER BY member_id")).toEqual([
        { member_id: 'livechat-agent', member_name: 'Support Agent' },
        { member_id: 'user-disp', member_name: 'Demo Operator' },
        { member_id: 'visitor-demo-b', member_name: 'Visitor B' },
      ]);
    } finally {
      second?.close();
      first?.close();
      rmSync(databasePath, { force: true });
    }
  });
});

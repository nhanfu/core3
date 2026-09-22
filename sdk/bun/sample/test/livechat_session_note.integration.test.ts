import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const sampleRoot = join(import.meta.dir, '..');
const serviceRoot = join(sampleRoot, 'services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (api: any) => api.actions.find((candidate: any) => candidate.id === 'update_livechat_session_note');

describe('Live Chat session note parity', () => {
  test('traces Odoo note route and joins the detail page/API contract', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/im_livechat/controllers/channel.py', 'utf8');
    const frontend = readFileSync('/home/nhanjs/projects/odoo/addons/im_livechat/static/src/core/web/livechat_channel_info_list.xml', 'utf8');
    const page = yaml('pages/session-detail.yaml');
    const api = yaml('api/session-detail.yaml');
    const discovered = discoverPages(sampleRoot);
    const note = action(api);

    expect(source).toContain('@route("/im_livechat/session/update_note", auth="user", methods=["POST"], type="jsonrpc")');
    expect(source).toContain('channel.sudo().livechat_note = Markup(note)');
    expect(frontend).toContain('placeholder="Add your notes here..."');
    expect(frontend).toContain('t-on-blur="onBlurNote"');
    expect(page.page).toMatchObject({ id: 'livechat-session-detail', route: '/livechat-session-detail' });
    expect(api.page).toEqual({ id: page.page.id });
    expect(discovered.pageDatasources.get(page.page.id)).toContain('livechat_session_detail');
    expect(page.components[0].fields).toContainEqual(expect.objectContaining({ field: 'livechat_note', label: 'Notes', type: 'textarea' }));
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'update_livechat_session_note', permission: 'livechat.write' }));
    expect(note).toMatchObject({ type: 'server_form', permission: 'livechat.write', action: '/im_livechat/session/update_note', operation: 'note' });
    expect(note.fields).toContainEqual(expect.objectContaining({ field: 'note', type: 'textarea', required: false }));
    expect(api.datasources[0].query).toContain('livechat_note');
  });

  test('persists markup-compatible notes, increments the version, and is idempotent', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'livechat_session_note_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'livechat_session_note_test', ['schema', 'data']);
    const api = yaml('api/session-detail.yaml');
    const detail = api.datasources[0];
    const save = action(api);
    const before = await repository.querySource(detail, { id: 'livechat-session-demo-001', fixture_state: null, view_scope: 'all' }, 0, 1);
    expect(before.data).toMatchObject({ livechat_note: 'Order follow-up requested.' });
    const saved = await repository.executeMutation(save.mutation, {
      id: 'livechat-session-demo-001', current_user_id: 'livechat-agent', view_scope: 'all',
      values: { note: '<p>Customer <strong>needs follow-up</strong>.</p>' },
    });
    expect(saved).toMatchObject({ id: 'livechat-session-demo-001', livechat_note: '<p>Customer <strong>needs follow-up</strong>.</p>', row_version: before.data.row_version + 1 });
    expect((await repository.query('SELECT livechat_note, row_version FROM livechat_sessions WHERE id = ?', ['livechat-session-demo-001']))[0])
      .toEqual({ livechat_note: '<p>Customer <strong>needs follow-up</strong>.</p>', row_version: before.data.row_version + 1 });
    const cleared = await repository.executeMutation(save.mutation, {
      id: 'livechat-session-demo-001', current_user_id: 'livechat-agent', view_scope: 'all', values: { note: '' },
    });
    expect(cleared).toMatchObject({ livechat_note: '' });
    await expect(repository.executeMutation(save.mutation, { id: 'missing-livechat-session', current_user_id: 'livechat-agent', view_scope: 'all', values: { note: 'No row' } }))
      .rejects.toMatchObject({ status: 404, code: 'LIVECHAT_SESSION_NOT_FOUND' });
    database.close();
  });

  test('enforces the existing operator scope without changing the row', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_session_note_scope_test', ['schema', 'data']);
    const save = action(yaml('api/session-detail.yaml'));
    const before = (await repository.query('SELECT livechat_note, row_version FROM livechat_sessions WHERE id = ?', ['livechat-session-demo-001']))[0];
    await expect(repository.executeMutation(save.mutation, {
      id: 'livechat-session-demo-001', current_user_id: 'other-livechat-agent', view_scope: 'assigned', values: { note: 'Should not save' },
    })).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_SESSION_OUTSIDE_OPERATOR_SCOPE' });
    expect((await repository.query('SELECT livechat_note, row_version FROM livechat_sessions WHERE id = ?', ['livechat-session-demo-001']))[0]).toEqual(before);
    database.close();
  });
});

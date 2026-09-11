import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/channels.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Live Chat channels parity', () => {
  test('keeps kanban/detail pages layout-only and joins API fragments by page.id', () => {
    const listPage = yaml('pages/channels.yaml');
    const detailPage = yaml('pages/channel-detail.yaml');
    const listApi = yaml('api/channels.yaml');
    const detailApi = yaml('api/channel-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(listPage.datasources).toBeUndefined();
    expect(listPage.actions).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listPage.page).toMatchObject({ id: 'livechat', route: '/livechat' });
    expect(detailPage.page).toMatchObject({ id: 'livechat-channel-detail', route: '/livechat/channel/detail' });
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(discovered.pageDatasources.get('livechat')).toContain('livechat_channels');
    expect(discovered.pageDatasources.get('livechat-channel-detail')).toContain('livechat_channel_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/livechat', page: 'livechat', module: 'livechat' }),
      expect.objectContaining({ path: '/livechat/channel/detail', page: 'livechat-channel-detail', module: 'livechat' }),
    ]));
  });

  test('seeds Odoo channel cards and supports search, empty, and detail states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(serviceRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'livechat_channels_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'livechat_channels_test_migrations', ['schema', 'data']);

    const source = yaml('api/channels.yaml').datasources[0];
    const rows = await repository.querySource(source, { q: null, fixture_state: null }, 0, 50);
    expect(rows.data.map((row: any) => row.name)).toEqual(['Support', 'YourWebsite.com']);
    expect(rows.data.find((row: any) => row.name === 'YourWebsite.com')).toMatchObject({
      session_count: 18, rating_percentage: 81, joined: true, session_summary: '18 Sessions', rating_summary: '81% Happy', join_label: 'Leave',
    });
    expect(rows.data.find((row: any) => row.name === 'Support')).toMatchObject({ session_count: 7, rating_percentage: 50, joined: false, join_label: 'Join' });
    expect((await repository.querySource(source, { q: 'missing', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const detail = yaml('api/channel-detail.yaml').datasources[0];
    expect(await repository.querySource(detail, { id: 'livechat-channel-demo-002', fixture_state: null }, 0, 1)).toMatchObject({ data: { name: 'YourWebsite.com', operator_names: 'Marc Demo, Mitchell Admin' } });
    expect(await repository.querySource(detail, { id: 'missing-livechat-channel', fixture_state: 'not_found' }, 0, 1)).toMatchObject({ data: {} });
    database.close();
  });

  test('covers manager editing, join/leave workflow, optimistic guards, and error boundaries', () => {
    const page = yaml('pages/channels.yaml');
    const detail = yaml('pages/channel-detail.yaml');
    const api = yaml('api/channels.yaml');
    expect(page.components[0].views.map((view: any) => view.label)).toEqual(['Kanban', 'Form']);
    expect(page.components[0].views[0].id).toBe('card');
    expect(page.components[0].row_open_action).toBe('view_livechat_channel');
    expect(detail.components[0].notebook.tabs.map((tab: any) => tab.label)).toEqual(['Agents', 'Options', 'Rules', 'Widget']);
    expect(api.datasources[0]).toMatchObject({ permission: 'livechat.read', error_states: { transport_error: { status: 503, code: 'LIVECHAT_CHANNELS_UNAVAILABLE' } } });
    for (const id of ['edit_livechat_channel', 'create_livechat_channel']) expect(action(id).permission, id).toBe('livechat.manage');
    for (const id of ['join_livechat_channel', 'leave_livechat_channel']) {
      expect(action(id).permission, id).toBe('livechat.write');
      expect(action(id).mutation.concurrency.required, id).toBe(true);
      expect(action(id).mutation.guards.length, id).toBeGreaterThanOrEqual(2);
    }
    expect(action('edit_livechat_channel').mutation.guards).toEqual(expect.arrayContaining([expect.objectContaining({ status: 404 }), expect.objectContaining({ status: 409 })]));
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['livechat.read', 'livechat.write', 'livechat.manage']));
  });

  test('executes deterministic channel configuration and join/leave mutations', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_channels_mutation_test_migrations', ['schema', 'data']);

    const joinAction = action('join_livechat_channel');
    const joined = await repository.executeMutation(joinAction.mutation, { id: 'livechat-channel-demo-001', expected_row_version: 1, values: { joined: true } });
    expect(joined).toMatchObject({ id: 'livechat-channel-demo-001', joined: true, row_version: 2 });
    await expect(repository.executeMutation(joinAction.mutation, { id: 'livechat-channel-demo-001', expected_row_version: 2, values: { joined: true } }))
      .rejects.toMatchObject({ status: 409, code: 'LIVECHAT_CHANNEL_ALREADY_JOINED' });

    const leaveAction = action('leave_livechat_channel');
    const left = await repository.executeMutation(leaveAction.mutation, { id: 'livechat-channel-demo-001', expected_row_version: 2, values: { joined: false } });
    expect(left).toMatchObject({ id: 'livechat-channel-demo-001', joined: false, row_version: 3 });
    await expect(repository.executeMutation(leaveAction.mutation, { id: 'livechat-channel-demo-001', expected_row_version: 2, values: { joined: false } }))
      .rejects.toMatchObject({ status: 409, code: 'LIVECHAT_CHANNEL_ALREADY_LEFT' });

    const editAction = action('edit_livechat_channel');
    const edited = await repository.executeMutation(editAction.mutation, { id: 'livechat-channel-demo-001', expected_row_version: 3, values: { name: 'Support Desk', welcome_message: 'Welcome to support.' } });
    expect(edited).toMatchObject({ name: 'Support Desk', welcome_message: 'Welcome to support.', row_version: 4 });
    await expect(repository.executeMutation(editAction.mutation, { id: 'livechat-channel-demo-001', expected_row_version: 3, values: { name: 'Stale Support' } }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    database.close();
  });
});

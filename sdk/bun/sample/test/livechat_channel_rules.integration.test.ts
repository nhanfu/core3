import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPages, discoverPageRoutes } from '@core3/server/discovery';
const root = join(import.meta.dir, '../services/livechat');
const yaml = (f: string) => Bun.YAML.parse(readFileSync(join(root, f), 'utf8')) as any;
describe('Live Chat channel rules parity', () => {
  test('joins page/API fragments and preserves Odoo rule fields', () => {
    const page = yaml('pages/channel-detail.yaml'); const api = yaml('api/channel-detail.yaml'); const detail = yaml('pages/channel-rule-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(api.page.id).toBe(page.page.id); expect(yaml('api/channel-rule-detail.yaml').page.id).toBe(detail.page.id);
    expect(api.datasources.map((x: any) => x.id)).toContain('livechat_channel_rules');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([expect.objectContaining({ path: '/livechat/channel/rules/detail', page: 'livechat-channel-rule-detail' })]));
    expect(page.components.find((x: any) => x.source === 'livechat_channel_rules')).toMatchObject({ type: 'LineItemGrid', parent_source: 'livechat_channel_detail' });
    expect(yaml('api/channel-rule-detail.yaml').actions.find((x: any) => x.id === 'edit_livechat_channel_rule_detail').permission).toBe('livechat.manage');
  });
  test('seeds ordered rules and supports empty/search-like fixture boundaries', async () => {
    const db = await DuckDbDatabase.open(':memory:'); const repo = new YamlRepository(db); const migrations = join(root, 'migrations');
    await migrateDatabase(repo, migrations, undefined, 'livechat_channel_rules_test', ['schema', 'data']); await migrateDatabase(repo, migrations, undefined, 'livechat_channel_rules_test', ['schema', 'data']);
    const source = yaml('api/channel-detail.yaml').datasources.find((x: any) => x.id === 'livechat_channel_rules');
    expect((await repo.querySource(source, { id: 'livechat-channel-demo-002', fixture_state: null }, 0, 10)).data.map((x: any) => x.sequence)).toEqual([10, 20]);
    expect((await repo.querySource(source, { id: 'livechat-channel-demo-002', fixture_state: 'empty' }, 0, 10)).data).toEqual([]); db.close();
  });
  test('executes manager CRUD and exposes optimistic and validation boundaries', async () => {
    const api = yaml('api/channel-detail.yaml'); const add = api.actions.find((x: any) => x.id === 'add_livechat_channel_rule'); const remove = api.actions.find((x: any) => x.id === 'delete_livechat_channel_rule');
    expect(add.permission).toBe('livechat.manage'); expect(add.mutation.guards).toEqual(expect.arrayContaining([expect.objectContaining({ status: 404 }), expect.objectContaining({ status: 422 })])); expect(remove.mutation.concurrency.required).toBe(true); expect(remove.mutation.guards[0].status).toBe(409);
    const db = await DuckDbDatabase.open(':memory:'); const repo = new YamlRepository(db); await migrateDatabase(repo, join(root, 'migrations'), undefined, 'livechat_channel_rules_mutation_test', ['schema', 'data']);
    const created = await repo.executeMutation(add.mutation, { id: 'livechat-channel-demo-002', line_id: 'livechat-rule-test-001', values: { sequence: 30, action: 'hide_button', regex_url: '/private' } });
    expect(created).toMatchObject({ id: 'livechat-rule-test-001', channel_id: 'livechat-channel-demo-002', sequence: 30, action: 'hide_button', row_version: 1 });
    await expect(repo.executeMutation(add.mutation, { id: 'livechat-channel-demo-002', line_id: 'livechat-rule-test-002', values: { sequence: 0, action: 'hide_button' } })).rejects.toMatchObject({ status: 422, code: 'LIVECHAT_RULE_SEQUENCE_INVALID' });
    await expect(repo.executeMutation(remove.mutation, { id: 'livechat-channel-demo-002', line_id: 'livechat-rule-test-001', expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_RULE_STALE' }); db.close();
  });
});

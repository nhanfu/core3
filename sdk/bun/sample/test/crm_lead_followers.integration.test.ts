import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

const users = new Map([
  ['user-admin', { id: 'user-admin', name: 'Admin User', email: 'admin@tms.local', avatar_url: null }],
  ['user-disp', { id: 'user-disp', name: 'Dispatcher User', email: 'dispatcher@tms.local', avatar_url: null }],
]);

const authService = {
  async call(operation: string, request: Record<string, unknown>) {
    if (operation === 'users.validate') return users.get(String(request.user_id)) || null;
    if (operation === 'users.resolve') {
      return { users: String(request.user_ids || '').split(',').map((id) => users.get(id)).filter(Boolean) };
    }
    throw new Error(`Unexpected auth operation: ${operation}`);
  },
};

const action = (api: any, id: string) => api.actions.find((entry: any) => entry.id === id);

describe('CRM lead followers Odoo chatter parity', () => {
  test('keeps the follower controls in the separate lead-detail page/API contract', () => {
    const page = yaml('pages/lead-detail.yaml');
    const api = yaml('api/lead-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');

    expect(api.page).toEqual({ id: 'lead-detail' });
    expect(() => validatePageDefinition({ ...page, actions: [...(api.actions || []), ...(page.actions || [])] }, { allowExternalSources: true })).not.toThrow();
    expect(form).toMatchObject({
      follower_source: 'crm_lead_followers_list',
      follower_candidates_source: 'crm_lead_follower_candidates',
      follower_add_action: 'add_lead_follower',
      follower_remove_action: 'remove_lead_follower',
      add_follower_label: 'Add Followers',
    });
    expect(api.datasources.map((entry: any) => entry.id)).toEqual(expect.arrayContaining([
      'crm_lead_followers_list', 'crm_lead_follower_candidates', 'crm_lead_timeline',
    ]));
    expect(action(api, 'add_lead_follower')).toMatchObject({ action: 'crm.followers.add', permission: 'crm.write' });
    expect(action(api, 'remove_lead_follower')).toMatchObject({ action: 'crm.followers.remove', permission: 'crm.write' });
  });

  test('adds/removes followers idempotently and preserves the audit trail across restart', async () => {
    const databasePath = `/tmp/core3-crm-lead-followers-${crypto.randomUUID()}.duckdb`;
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database, (serviceName: string) => serviceName === 'auth' ? authService : undefined);
    const api = yaml('api/lead-detail.yaml');
    const add = action(api, 'add_lead_follower');
    const remove = action(api, 'remove_lead_follower');

    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_lead_followers_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_lead_followers_migrations', ['schema', 'data']);

    const input = { id: 'crm-demo-001', user_id: 'user-disp', current_user_id: 'user-admin', current_user_name: 'Admin User' };
    await expect(repository.executeMutation(add.mutation, input)).resolves.toMatchObject({ user_id: 'user-disp', removed: false });
    await expect(repository.executeMutation(add.mutation, input)).resolves.toMatchObject({ user_id: 'user-disp', removed: false });
    expect(await repository.query("SELECT lead_id, user_id, added_by FROM crm_lead_followers WHERE lead_id = 'crm-demo-001'"))
      .toEqual([{ lead_id: 'crm-demo-001', user_id: 'user-disp', added_by: 'user-admin' }]);
    expect(await repository.query("SELECT action, detail FROM crm_activity_log WHERE resource_id = 'crm-demo-001' AND action = 'crm.followers.add'"))
      .toEqual([{ action: 'crm.followers.add', detail: 'user-disp' }]);

    const followers = api.datasources.find((source: any) => source.id === 'crm_lead_followers_list');
    expect((await repository.querySource(followers, { id: 'crm-demo-001' })).data)
      .toEqual([expect.objectContaining({ user_id: 'user-disp', name: 'Dispatcher User', email: 'dispatcher@tms.local' })]);

    await expect(repository.executeMutation(remove.mutation, input)).resolves.toMatchObject({ user_id: 'user-disp', removed: true });
    await expect(repository.executeMutation(remove.mutation, input)).resolves.toMatchObject({ user_id: 'user-disp', removed: true });
    expect(await repository.query("SELECT * FROM crm_lead_followers WHERE lead_id = 'crm-demo-001' AND user_id = 'user-disp'"))
      .toEqual([]);
    expect(await repository.query("SELECT action, detail FROM crm_activity_log WHERE resource_id = 'crm-demo-001' AND action = 'crm.followers.remove'"))
      .toEqual([{ action: 'crm.followers.remove', detail: 'user-disp' }]);

    await expect(repository.executeMutation(add.mutation, { ...input, user_id: 'missing-user' })).rejects.toMatchObject({ status: 404, message: 'Follower not found' });
    await expect(repository.executeMutation(add.mutation, { ...input, id: 'missing-lead' })).rejects.toMatchObject({ status: 404, message: 'Opportunity not found' });

    await repository.executeMutation(add.mutation, input);
    database.close();

    const restartedDatabase = await DuckDbDatabase.open(databasePath);
    const restartedRepository = new YamlRepository(restartedDatabase, (serviceName: string) => serviceName === 'auth' ? authService : undefined);
    await migrateDatabase(restartedRepository, join(root, 'migrations'), undefined, 'crm_lead_followers_migrations', ['schema', 'data']);
    expect(await restartedRepository.query("SELECT lead_id, user_id, added_by FROM crm_lead_followers WHERE lead_id = 'crm-demo-001'"))
      .toEqual([{ lead_id: 'crm-demo-001', user_id: 'user-disp', added_by: 'user-admin' }]);
    expect(await restartedRepository.query("SELECT COUNT(*) AS count FROM crm_activity_log WHERE resource_id = 'crm-demo-001' AND action = 'crm.followers.add'"))
      .toEqual([{ count: 2 }]);
    restartedDatabase.close();
    rmSync(databasePath, { force: true });
  });
});

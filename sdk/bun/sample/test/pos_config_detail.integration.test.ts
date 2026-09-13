import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS configuration detail edit parity', () => {
  test('joins the editable page and API contract with manager-only update', () => {
    const page = yaml('pages/pos-config-detail.yaml');
    const api = yaml('api/pos-config-detail.yaml');
    const form = page.components[0];
    const edit = api.actions.find((candidate: any) => candidate.id === 'edit_pos_config');

    expect(api.page.id).toBe(page.page.id);
    expect(form).toMatchObject({ source: 'pos_config_detail', editable: true });
    expect(form.header_actions).toEqual(expect.arrayContaining([{ id: 'edit_pos_config', label: 'Edit', variant: 'secondary', permission: 'pos.manage' }]));
    expect(api.datasources[0]).toMatchObject({ id: 'pos_config_detail', permission: 'pos.read', single: true });
    expect(edit).toMatchObject({ type: 'server_form', permission: 'pos.manage', operation: 'update', handler: 'yaml_mutation' });
    expect(edit.mutation).toMatchObject({ table: 'pos_configs', concurrency: { required: true } });
    expect(edit.prefill).toBe('state.pos_config_detail');
  });

  test('persists valid edits and rejects missing, duplicate, stale, and unknown configurations', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_config_detail_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_config_detail_test_migrations', ['schema', 'data']);
    const api = yaml('api/pos-config-detail.yaml');
    const source = api.datasources[0];
    const edit = api.actions.find((candidate: any) => candidate.id === 'edit_pos_config');

    expect((await repository.querySource(source, { id: 'pos-config-restaurant', fixture_state: null }, 0, 1)).data)
      .toMatchObject({ name: 'Restaurant', row_version: 1 });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'pos-config-restaurant', expected_row_version: 1, values: { name: '   ', currency: 'USD' },
    })).rejects.toMatchObject({ status: 422, code: 'POS_CONFIG_NAME_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'pos-config-restaurant', expected_row_version: 1, values: { name: 'missing', currency: '' },
    })).rejects.toMatchObject({ status: 422, code: 'POS_CONFIG_CURRENCY_REQUIRED' });
    const create = yaml('api/pos-configs.yaml').actions.find((candidate: any) => candidate.id === 'create_pos_config');
    await repository.executeMutation(create.mutation, {
      id: 'pos-config-evening', values: { name: 'Evening Shop', currency: 'USD' },
    });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'pos-config-main', expected_row_version: 1, values: { name: 'Evening Shop', currency: 'USD' },
    })).rejects.toMatchObject({ status: 409, code: 'POS_CONFIG_NAME_EXISTS' });

    const changed = await repository.executeMutation(edit.mutation, {
      id: 'pos-config-restaurant', expected_row_version: 1,
      values: { name: 'Main Shop Evening', company: 'YShip Demo Company', currency: 'EUR', receipt_header: 'Welcome', receipt_footer: 'See you', active: true },
    });
    expect(changed).toMatchObject({ id: 'pos-config-restaurant', name: 'Main Shop Evening', currency: 'EUR', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'pos-config-restaurant', expected_row_version: 1, values: { name: 'Stale', currency: 'USD' },
    })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(edit.mutation, {
      id: 'missing-config', expected_row_version: 1, values: { name: 'Missing', currency: 'USD' },
    })).rejects.toMatchObject({ status: 404, code: 'POS_CONFIG_NOT_FOUND' });
    database.close();
  });
});

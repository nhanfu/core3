import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('POS Note Models action 743 parity', () => {
  test('matches the live Odoo list and keeps page/API ownership separate', () => {
    const page = yaml('pages/pos-note-models.yaml');
    const api = yaml('api/pos-note-models.yaml');
    const list = page.components[0];
    expect(page.title).toBe('Note Models');
    expect(page.page.id).toBe('pos-note-models');
    expect(api.page.id).toBe(page.page.id);
    expect(list.columns.map((column: any) => column.label)).toEqual([' ', 'Name', 'Color']);
    expect(list.inline_edit).toMatchObject({ create_action: 'create_pos_note_model_inline', update_action: 'update_pos_note_model_inline', save_label: 'Save', discard_label: 'Discard' });
    expect(api.datasources[0].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
  });

  test('seeds deterministic rows and covers filtered, empty, invalid, duplicate, and stale states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_note_models_inline', ['schema', 'data']);
    const api = yaml('api/pos-note-models.yaml');
    const source = api.datasources[0];
    expect((await repository.querySource(source, { q: null }, 0, 50)).data).toEqual([
      expect.objectContaining({ id: 'pos-note-allergy', sequence: 10, name: 'Allergy warning', color: 2, row_version: 1 }),
      expect.objectContaining({ id: 'pos-note-cutlery', sequence: 20, name: 'Cutlery', color: 5, row_version: 1 }),
      expect.objectContaining({ id: 'pos-note-no-onion', sequence: 30, name: 'No onion', color: 7, row_version: 1 }),
    ]);
    expect((await repository.querySource(source, { q: 'allergy' }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(source, { q: 'missing' }, 0, 50)).data).toEqual([]);
    const update = action(api, 'update_pos_note_model_inline');
    const create = action(api, 'create_pos_note_model_inline');
    expect(create.permission).toBe('pos.manage');
    expect(update.permission).toBe('pos.manage');
    const created = await repository.executeMutation(create.mutation, { values: { sequence: 40, name: 'Extra sauce', color: 9 } });
    expect(created).toMatchObject({ id: 'pos-note-custom-extra-sauce', sequence: 40, name: 'Extra sauce', color: 9, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { sequence: 50, name: 'Cutlery', color: 1 } })).rejects.toMatchObject({ status: 409, code: 'POS_NOTE_MODEL_EXISTS' });
    await expect(repository.executeMutation(update.mutation, { id: 'pos-note-allergy', expected_row_version: 1, values: { sequence: 10, name: '', color: 2 } })).rejects.toMatchObject({ status: 422, code: 'POS_NOTE_MODEL_NAME_REQUIRED' });
    await expect(repository.executeMutation(update.mutation, { id: 'pos-note-allergy', expected_row_version: 1, values: { sequence: 10, name: 'Cutlery', color: 2 } })).rejects.toMatchObject({ status: 409, code: 'POS_NOTE_MODEL_EXISTS' });
    const edited = await repository.executeMutation(update.mutation, { id: 'pos-note-allergy', expected_row_version: 1, values: { sequence: 5, name: 'Allergy alert', color: 3 } });
    expect(edited).toMatchObject({ id: 'pos-note-allergy', sequence: 5, name: 'Allergy alert', color: 3, row_version: 2 });
    await expect(repository.executeMutation(update.mutation, { id: 'pos-note-allergy', expected_row_version: 1, values: { sequence: 5, name: 'Stale', color: 3 } })).rejects.toMatchObject({ status: 409 });
    database.close();
  });
});

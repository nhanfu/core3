import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const migrations = join(import.meta.dir, '../services/manufacturing/migrations');

describe('Manufacturing migration replay', () => {
  test('replays deterministic fixtures without deleting existing manufacturing rows', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);

    await migrateDatabase(repository, migrations, undefined, 'manufacturing_migration_replay_a', ['schema', 'data']);
    await repository.run(`
      INSERT INTO mrp_productions (id, name, product_name, quantity, state)
      VALUES ('mo-existing-001', 'MO/EXISTING/001', 'Existing product', 2, 'Draft');
      INSERT INTO mrp_workorders (id, production_id, name, workcenter, sequence, expected_duration, state)
      VALUES ('wo-existing-001', 'mo-existing-001', 'Existing operation', 'Assembly 1', 10, 20, 'Waiting');
      INSERT INTO mrp_production_moves (id, production_id, sequence, move_type, product_name, quantity, state)
      VALUES ('move-existing-001', 'mo-existing-001', 10, 'Raw material', 'Existing component', 2, 'Waiting');
    `);

    const before = await Promise.all([
      repository.query('SELECT COUNT(*) AS count FROM mrp_productions'),
      repository.query('SELECT COUNT(*) AS count FROM mrp_workorders'),
      repository.query('SELECT COUNT(*) AS count FROM mrp_production_moves'),
    ]);

    await migrateDatabase(repository, migrations, undefined, 'manufacturing_migration_replay_b', ['schema', 'data']);

    expect(await repository.query("SELECT id FROM mrp_productions WHERE id = 'mo-existing-001'")).toHaveLength(1);
    expect(await repository.query("SELECT id FROM mrp_workorders WHERE id = 'wo-existing-001'")).toHaveLength(1);
    expect(await repository.query("SELECT id FROM mrp_production_moves WHERE id = 'move-existing-001'")).toHaveLength(1);
    expect(await repository.query("SELECT id FROM mrp_productions WHERE id = 'mo-draft-001'")).toHaveLength(1);
    expect(await repository.query("SELECT id FROM mrp_workorders WHERE id = 'wo-progress-001'")).toHaveLength(1);
    expect(await repository.query("SELECT id FROM mrp_production_moves WHERE id = 'move-progress-raw'")).toHaveLength(1);

    const after = await Promise.all([
      repository.query('SELECT COUNT(*) AS count FROM mrp_productions'),
      repository.query('SELECT COUNT(*) AS count FROM mrp_workorders'),
      repository.query('SELECT COUNT(*) AS count FROM mrp_production_moves'),
    ]);
    expect(after.map(([row]) => Number(row.count))).toEqual(before.map(([row]) => Number(row.count)));
    database.close();
  });
});

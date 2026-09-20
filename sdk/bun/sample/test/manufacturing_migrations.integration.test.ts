import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { readFileSync, rmSync } from 'node:fs';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const migrations = join(import.meta.dir, '../services/manufacturing/migrations');
const serviceRoot = join(import.meta.dir, '../services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

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

  test('preserves production and work-order workflow state across file-backed restart and migration replay', async () => {
    const databasePath = `/tmp/core3-manufacturing-restart-${crypto.randomUUID()}.duckdb`;
    const firstMigrationTable = `manufacturing_restart_a_${crypto.randomUUID().replaceAll('-', '_')}`;
    const secondMigrationTable = `manufacturing_restart_b_${crypto.randomUUID().replaceAll('-', '_')}`;
    const productionWorkflow = yaml('pages/manufacturing-workflow.yaml').workflow;
    const workorderWorkflow = yaml('pages/workorder-workflow.yaml').workflow;
    const productionConfirm = productionWorkflow.transitions.find((transition: any) => transition.id === 'confirm');
    const workorderPlan = workorderWorkflow.transitions.find((transition: any) => transition.id === 'plan');

    try {
      const first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, migrations, undefined, firstMigrationTable, ['schema', 'data']);
      expect(await firstRepository.executeMutation(productionConfirm.mutation, { id: 'mo-draft-001' }))
        .toMatchObject({ id: 'mo-draft-001', state: 'Confirmed', row_version: 2 });
      expect(await firstRepository.executeMutation(workorderPlan.mutation, { id: 'wo-blocked-001', expected_row_version: 1 }))
        .toMatchObject({ id: 'wo-blocked-001', state: 'Ready', row_version: 2 });
      first.close();

      const second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, migrations, undefined, secondMigrationTable, ['schema', 'data']);

      expect(await secondRepository.query("SELECT state, row_version FROM mrp_productions WHERE id = 'mo-draft-001'"))
        .toEqual([{ state: 'Confirmed', row_version: 2 }]);
      expect(await secondRepository.query("SELECT state, row_version FROM mrp_workorders WHERE id = 'wo-blocked-001'"))
        .toEqual([{ state: 'Ready', row_version: 2 }]);
      expect(await secondRepository.query("SELECT COUNT(*) AS count FROM mrp_productions WHERE id = 'mo-draft-001'"))
        .toEqual([{ count: 1 }]);
      expect(await secondRepository.query("SELECT COUNT(*) AS count FROM mrp_workorders WHERE id = 'wo-blocked-001'"))
        .toEqual([{ count: 1 }]);
      second.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});

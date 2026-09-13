import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const migrations = join(import.meta.dir, '../services/surveys/migrations');

describe('Surveys migration replay and rollback', () => {
  test('rolls back 0.0.17 to 0.0.16 without losing responses or earlier indexes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const table = 'surveys_migration_rollback';

    await migrateDatabase(repository, migrations, undefined, table, ['schema', 'data']);
    await repository.run("INSERT INTO survey_responses(id, survey_id, survey_name, answer_data, state) VALUES ('rollback-response', 'survey-demo-feedback', 'Feedback Form', '{\"answer\":\"kept\"}', 'Submitted')");
    const before = await repository.query("SELECT id, answer_data, state FROM survey_responses WHERE id = 'rollback-response'");

    await migrateDatabase(repository, migrations, '0.0.16', table, ['schema', 'data']);

    expect(await repository.query(`SELECT version FROM ${table} WHERE version = '0.0.17'`)).toEqual([]);
    expect(await repository.query("SELECT id, answer_data, state FROM survey_responses WHERE id = 'rollback-response'")).toEqual(before);
    expect(await repository.query("SELECT index_name FROM duckdb_indexes() WHERE index_name = 'survey_responses_access_token_idx'")).toHaveLength(1);

    database.close();
  });

  test('upgrades after rollback and replay remains stable', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const table = 'surveys_migration_replay';

    await migrateDatabase(repository, migrations, undefined, table, ['schema', 'data']);
    await migrateDatabase(repository, migrations, '0.0.16', table, ['schema', 'data']);
    const before = await repository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE survey_id = 'survey-demo-feedback'");
    await migrateDatabase(repository, migrations, undefined, table, ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, table, ['schema', 'data']);

    expect(await repository.query(`SELECT version FROM ${table} ORDER BY version`)).toHaveLength(17);
    expect(await repository.query("SELECT COUNT(*) AS count FROM survey_responses WHERE survey_id = 'survey-demo-feedback'")).toEqual(before);
    expect(await repository.query('SELECT idempotency_key FROM survey_responses WHERE id = \'print-response-survey-demo-feedback\'')).toEqual([{ idempotency_key: null }]);

    database.close();
  });
});

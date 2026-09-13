import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPages } from '@core3/server/discovery';
import { discoverMigrations, migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

function action(page: any, id: string) {
  return page.actions.find((candidate: any) => candidate.id === id);
}

describe('Accounting payment terms configuration', () => {
  it('binds the page, API, manager-only CRUD, and company boundary', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('pages/payment-terms.yaml');
    const source = yaml('api/config-payment-terms.yaml').datasources[0];
    expect(discovered.pages.has('payment-terms')).toBe(true);
    expect(discovered.pageDatasources.get('payment-terms')).toContain('accounting_payment_terms');
    expect(source.query).toContain('current_company_name');
    expect(source.query).toContain('company_name = :current_company_name');
    for (const id of ['create_accounting_payment_term', 'edit_accounting_payment_term', 'archive_accounting_payment_term', 'delete_accounting_payment_term']) {
      expect(action(page, id).permission).toBe('accounting.manage');
    }
  });

  it('supports CRUD while rejecting blank, duplicate, wrong-company, stale, and missing mutations atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE auth_companies(id VARCHAR PRIMARY KEY, name VARCHAR NOT NULL);
      CREATE TABLE users(id VARCHAR PRIMARY KEY, current_company_id VARCHAR);
      CREATE TABLE accounting_config_payment_terms(
        id VARCHAR PRIMARY KEY, row_version BIGINT NOT NULL DEFAULT 1,
        name VARCHAR NOT NULL, description VARCHAR, state VARCHAR NOT NULL DEFAULT 'Active',
        company_name VARCHAR NOT NULL
      );
      INSERT INTO auth_companies VALUES ('company-demo', 'Core3 Demo Company'), ('company-vietnam', 'Core3 Vietnam Branch');
      INSERT INTO users VALUES ('manager-demo', 'company-demo'), ('manager-vietnam', 'company-vietnam');
      INSERT INTO accounting_config_payment_terms VALUES
        ('immediate', 1, 'Immediate Payment', 'Due on receipt', 'Active', 'Core3 Demo Company'),
        ('vn-net15', 1, 'Net 15', '15 days', 'Active', 'Core3 Vietnam Branch');
    `);
    const page = yaml('pages/payment-terms.yaml');
    const create = action(page, 'create_accounting_payment_term').mutation;
    const edit = action(page, 'edit_accounting_payment_term').mutation;
    const archive = action(page, 'archive_accounting_payment_term').mutation;
    const remove = action(page, 'delete_accounting_payment_term').mutation;
    const context = { current_user_id: 'manager-demo', current_company_name: 'Core3 Demo Company' };

    const created = await repository.executeMutation(create, { ...context, values: { name: 'Net 45', description: '45 days', state: 'Active' } });
    expect(created.name).toBe('Net 45');
    expect(created.company_name).toBe('Core3 Demo Company');
    expect((await repository.query('SELECT COUNT(*) AS count FROM accounting_config_payment_terms WHERE company_name = \'Core3 Demo Company\''))[0].count).toBe(2);

    await expect(repository.executeMutation(create, { ...context, values: { name: ' immediate payment ' } })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(create, { ...context, values: { name: '   ' } })).rejects.toMatchObject({ status: 400 });
    expect((await repository.query("SELECT COUNT(*) AS count FROM accounting_config_payment_terms WHERE name = '   '"))[0].count).toBe(0);

    await expect(repository.executeMutation(edit, { ...context, id: 'vn-net15', values: { id: 'vn-net15', name: 'Spoofed', expected_row_version: 1 } })).rejects.toMatchObject({ status: 404 });
    expect((await repository.query("SELECT name FROM accounting_config_payment_terms WHERE id = 'vn-net15'"))[0].name).toBe('Net 15');
    await expect(repository.executeMutation(edit, { ...context, id: 'immediate', values: { name: 'Immediate Payment', expected_row_version: 9 } })).rejects.toMatchObject({ status: 409 });
    expect((await repository.query("SELECT row_version FROM accounting_config_payment_terms WHERE id = 'immediate'"))[0].row_version).toBe(1);

    await repository.executeMutation(edit, { ...context, id: 'immediate', values: { name: 'Immediate Payment Updated', description: 'On receipt', state: 'Active', expected_row_version: 1 } });
    await repository.executeMutation(archive, { ...context, id: 'immediate', values: { state: 'Archived', expected_row_version: 2 } });
    expect((await repository.query("SELECT state, row_version FROM accounting_config_payment_terms WHERE id = 'immediate'"))[0]).toMatchObject({ state: 'Archived', row_version: 3 });
    await repository.executeMutation(remove, { ...context, id: 'immediate', values: { expected_row_version: 3 } });
    expect((await repository.query("SELECT COUNT(*) AS count FROM accounting_config_payment_terms WHERE id = 'immediate'"))[0].count).toBe(0);
    await expect(repository.executeMutation(remove, { ...context, id: 'does-not-exist', values: { expected_row_version: 1 } })).rejects.toMatchObject({ status: 404 });
  });

  it('uses the filename order for the company-scope migration and replays startup cleanly', async () => {
    const migrationsRoot = join(root, 'migrations');
    const migrations = discoverMigrations(migrationsRoot);
    const paymentTermsMigration = migrations.find((migration) => migration.file === '20260913194000-010-payment-terms-company-scope.yaml');

    expect(paymentTermsMigration?.version).toBe('0.0.10');
    expect(paymentTermsMigration?.legacyOrder).toBe(10);
    expect(migrations.map((migration) => migration.version)).toEqual([
      '0.0.1', '0.0.2', '0.0.3', '0.0.4', '0.0.5',
      '0.0.6', '0.0.7', '0.0.8', '0.0.9', '0.0.10',
    ]);

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrationsRoot, undefined, 'accounting_config_test_schema_migrations');
    await migrateDatabase(repository, migrationsRoot, undefined, 'accounting_config_test_schema_migrations');

    expect((await repository.query(
      'SELECT version FROM accounting_config_test_schema_migrations',
    )).map((row) => row.version).sort((left, right) => {
      const [leftMajor, leftMinor, leftPatch] = String(left).split('.').map(Number);
      const [rightMajor, rightMinor, rightPatch] = String(right).split('.').map(Number);
      return leftMajor - rightMajor || leftMinor - rightMinor || leftPatch - rightPatch;
    })).toEqual([
      '0.0.1', '0.0.2', '0.0.3', '0.0.4', '0.0.5',
      '0.0.6', '0.0.7', '0.0.8', '0.0.9', '0.0.10',
    ]);
    expect((await repository.query(
      "SELECT company_name FROM accounting_config_payment_terms WHERE id = 'vn-net15'",
    ))[0].company_name).toBe('Core3 Vietnam Branch');
  });
});

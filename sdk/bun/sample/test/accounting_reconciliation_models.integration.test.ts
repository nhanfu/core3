import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Accounting Reconciliation Models parity', () => {
  test('joins list and detail layouts to page-owned APIs', () => {
    const page = yaml('pages/reconciliation-models.yaml');
    const detailPage = yaml('pages/reconciliation-model-detail.yaml');
    const api = yaml('api/reconciliation-models.yaml');
    const detailApi = yaml('api/reconciliation-model-detail.yaml');
    const list = page.components[0];
    const detail = detailPage.components[0];

    expect(page.page).toMatchObject({ id: 'accounting-reconciliation-models', route: '/accounting/reconciliation-models' });
    expect(detailPage.page).toMatchObject({ id: 'accounting-reconciliation-model-detail', route: '/accounting/reconciliation-model-detail' });
    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(list).toMatchObject({ source: 'accounting_reconciliation_models', create_action: 'create_accounting_reconciliation_model', row_double_click_action: 'view_accounting_reconciliation_model' });
    expect(detail).toMatchObject({ source: 'accounting_reconciliation_model_detail', status_field: 'trigger' });
    expect(api.datasources.map((source: any) => source.id)).toEqual(['accounting_reconciliation_model_triggers', 'accounting_reconciliation_models']);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get(page.page.id)).toContain('accounting_reconciliation_models');
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get(detailPage.page.id)).toContain('accounting_reconciliation_model_detail');
  });

  test('loads fixed Odoo rows and supports search, empty, and transport-error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_reconciliation_models_schema_migrations', ['schema', 'data']);
    const source = yaml('api/reconciliation-models.yaml').datasources[1];

    expect((await repository.querySource(source, { q: null, trigger: null, active: null, fixture_state: null }, 0, 50)).data).toHaveLength(4);
    expect((await repository.querySource(source, { q: 'Bank Fees', trigger: null, active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Bank Fees', 'Line with Bank Fees']);
    expect((await repository.querySource(source, { q: null, trigger: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { q: null, trigger: null, active: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503 });
  });

  test('enforces permissioned CRUD and duplicate-name guard contracts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'accounting_reconciliation_models_crud_migrations', ['schema', 'data']);
    const api = yaml('api/reconciliation-models.yaml');
    const create = api.actions.find((action: any) => action.id === 'create_accounting_reconciliation_model');
    const detailApi = yaml('api/reconciliation-model-detail.yaml');
    const edit = detailApi.actions.find((action: any) => action.id === 'edit_accounting_reconciliation_model');
    const archive = detailApi.actions.find((action: any) => action.id === 'archive_accounting_reconciliation_model');
    const remove = detailApi.actions.find((action: any) => action.id === 'delete_accounting_reconciliation_model');

    expect(create.permission).toBe('accounting.write');
    expect(edit.permission).toBe('accounting.write');
    expect(archive.permission).toBe('accounting.write');
    expect(remove.permission).toBe('accounting.write');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Card Fees', trigger: 'Manual' } });
    expect(created).toMatchObject({ name: 'Card Fees', trigger: 'Manual', active: true });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'card fees', trigger: 'Manual' } })).rejects.toMatchObject({ status: 409 });
    await repository.executeMutation(edit.mutation, { values: { id: created.id, expected_row_version: 1, name: 'Card Charges', trigger: 'Automated' } });
    await repository.executeMutation(archive.mutation, { values: { id: created.id, expected_row_version: 2, active: false } });
    expect((await repository.querySource(yaml('api/reconciliation-models.yaml').datasources[1], { q: 'Card Charges', trigger: null, active: 'archived', fixture_state: null }, 0, 50)).data).toHaveLength(1);
    await repository.executeMutation(remove.mutation, { values: { id: created.id, expected_row_version: 3 } });
    expect((await repository.querySource(yaml('api/reconciliation-models.yaml').datasources[1], { q: 'Card Charges', trigger: null, active: null, fixture_state: null }, 0, 50)).data).toEqual([]);
  });
});

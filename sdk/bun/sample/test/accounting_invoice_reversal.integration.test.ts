import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Accounting invoice credit-note reversal parity', () => {
  test('keeps the Odoo Credit Note action page/API-bound and source-backed', () => {
    const page = yaml('pages/invoice-detail.yaml');
    const api = yaml('api/invoice-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    const action = api.actions.find((candidate: any) => candidate.id === 'reverse_accounting_invoice');

    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'invoice-detail' });
    expect(form.header_actions.map((candidate: any) => candidate.id)).toContain('reverse_accounting_invoice');
    expect(form.groups.flatMap((group: any) => group.fields).map((field: any) => field.field)).toEqual(expect.arrayContaining(['reversal_id', 'reversal_of_id', 'reversal_reason']));
    expect(action).toMatchObject({ type: 'server_form', permission: 'accounting.write', action: 'accounting.invoices.reverse', operation: 'create' });
    expect(action.mutation).toMatchObject({ operation: 'insert', table: 'accounting_invoices', id_input: 'reversal_id' });
    expect(action.mutation.steps[0].query).toContain('reversal_id = :reversal_id');
  });

  test('creates one durable draft credit note, links the posted source, and survives restart', async () => {
    const databasePath = `/tmp/core3-accounting-invoice-reversal-${crypto.randomUUID()}.duckdb`;
    const migrationName = `accounting_invoice_reversal_${crypto.randomUUID().replaceAll('-', '_')}`;
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);

    const api = yaml('api/invoice-detail.yaml');
    const detail = api.datasources.find((source: any) => source.id === 'accounting_invoice_detail');
    const action = api.actions.find((candidate: any) => candidate.id === 'reverse_accounting_invoice');
    const fixture = await repository.querySource(detail, { id: 'accounting-reversal-source-001', fixture_state: null }, 0, 1);
    expect(fixture.data).toMatchObject({ state: 'Posted', invoice_type: 'Customer Invoice', reversal_id: 'accounting-reversal-demo-001' });
    expect(action.permission).toBe('accounting.write');
    expect(action.mutation.guards).toHaveLength(3);

    const created = await repository.executeMutation(action.mutation, {
      id: 'accounting-invoice-demo-001',
      expected_row_version: 1,
      values: { reversal_date: '2026-09-20', reason: 'QA pricing correction' },
    }) as any;
    expect(created).toMatchObject({ invoice_type: 'Customer Credit Note', state: 'Draft', amount_total: 1650, amount_residual: 1650, reversal_of_id: 'accounting-invoice-demo-001', reversal_reason: 'QA pricing correction', source_invoice_name: 'INV/2026/0001', source_row_version: 2 });

    const vendorCreated = await repository.executeMutation(action.mutation, {
      id: 'accounting-vendor-reversal-source-001',
      expected_row_version: 1,
      values: { reversal_date: '2026-09-20', reason: 'QA vendor correction' },
    }) as any;
    expect(vendorCreated).toMatchObject({ invoice_type: 'Vendor Refund', state: 'Draft', amount_total: 330, reversal_of_id: 'accounting-vendor-reversal-source-001', reversal_reason: 'QA vendor correction', source_invoice_name: 'BILL/2026/0002', source_row_version: 2 });

    const source = await repository.querySource(detail, { id: 'accounting-invoice-demo-001', fixture_state: null }, 0, 1);
    expect(source.data).toMatchObject({ state: 'Posted', reversal_id: created.id, row_version: 2 });
    const reversal = await repository.querySource(detail, { id: created.id, fixture_state: null }, 0, 1);
    expect(reversal.data).toMatchObject({ invoice_type: 'Customer Credit Note', state: 'Draft', reversal_of_id: 'accounting-invoice-demo-001', reversal_reason: 'QA pricing correction' });

    await expect(repository.executeMutation(action.mutation, {
      id: 'accounting-invoice-demo-001',
      expected_row_version: 2,
      values: { reversal_date: '2026-09-20', reason: 'Duplicate' },
    })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_REVERSAL_UNAVAILABLE' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'accounting-invoice-demo-001',
      expected_row_version: 1,
      values: { reversal_date: '2026-09-20', reason: 'Stale' },
    })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_REVERSAL_UNAVAILABLE' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'accounting-credit-demo-001',
      expected_row_version: 1,
      values: { reversal_date: '2026-09-20', reason: 'Unsupported' },
    })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INVOICE_REVERSAL_UNAVAILABLE' });
    await expect(repository.executeMutation(action.mutation, {
      id: 'accounting-invoice-demo-002',
      expected_row_version: 1,
      values: { reversal_date: 'not-a-date', reason: 'Invalid date' },
    })).rejects.toMatchObject({ status: 422, code: 'ACCOUNTING_INVOICE_REVERSAL_DATE_INVALID' });

    database.close();
    const restartedDatabase = await DuckDbDatabase.open(databasePath);
    const restartedRepository = new YamlRepository(restartedDatabase);
    await migrateDatabase(restartedRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await restartedRepository.querySource(detail, { id: created.id, fixture_state: null }, 0, 1)).data).toMatchObject({ state: 'Draft', reversal_of_id: 'accounting-invoice-demo-001', reversal_reason: 'QA pricing correction' });
    expect((await restartedRepository.querySource(detail, { id: 'accounting-invoice-demo-001', fixture_state: null }, 0, 1)).data).toMatchObject({ reversal_id: created.id, row_version: 2 });
    restartedDatabase.close();
    rmSync(databasePath, { force: true });
  });
});

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/accounting');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(file).actions.find((candidate: any) => candidate.id === id);

describe('Accounting Internal Transfers action 324 parity', () => {
  test('keeps menu, page/API boundaries, source view modes, and guarded form routes', () => {
    const page = yaml('pages/internal-transfers.yaml');
    const list = page.components[0];
    const manifest = yaml('manifest.yaml');
    expect(manifest.menu.groups.find((group: any) => group.id === 'invoicing').items).toContainEqual({ path: '/accounting/internal-transfers', label: 'Internal Transfers', icon: 'bank', permission: 'accounting.read' });
    expect(page.page).toMatchObject({ id: 'accounting-internal-transfers', route: '/accounting/internal-transfers', auth: { require: ['accounting.read'] } });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'card', 'kanban', 'form', 'graph']);
    expect(list.views.find((view: any) => view.id === 'card')).toMatchObject({ label: 'Kanban', mobile: true });
    expect(yaml('api/internal-transfers.yaml').page).toEqual({ id: page.page.id });
    expect(yaml('api/internal-transfer-detail.yaml').page).toEqual({ id: 'accounting-internal-transfer-detail' });
    expect(yaml('api/internal-transfer-new.yaml').page).toEqual({ id: 'accounting-internal-transfer-new' });
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('accounting-internal-transfers')).toContain('accounting_internal_transfers');
    expect(action('api/internal-transfer-detail.yaml', 'edit_accounting_internal_transfer').mutation.concurrency).toEqual({ required: true });
    expect(action('api/internal-transfer-new.yaml', 'create_accounting_internal_transfer').permission).toBe('accounting.write');
  });

  test('seeds realistic transfer states and supports search, empty, and guarded workflow', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'accounting_internal_transfer_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'accounting_internal_transfer_test', ['schema', 'data']);
    const source = yaml('api/internal-transfers.yaml').datasources.find((candidate: any) => candidate.id === 'accounting_internal_transfers');
    const params = { q: null, state: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data).toHaveLength(4);
    expect((await repository.querySource(source, { ...params, q: 'Azure' }, 0, 50)).data[0]).toMatchObject({ state: 'In Process', amount: 875.5 });
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const detail = action('api/internal-transfer-detail.yaml', 'confirm_accounting_internal_transfer');
    const paid = action('api/internal-transfer-detail.yaml', 'mark_accounting_internal_transfer_paid');
    const cancel = action('api/internal-transfer-detail.yaml', 'cancel_accounting_internal_transfer');
    await expect(repository.executeMutation(detail.mutation, { id: 'accounting-internal-transfer-001', expected_row_version: 99, values: { state: 'In Process' } })).rejects.toMatchObject({ status: 409, code: 'ACCOUNTING_INTERNAL_TRANSFER_STALE' });
    const confirmed = await repository.executeMutation(detail.mutation, { id: 'accounting-internal-transfer-001', expected_row_version: 1, values: { state: 'In Process' } });
    expect(confirmed).toMatchObject({ id: 'accounting-internal-transfer-001', state: 'In Process', row_version: 2 });
    const completed = await repository.executeMutation(paid.mutation, { id: 'accounting-internal-transfer-001', expected_row_version: 2, values: { state: 'Paid' } });
    expect(completed).toMatchObject({ state: 'Paid', row_version: 3 });
    await expect(repository.executeMutation(cancel.mutation, { id: 'accounting-internal-transfer-001', expected_row_version: 3, values: { state: 'Canceled' } })).rejects.toMatchObject({ status: 409 });
    database.close();
  });

  test('keeps writes permissioned and validates new/edit values', () => {
    const create = action('api/internal-transfer-new.yaml', 'create_accounting_internal_transfer');
    const edit = action('api/internal-transfer-detail.yaml', 'edit_accounting_internal_transfer');
    expect(create.mutation.fields).toContain('destination_journal');
    expect(create.mutation.guards[0].code).toBe('ACCOUNTING_INTERNAL_TRANSFER_VALUES_INVALID');
    expect(edit.permission).toBe('accounting.write');
    expect(edit.mutation.guards.map((guard: any) => guard.code)).toEqual(['ACCOUNTING_INTERNAL_TRANSFER_NOT_FOUND', 'ACCOUNTING_INTERNAL_TRANSFER_VALUES_INVALID', 'ACCOUNTING_INTERNAL_TRANSFER_STALE']);
  });
});

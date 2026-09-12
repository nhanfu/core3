import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off approved cancellation wizard parity', () => {
  test('joins the existing leave detail page and API by page id', () => {
    const page = yaml('pages/request-detail.yaml');
    const api = yaml('api/request-detail.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'cancel_approved_leave_request_detail');
    expect(discoverPages(join(root, '..')).pageDatasources.get('leave-request-detail')).toContain('leave_request_detail');
    expect(page.page).toMatchObject({ id: 'leave-request-detail' });
    expect(api.page).toEqual({ id: 'leave-request-detail' });
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'cancel_approved_leave_request_detail', show_if: "row.state === 'Approved'" }));
    expect(action).toMatchObject({ type: 'server_form', title: 'Cancel Time Off', permission: 'time_off.write', submit_label: 'Cancel Time Off', cancel_label: 'Discard', modal_style: 'time_off_cancel' });
    expect(action.fields).toContainEqual(expect.objectContaining({ field: 'cancellation_reason', label: 'Reason', type: 'textarea' }));
  });

  test('adds the fixed cancellation field idempotently and cancels an approved request', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_approved_cancel_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_approved_cancel_migrations', ['schema', 'data']);
    const action = yaml('api/request-detail.yaml').actions.find((candidate: any) => candidate.id === 'cancel_approved_leave_request_detail');
    const cancelled = await repository.executeMutation(action.mutation, { id: 'leave-request-demo-003', expected_row_version: 1, values: { state: 'Cancelled', cancellation_reason: 'Plans changed' } });
    expect(cancelled).toMatchObject({ id: 'leave-request-demo-003', state: 'Cancelled', cancellation_reason: 'Plans changed', row_version: 2 });
    expect((await repository.query("SELECT version FROM time_off_approved_cancel_migrations WHERE version = '0.0.15'")).length).toBe(1);
    database.close();
  });

  test('covers missing, stale, invalid-reason, empty, and transport contracts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_approved_cancel_guards', ['schema', 'data']);
    const api = yaml('api/request-detail.yaml');
    const action = api.actions.find((candidate: any) => candidate.id === 'cancel_approved_leave_request_detail');
    await expect(repository.executeMutation(action.mutation, { id: 'missing-leave', expected_row_version: 1, values: {} })).rejects.toMatchObject({ status: 404, code: 'TIME_OFF_LEAVE_NOT_FOUND' });
    await expect(repository.executeMutation(action.mutation, { id: 'leave-request-demo-003', expected_row_version: 99, values: {} })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_LEAVE_CANCEL_STALE' });
    await expect(repository.executeMutation(action.mutation, { id: 'leave-request-demo-003', expected_row_version: 1, values: { cancellation_reason: 'x'.repeat(501) } })).rejects.toMatchObject({ status: 422, code: 'TIME_OFF_LEAVE_CANCEL_REASON_INVALID' });
    expect((await repository.querySource(api.datasources[0], { id: 'leave-request-demo-003', fixture_state: 'empty' })).data).toEqual({});
    await expect(repository.querySource(api.datasources[0], { id: 'leave-request-demo-003', fixture_state: 'transport_error' })).rejects.toMatchObject({ status: 503, code: 'TIME_OFF_LEAVE_DETAIL_UNAVAILABLE' });
    database.close();
  });
});

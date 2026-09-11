import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '..');
const serviceRoot = join(root, 'services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const listApi = () => yaml('api/productivity-losses.yaml');
const detailApi = () => yaml('api/productivity-loss-detail.yaml');
const action = (id: string) => [...listApi().actions, ...detailApi().actions].find((candidate: any) => candidate.id === id);

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'manufacturing_productivity_losses_test_migrations', ['schema', 'data']);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'manufacturing_productivity_losses_test_migrations', ['schema', 'data']);
  return { database, repository };
}

describe('Manufacturing Productivity Losses Odoo action parity', () => {
  test('keeps report/detail presentation-only and preserves the Work Center action link', () => {
    const page = yaml('pages/productivity-losses.yaml');
    const detail = yaml('pages/productivity-loss-detail.yaml');
    const workCenter = yaml('pages/work-center-detail.yaml');
    const discovered = discoverPages(root);

    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(detail.datasources).toBeUndefined();
    expect(detail.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'manufacturing-productivity-losses', route: '/manufacturing/productivity-losses' });
    expect(detail.page).toMatchObject({ id: 'manufacturing-productivity-loss-detail', route: '/manufacturing/productivity-losses/detail' });
    expect(listApi().page.id).toBe('manufacturing-productivity-losses');
    expect(detailApi().page.id).toBe('manufacturing-productivity-loss-detail');
    expect(discovered.pageDatasources.get('manufacturing-productivity-losses')).toEqual(expect.arrayContaining([
      'mrp_productivity_loss_logs', 'mrp_productivity_loss_workcenters', 'mrp_productivity_loss_reasons',
    ]));
    expect(discovered.pageDatasources.get('manufacturing-productivity-loss-detail')).toContain('mrp_productivity_loss_detail');
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/manufacturing/productivity-losses', page: 'manufacturing-productivity-losses', module: 'manufacturing' }),
      expect.objectContaining({ path: '/manufacturing/productivity-losses/detail', page: 'manufacturing-productivity-loss-detail', module: 'manufacturing' }),
    ]));
    expect(workCenter.components[0].stat_buttons).toContainEqual(expect.objectContaining({
      id: 'open_mrp_productivity_losses', label: 'Lost', value_field: 'productivity_loss_count',
    }));
    expect(yaml('api/work-center-detail.yaml').actions).toContainEqual(expect.objectContaining({
      id: 'open_mrp_productivity_losses', type: 'navigate', navigate_to: '/manufacturing/productivity-losses',
    }));
  });

  test('matches Odoo action 831 modes, fields, filters, and editable form contract', () => {
    const page = yaml('pages/productivity-losses.yaml');
    const list = page.components[0];
    const form = yaml('pages/productivity-loss-detail.yaml').components[0];
    const report = listApi();

    expect(list).toMatchObject({ type: 'ListView', variant: 'odoo', source: 'mrp_productivity_loss_logs', create_action: 'create_mrp_productivity_loss', view_navigation: 'tabs' });
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'graph', 'pivot', 'form']);
    expect(list.filters.map((filter: any) => filter.label)).toEqual(['Work Center', 'Loss Reason', 'Effectiveness']);
    expect(list.columns.map((column: any) => column.label)).toEqual([
      'Start Date', 'End Date', 'Work Center', 'User', 'Loss Reason', 'Duration (minutes)', 'Company',
    ]);
    expect(list.columns.filter((column: any) => column.mobile).map((column: any) => column.label)).toEqual(['Start Date', 'End Date']);
    expect(list.form_view.page).toBe('apps/services/manufacturing/pages/productivity-loss-detail.yaml');
    expect(form).toMatchObject({ type: 'OdooFormView', source: 'mrp_productivity_loss_detail', editable: true, title_field: 'loss_reason' });
    expect(form.groups.flatMap((group: any) => group.fields.map((field: any) => field.label))).toEqual([
      'Manufacturing Order', 'Work Order', 'Work Center', 'Loss Reason', 'Start Date', 'End Date', 'Duration', 'Company',
    ]);
    expect(report.datasources.every((source: any) => source.permission === 'manufacturing.read')).toBe(true);
    expect(detailApi().datasources[0].error_states.missing_record).toMatchObject({ status: 404, code: 'MRP_PRODUCTIVITY_LOSS_NOT_FOUND' });
    expect(action('create_mrp_productivity_loss')).toMatchObject({ type: 'server_form', permission: 'manufacturing.write', operation: 'create' });
    expect(action('edit_mrp_productivity_loss')).toMatchObject({ type: 'server_form', permission: 'manufacturing.write', operation: 'update' });
    expect(action('delete_mrp_productivity_loss')).toMatchObject({ type: 'server', permission: 'manufacturing.manage', operation: 'delete' });
    expect(action('edit_mrp_productivity_loss').mutation.concurrency).toEqual({ required: true });
  });

  test('seeds deterministic work-center-scoped loss rows and explicit report states', async () => {
    const { database, repository } = await repositoryForTest();
    const api = listApi();
    const source = api.datasources.find((candidate: any) => candidate.id === 'mrp_productivity_loss_logs');
    const params = { q: null, workcenter_id: null, workcenter_name: null, loss_reason: null, loss_type: null, from_date: null, to_date: null, fixture_state: null };

    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual([
      'oee-assembly-availability', 'oee-assembly-failure', 'oee-drill-availability', 'oee-drill-failure',
    ]);
    expect((await repository.querySource(source, { ...params, workcenter_id: 'workcenter-assembly-1' }, 0, 50)).data.map((row: any) => row.workcenter_name)).toEqual(['Assembly 1', 'Assembly 1']);
    expect((await repository.querySource(source, { ...params, q: 'Equipment' }, 0, 50)).data).toHaveLength(2);
    expect((await repository.querySource(source, { ...params, loss_type: 'Productive' }, 0, 50)).data).toHaveLength(2);
    expect((await repository.querySource(source, { ...params, from_date: '2026-01-13', to_date: '2026-01-13' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['oee-drill-failure']);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_PRODUCTIVITY_LOSSES_UNAVAILABLE' });
    await expect(repository.querySource(source, { ...params, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'MRP_PRODUCTIVITY_LOSSES_FORBIDDEN' });
    await expect(repository.querySource(source, { ...params, fixture_state: 'unauthorized' }, 0, 50)).rejects.toMatchObject({ status: 401, code: 'MRP_PRODUCTIVITY_LOSSES_UNAUTHORIZED' });

    const reasons = api.datasources.find((candidate: any) => candidate.id === 'mrp_productivity_loss_reasons');
    expect((await repository.querySource(reasons, {}, 0, 50)).data).toHaveLength(6);
    const workcenters = api.datasources.find((candidate: any) => candidate.id === 'mrp_productivity_loss_workcenters');
    expect((await repository.querySource(workcenters, {}, 0, 50)).data[0]).toMatchObject({ value: 'Assembly 1', label: 'Assembly 1' });
    database.close();
  });

  test('supports editable loss logs with date/reason validation and row-version guards', async () => {
    const { database, repository } = await repositoryForTest();
    const create = action('create_mrp_productivity_loss');
    const edit = action('edit_mrp_productivity_loss');
    const remove = action('delete_mrp_productivity_loss');
    const values = {
      workcenter_name: 'Assembly 1', loss_reason: 'Equipment Failure', loss_type: 'Availability',
      date_start: '2026-01-15 08:00:00', date_end: '2026-01-15 09:00:00', description: 'QA equipment interruption',
    };

    const created = await repository.executeMutation(create.mutation, { id: 'productivity-loss-qa-001', values });
    expect(created).toMatchObject({ id: 'productivity-loss-qa-001', row_version: 1, workcenter_name: 'Assembly 1', loss_reason: 'Equipment Failure' });
    await expect(repository.executeMutation(create.mutation, { id: 'productivity-loss-invalid-date', values: { ...values, date_end: '2026-01-15 07:00:00' } })).rejects.toMatchObject({ status: 422, code: 'MRP_PRODUCTIVITY_LOSS_DATES_INVALID' });
    await expect(repository.executeMutation(create.mutation, { id: 'productivity-loss-invalid-reason', values: { ...values, loss_reason: 'Not a reason' } })).rejects.toMatchObject({ status: 422, code: 'MRP_PRODUCTIVITY_LOSS_REASON_INVALID' });

    const updated = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...values, loss_reason: 'Maintenance', description: 'Updated interruption' } });
    expect(updated).toMatchObject({ id: created.id, row_version: 2, loss_reason: 'Maintenance', description: 'Updated interruption' });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...values, loss_reason: 'Quality Check' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'productivity-loss-missing', expected_row_version: 1, values })).rejects.toMatchObject({ status: 404, code: 'MRP_PRODUCTIVITY_LOSS_NOT_FOUND' });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'MRP_PRODUCTIVITY_LOSS_NOT_FOUND' });

    const detail = detailApi().datasources[0];
    await expect(repository.querySource(detail, { id: 'productivity-loss-missing', fixture_state: 'missing_record' }, 0, 1)).rejects.toMatchObject({ status: 404, code: 'MRP_PRODUCTIVITY_LOSS_NOT_FOUND' });
    await expect(repository.querySource(detail, { id: 'oee-assembly-failure', fixture_state: 'forbidden' }, 0, 1)).rejects.toMatchObject({ status: 403, code: 'MRP_PRODUCTIVITY_LOSS_DETAIL_FORBIDDEN' });
    database.close();
  });
});

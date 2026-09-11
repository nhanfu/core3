import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/time_off');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Time Off Accrual Plan Milestones', () => {
  test('maps the visible Odoo milestone action and keeps page/API ownership explicit', () => {
    const discovered = discoverPages(join(root, '..'));
    const page = yaml('pages/accrual-plan-detail.yaml');
    const api = yaml('api/accrual-plan-detail.yaml');
    const grid = page.components.find((component: any) => component.type === 'ListView');
    const create = api.actions.find((action: any) => action.id === 'create_accrual_plan_milestone');
    const edit = api.actions.find((action: any) => action.id === 'edit_accrual_plan_milestone');
    const remove = api.actions.find((action: any) => action.id === 'delete_accrual_plan_milestone');

    expect(page.page).toMatchObject({ id: 'accrual-plan-detail', route: '/accrual-plans/detail', auth: { require: ['time_off.manage'] } });
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(grid).toMatchObject({
      source: 'accrual_plan_levels',
      variant: 'odoo',
      create_action: 'create_accrual_plan_milestone',
      create_label: 'Add a milestone',
      row_open_action: 'edit_accrual_plan_milestone',
      row_actions: 'menu',
    });
    expect(grid.empty_state.title).toBe("No milestones on the plan yet. Let's create a new one");
    expect(discovered.pageDatasources.get('accrual-plan-detail')).toEqual(['accrual_plan_detail', 'accrual_plan_levels']);
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.find((source: any) => source.id === 'accrual_plan_levels')).toMatchObject({ permission: 'time_off.manage' });
    expect(create).toMatchObject({ type: 'server_form', title: 'New Milestone', handler: 'line_item', operation: 'create', permission: 'time_off.manage' });
    expect(edit).toMatchObject({ type: 'server_form', title: 'Milestone Edition', handler: 'line_item', operation: 'update', permission: 'time_off.manage' });
    expect(remove).toMatchObject({ type: 'server', handler: 'line_item', operation: 'delete', permission: 'time_off.manage' });
    expect(create.fields.map((field: any) => field.label)).toEqual([
      'Accrual amount', 'Accrual unit', 'Frequency', 'Milestone reached',
      'Start after', 'Start unit', 'Unused time off', 'Carry over amount',
      'Maximum carried-over days', 'Define a carry over validity?',
      'Carry over validity', 'Validity unit', 'Define a yearly cap?',
      'Yearly cap', 'Define a balance cap?', 'Balance cap',
    ]);
    expect(create.fields.find((field: any) => field.field === 'frequency').options.map((option: any) => option.label)).toEqual([
      'Hourly', 'Daily', 'Weekly', 'Twice a month', 'Monthly', 'Twice a year', 'Yearly',
    ]);
    expect(api.datasources.find((source: any) => source.id === 'accrual_plan_levels')?.error_states.transport_error).toMatchObject({
      status: 503,
      code: 'TIME_OFF_ACCRUAL_LEVELS_UNAVAILABLE',
    });
    expect(edit.mutation.steps[0].query).toContain('row_version = :expected_row_version');
    expect(remove.mutation.steps[0].query).toContain('row_version = :expected_row_version');
  });

  test('seeds deterministic Odoo-shaped milestones idempotently and covers search, empty, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_accrual_milestones_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_accrual_milestones_schema_migrations', ['schema', 'data']);

    const source = yaml('api/accrual-plan-detail.yaml').datasources.find((candidate: any) => candidate.id === 'accrual_plan_levels');
    const params = { id: 'accrual-plan-demo-001', fixture_state: null };
    const populated = await repository.querySource(source, params, 0, 50);
    expect(populated.data).toHaveLength(3);
    expect(populated.data[0]).toMatchObject({
      id: 'accrual-level-demo-001-01',
      milestone_summary: 'After 1 day(s)',
      frequency_summary: '1 day(s) every year on the 1 of January.',
      carryover_summary: 'Unused days will be transferred totally on each start of the year.',
      cap_summary: 'A balance cap is set to 100 day(s).',
    });
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, q: 'after 4' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['accrual-level-demo-001-02']);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({
      status: 503,
      code: 'TIME_OFF_ACCRUAL_LEVELS_UNAVAILABLE',
    });
    expect((await repository.query("SELECT COUNT(*) AS count FROM accrual_plan_levels WHERE accrual_plan_id = 'accrual-plan-demo-001'")).at(0)?.count).toBe(3);
    expect((await repository.query("SELECT version FROM time_off_accrual_milestones_schema_migrations WHERE version = '0.0.10'")).length).toBe(1);
    expect((await repository.query("SELECT index_name FROM duckdb_indexes() WHERE index_name = 'accrual_plan_levels_plan_sequence_idx'")).length).toBe(1);
    database.close();
  });

  test('supports permissioned create, edit, duplicate validation, and stale/delete guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'time_off_accrual_milestones_mutation_migrations', ['schema', 'data']);
    const api = yaml('api/accrual-plan-detail.yaml');
    const create = api.actions.find((action: any) => action.id === 'create_accrual_plan_milestone');
    const edit = api.actions.find((action: any) => action.id === 'edit_accrual_plan_milestone');
    const remove = api.actions.find((action: any) => action.id === 'delete_accrual_plan_milestone');
    const values = {
      added_value: 4,
      added_value_type: 'day',
      frequency: 'monthly',
      milestone_date: 'after',
      start_count: 12,
      start_type: 'month',
      action_with_unused_accruals: 'all',
      carryover_options: 'limited',
      postpone_max_days: 10,
      accrual_validity: true,
      accrual_validity_count: 2,
      accrual_validity_type: 'month',
      cap_accrued_time_yearly: true,
      maximum_leave_yearly: 40,
      cap_accrued_time: true,
      maximum_leave: 120,
    };
    const created = await repository.executeMutation(create.mutation, { id: 'accrual-plan-demo-001', values });
    expect(created).toMatchObject({ id: 'accrual-level-accrual-plan-demo-001-90', accrual_plan_id: 'accrual-plan-demo-001', row_version: 1, start_count: 12, start_type: 'month' });
    expect((await repository.query("SELECT level_count FROM accrual_plans WHERE id = 'accrual-plan-demo-001'")).at(0)?.level_count).toBe(4);
    await expect(repository.executeMutation(create.mutation, { id: 'accrual-plan-demo-001', values: { ...values, start_count: 1, start_type: 'day' } })).rejects.toMatchObject({ status: 409, code: 'TIME_OFF_ACCRUAL_LEVEL_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { id: 'accrual-plan-demo-001', values: { ...values, added_value: 0 } })).rejects.toMatchObject({ status: 422, code: 'TIME_OFF_ACCRUAL_LEVEL_VALUES_INVALID' });
    await expect(repository.executeMutation(create.mutation, { id: 'accrual-plan-demo-001', values: { ...values, start_count: 0 } })).rejects.toMatchObject({ status: 422, code: 'TIME_OFF_ACCRUAL_LEVEL_START_INVALID' });

    const updated = await repository.executeMutation(edit.mutation, { id: 'accrual-plan-demo-001', line_id: created.id, expected_row_version: 1, values: { ...values, added_value: 5 } });
    expect(updated).toMatchObject({ id: created.id, row_version: 2, added_value: 5 });
    await expect(repository.executeMutation(edit.mutation, { id: 'accrual-plan-demo-001', line_id: created.id, expected_row_version: 1, values })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(edit.mutation, { id: 'accrual-plan-demo-001', line_id: 'missing-level', expected_row_version: 1, values })).rejects.toMatchObject({ status: 404, code: 'TIME_OFF_ACCRUAL_LEVEL_NOT_FOUND' });
    await expect(repository.executeMutation(remove.mutation, { id: 'accrual-plan-demo-001', line_id: created.id, expected_row_version: 1 })).rejects.toMatchObject({ status: 409 });
    await repository.executeMutation(remove.mutation, { id: 'accrual-plan-demo-001', line_id: created.id, expected_row_version: 2 });
    expect((await repository.query(`SELECT id FROM accrual_plan_levels WHERE id = '${created.id}'`)).length).toBe(0);
    expect((await repository.query("SELECT level_count FROM accrual_plans WHERE id = 'accrual-plan-demo-001'")).at(0)?.level_count).toBe(3);
    await expect(repository.executeMutation(remove.mutation, { id: 'accrual-plan-demo-001', line_id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 404, code: 'TIME_OFF_ACCRUAL_LEVEL_NOT_FOUND' });
    await expect(repository.executeMutation(create.mutation, { id: 'missing-plan', values })).rejects.toMatchObject({ status: 404, code: 'TIME_OFF_ACCRUAL_PLAN_NOT_FOUND' });
    database.close();
  });
});

import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/expenses');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (id: string) => yaml('api/expense-detail.yaml').actions.find((candidate: any) => candidate.id === id);
const migrate = async (database: DuckDbDatabase, name: string) => migrateDatabase(new YamlRepository(database), join(root, 'migrations'), undefined, name, ['schema', 'data']);

describe('Expenses activity parity slice', () => {
  test('maps Odoo mail.activity.mixin and keeps the detail/API contract joined by page.id', () => {
    const page = yaml('pages/expense-detail.yaml');
    const api = yaml('api/expense-detail.yaml');
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_expense/models/hr_expense.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/hr_expense/views/hr_expense_views.xml', 'utf8');
    expect(page.page.id).toBe('expense-detail');
    expect(page.datasources).toBeUndefined();
    expect(page.components[0]).toMatchObject({
      message_source: 'expense_detail_activity',
      activity_action: 'schedule_expense_activity',
      activity_complete_action: 'complete_expense_activity',
    });
    expect(action('schedule_expense_activity')).toMatchObject({ type: 'server_form', permission: 'expenses.write', operation: 'schedule_activity' });
    expect(action('complete_expense_activity')).toMatchObject({ type: 'server', permission: 'expenses.write', operation: 'complete_activity' });
    expect(api.datasources.find((source: any) => source.id === 'expense_detail_activity').query).toContain('expense_scheduled_activities');
    expect(source).toContain("_inherit = ['mail.thread.main.attachment', 'mail.activity.mixin', 'analytic.mixin']");
    expect(view).toContain('field name="activity_ids"');
    expect(view).toContain('view_mode">list,kanban,form,graph,pivot,activity');
  });

  test('seeds a planned activity and schedules/completes one with durable guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(database, 'expenses_activity_contract');
    const detail = yaml('api/expense-detail.yaml').datasources.find((source: any) => source.id === 'expense_detail_activity');
    const seeded = await repository.querySource(detail, { id: 'expense-demo-submitted' }, 0, 20);
    expect(seeded.data).toEqual(expect.arrayContaining([expect.objectContaining({ state: 'planned', detail: 'Review the submitted receipt' })]));

    const schedule = action('schedule_expense_activity');
    const scheduled = await repository.executeMutation(schedule.mutation, {
      id: 'expense-demo-draft', expected_row_version: 1, current_company_name: 'Core3 Demo Company',
      current_user_name: 'Admin User', activity_type: 'call', content: 'Call the vendor about the receipt', due_date: '2026-09-24',
    });
    expect(scheduled).toMatchObject({ id: 'expense-scheduled-activity-expense-demo-draft-1', state: 'Planned', activity_type: 'call', summary: 'Call the vendor about the receipt', row_version: 1 });
    expect(await repository.query("SELECT row_version FROM expenses WHERE id = 'expense-demo-draft'")).toEqual([{ row_version: 2 }]);

    const complete = action('complete_expense_activity');
    const completed = await repository.executeMutation(complete.mutation, {
      id: 'expense-scheduled-activity-expense-demo-draft-1', expected_row_version: 1,
      current_company_name: 'Core3 Demo Company', current_user_name: 'Admin User',
    });
    expect(completed).toMatchObject({ state: 'Done', row_version: 2, completed_by: 'Admin User' });
    expect(await repository.query("SELECT action, action_label FROM expense_activity WHERE id = 'expense-activity-expense-scheduled-activity-expense-demo-draft-1-complete-1'")).toEqual([{ action: 'expenses.activity.complete', action_label: 'Completed activity' }]);
    await database.close();
  });

  test('rejects invalid activity input, wrong company, anonymous actors, and stale completion', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(database, 'expenses_activity_guards');
    const schedule = action('schedule_expense_activity');
    const base = { id: 'expense-demo-draft', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Admin User', content: 'Review receipt' };
    await expect(repository.executeMutation(schedule.mutation, { ...base, activity_type: 'sms' })).rejects.toMatchObject({ status: 422, code: 'EXPENSE_ACTIVITY_TYPE_INVALID' });
    await expect(repository.executeMutation(schedule.mutation, { ...base, content: '   ' })).rejects.toMatchObject({ status: 422, code: 'EXPENSE_ACTIVITY_SUMMARY_INVALID' });
    await expect(repository.executeMutation(schedule.mutation, { ...base, due_date: '2026/09/24' })).rejects.toMatchObject({ status: 422, code: 'EXPENSE_ACTIVITY_DATE_INVALID' });
    await expect(repository.executeMutation(schedule.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'EXPENSE_ACTIVITY_COMPANY_FORBIDDEN' });
    await expect(repository.executeMutation(schedule.mutation, { ...base, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'EXPENSE_ACTIVITY_ACTOR_REQUIRED' });

    const complete = action('complete_expense_activity');
    await expect(repository.executeMutation(complete.mutation, { id: 'expense-scheduled-activity-expense-demo-submitted-1', expected_row_version: 99, current_company_name: 'Core3 Demo Company', current_user_name: 'Admin User' })).rejects.toMatchObject({ status: 409, code: 'EXPENSE_ACTIVITY_STALE' });
    await database.close();
  });

  test('preserves the scheduled and completed activity across a file-backed restart and migration replay', async () => {
    const path = `/tmp/core3-expenses-activity-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(path);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, 'expenses_activity_restart', ['schema', 'data']);
    const schedule = action('schedule_expense_activity');
    await firstRepository.executeMutation(schedule.mutation, {
      id: 'expense-demo-draft', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Admin User',
      content: 'Review receipt after restart', activity_type: 'todo', due_date: '2026-09-25',
    });
    await first.close();
    const second = await DuckDbDatabase.open(path);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, 'expenses_activity_restart', ['schema', 'data']);
    expect(await secondRepository.query("SELECT summary, state, row_version FROM expense_scheduled_activities WHERE id = 'expense-scheduled-activity-expense-demo-draft-1'")).toEqual([{ summary: 'Review receipt after restart', state: 'Planned', row_version: 1 }]);
    await secondRepository.executeMutation(action('complete_expense_activity').mutation, {
      id: 'expense-scheduled-activity-expense-demo-draft-1', expected_row_version: 1, current_company_name: 'Core3 Demo Company', current_user_name: 'Admin User',
    });
    await second.close();
    const third = await DuckDbDatabase.open(path);
    const thirdRepository = new YamlRepository(third);
    await migrateDatabase(thirdRepository, join(root, 'migrations'), undefined, 'expenses_activity_restart', ['schema', 'data']);
    expect(await thirdRepository.query("SELECT state, completed_by, row_version FROM expense_scheduled_activities WHERE id = 'expense-scheduled-activity-expense-demo-draft-1'")).toEqual([{ state: 'Done', completed_by: 'Admin User', row_version: 2 }]);
    expect(await thirdRepository.query("SELECT COUNT(*) AS count FROM expense_scheduled_activities WHERE id = 'expense-scheduled-activity-expense-demo-submitted-1'")).toEqual([{ count: 1 }]);
    await third.close();
    rmSync(path, { force: true });
  });
});

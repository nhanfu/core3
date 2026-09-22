import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const serviceRoot = join(import.meta.dir, '../services/base');
const migrations = join(serviceRoot, 'migrations');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/contact-detail.yaml').actions.find((candidate: any) => candidate.id === id);
const source = (id: string) => yaml('api/contact-detail.yaml').datasources.find((candidate: any) => candidate.id === id);

describe('Base contact activity rescheduling parity', () => {
  test('maps Odoo bulk and row reschedule actions through separate page/API contracts', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/mail/views/mail_activity_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/mail/models/mail_activity.py', 'utf8');
    const page = yaml('pages/contact-detail.yaml');
    const api = yaml('api/contact-detail.yaml');
    const activityList = page.components.find((component: any) => component.type === 'ListView' && component.source === 'contact_activities');

    expect(sourceView).toContain('name="action_reschedule_today"');
    expect(sourceView).toContain('name="action_reschedule_tomorrow"');
    expect(sourceView).toContain('name="action_reschedule_nextweek"');
    expect(sourceModel).toContain('self.filtered(\'active\').date_deadline = date.today()');
    expect(sourceModel).toContain('date.today() + timedelta(days=1)');
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'contact-detail' });
    expect(activityList).toMatchObject({ source: 'contact_activities', selectable: true, row_actions: 'menu' });
    expect(activityList.bulk_actions).toEqual([
      { id: 'reschedule_contact_activities_today', label: 'Today', permission: 'base.activities.write' },
      { id: 'reschedule_contact_activities_tomorrow', label: 'Tomorrow', permission: 'base.activities.write' },
      { id: 'reschedule_contact_activities_next_week', label: 'Next Week', permission: 'base.activities.write' },
    ]);
    expect(activityList.columns.at(-1).actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'reschedule_contact_activity_today', label: 'Today' }),
      expect.objectContaining({ id: 'reschedule_contact_activity_tomorrow', label: 'Tomorrow' }),
      expect.objectContaining({ id: 'reschedule_contact_activity_next_week', label: 'Next Week' }),
    ]));
    for (const id of [
      'reschedule_contact_activities_today', 'reschedule_contact_activities_tomorrow', 'reschedule_contact_activities_next_week',
      'reschedule_contact_activity_today', 'reschedule_contact_activity_tomorrow', 'reschedule_contact_activity_next_week',
    ]) {
      expect(action(id)).toMatchObject({ type: 'server', permission: 'base.activities.write', handler: 'yaml_mutation' });
    }
    expect(source('contact_activities').query).toContain('a.row_version');
    validatePageDefinition({ ...page, actions: api.actions, datasources: api.datasources }, { allowExternalSources: true });
  });

  test('reschedules selected planned activities to Today, Tomorrow, and Next Week', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, migrations, undefined, 'base_contact_activity_reschedule_migrations', ['schema', 'data']);
    await repository.run("INSERT INTO base_activities(id, contact_id, summary, activity_type, state, due_date, assigned_user_name) VALUES ('activity-reschedule-2', 'contact-demo', 'Tomorrow QA', 'todo', 'planned', DATE '2026-01-15', 'Administrator'), ('activity-reschedule-3', 'contact-demo', 'Next week QA', 'todo', 'planned', DATE '2026-01-16', 'Administrator')");

    const today = String((await repository.query('SELECT CAST(CURRENT_DATE AS VARCHAR) AS value'))[0].value);
    const tomorrow = String((await repository.query("SELECT CAST(CURRENT_DATE + INTERVAL '1 day' AS VARCHAR) AS value"))[0].value).slice(0, 10);
    const nextWeek = String((await repository.query("SELECT CAST(CAST(DATE_TRUNC('week', CURRENT_DATE) AS DATE) + INTERVAL '7 days' AS VARCHAR) AS value"))[0].value).slice(0, 10);
    const actor = { current_company_id: 'company-demo', current_user_id: 'user-admin', current_user_name: 'Administrator' };

    const todayResult = await repository.executeMutation(action('reschedule_contact_activities_today').mutation, { selectedIds: ['activity-demo'], ...actor }) as any;
    expect(todayResult).toMatchObject({ rescheduled_count: 1, due_date: today });
    const tomorrowResult = await repository.executeMutation(action('reschedule_contact_activities_tomorrow').mutation, { selectedIds: ['activity-reschedule-2'], ...actor }) as any;
    expect(tomorrowResult).toMatchObject({ rescheduled_count: 1, due_date: tomorrow });
    const nextWeekResult = await repository.executeMutation(action('reschedule_contact_activities_next_week').mutation, { selectedIds: ['activity-reschedule-3'], ...actor }) as any;
    expect(nextWeekResult).toMatchObject({ rescheduled_count: 1, due_date: nextWeek });
    expect(await repository.query("SELECT id, CAST(due_date AS VARCHAR) AS due_date, row_version FROM base_activities WHERE id IN ('activity-demo', 'activity-reschedule-2', 'activity-reschedule-3') ORDER BY id")).toEqual([
      { id: 'activity-demo', due_date: today, row_version: 2 },
      { id: 'activity-reschedule-2', due_date: tomorrow, row_version: 2 },
      { id: 'activity-reschedule-3', due_date: nextWeek, row_version: 2 },
    ]);
    await database.close();
  });

  test('enforces selection, actor, company, planned-state, and row-version guards', async () => {
    const databasePath = `/tmp/core3-base-contact-activity-reschedule-${crypto.randomUUID()}.duckdb`;
    let database: DuckDbDatabase | undefined;
    try {
      database = await DuckDbDatabase.open(databasePath);
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, migrations, undefined, `base_contact_activity_reschedule_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
      const bulk = action('reschedule_contact_activities_today');
      const row = action('reschedule_contact_activity_tomorrow');
      await expect(repository.executeMutation(bulk.mutation, { selectedIds: [], current_company_id: 'company-demo', current_user_id: 'user-admin' })).rejects.toMatchObject({ status: 400, code: 'BASE_CONTACT_ACTIVITY_SELECTION_REQUIRED' });
      await expect(repository.executeMutation(bulk.mutation, { selectedIds: ['activity-demo'], current_company_id: 'company-demo', current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'BASE_CONTACT_ACTIVITY_ACTOR_REQUIRED' });
      await expect(repository.executeMutation(bulk.mutation, { selectedIds: ['activity-demo'], current_company_id: 'company-vietnam', current_user_id: 'user-admin' })).rejects.toMatchObject({ status: 403, code: 'BASE_CONTACT_ACTIVITY_SCOPE' });
      await expect(repository.executeMutation(row.mutation, { id: 'activity-demo', expected_row_version: 99, current_company_id: 'company-demo', current_user_id: 'user-admin' })).rejects.toMatchObject({ status: 409, code: 'BASE_CONTACT_ACTIVITY_STALE' });

      await repository.executeMutation(row.mutation, { id: 'activity-demo', expected_row_version: 1, current_company_id: 'company-demo', current_user_id: 'user-admin' });
      await expect(repository.executeMutation(row.mutation, { id: 'activity-demo', expected_row_version: 1, current_company_id: 'company-demo', current_user_id: 'user-admin' })).rejects.toMatchObject({ status: 409, code: 'BASE_CONTACT_ACTIVITY_STALE' });
      await repository.run("UPDATE base_activities SET state = 'done' WHERE id = 'activity-demo'");
      await expect(repository.executeMutation(bulk.mutation, { selectedIds: ['activity-demo'], current_company_id: 'company-demo', current_user_id: 'user-admin' })).rejects.toMatchObject({ status: 403, code: 'BASE_CONTACT_ACTIVITY_SCOPE' });
      expect(await repository.query("SELECT row_version FROM base_activities WHERE id = 'activity-demo'")).toEqual([{ row_version: 2 }]);

      await database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, migrations, undefined, 'base_contact_activity_reschedule_restart', ['schema', 'data']);
      expect(await repository.query("SELECT CAST(due_date AS VARCHAR) AS due_date, row_version FROM base_activities WHERE id = 'activity-demo'"))
        .toEqual([expect.objectContaining({ row_version: 2 })]);
    } finally {
      await database?.close();
      rmSync(databasePath, { force: true });
    }
  });
});

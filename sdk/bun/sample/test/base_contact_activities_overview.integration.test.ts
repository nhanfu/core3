import { describe, expect, test } from 'bun:test';
import { readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/base');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const api = yaml('api/activities.yaml');
const page = yaml('pages/activities.yaml');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);
const source = (id: string) => api.datasources.find((candidate: any) => candidate.id === id);

describe('Base Activities overview parity', () => {
  test('maps the Odoo Activity Overview into separate page/API contracts and a workflow', () => {
    const odooView = readFileSync('/home/nhanjs/projects/odoo/addons/mail/views/mail_activity_views.xml', 'utf8');
    const odooMenu = readFileSync('/home/nhanjs/projects/odoo/addons/mail/views/mail_menus.xml', 'utf8');
    const list = page.components.find((component: any) => component.type === 'ListView');

    expect(odooView).toContain('<field name="name">Activity Overview</field>');
    expect(odooView).toContain('name="action_reschedule_nextweek"');
    expect(odooMenu).toContain('action="mail_activity_action"');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'activities', route: '/base-activities' });
    expect(list).toMatchObject({ source: 'activities', create_action: 'create_activity', selectable: true, row_open_action: 'view_activity' });
    expect(list.bulk_actions.map((item: any) => item.id)).toEqual(expect.arrayContaining([
      'complete_activities', 'cancel_activities', 'reschedule_activities_today',
    ]));
    expect(source('activities')).toMatchObject({ permission: 'base.activities.read', workflow: 'base_activities' });
    expect(yaml('pages/activity-workflow.yaml').workflow).toMatchObject({ id: 'base_activities', entity: 'base_activities', permission: 'base.activities.write' });
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('activities')).toEqual(expect.arrayContaining(['activities', 'activity_types', 'activity_states']));
    expect(discovered.pageDatasources.get('activity-detail')).toContain('activity_detail');
  });

  test('seeds idempotent overview rows, reads filters, creates, completes, and persists across restart', async () => {
    const databasePath = `/tmp/core3-base-activities-${crypto.randomUUID()}.duckdb`;
    let database = await DuckDbDatabase.open(databasePath);
    try {
      let repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_activities_overview_migrations', ['schema', 'data']);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_activities_overview_migrations', ['schema', 'data']);

      const rows = await repository.querySource(source('activities'), { q: null, state: null, activity_type: null, timing: null, current_company_id: 'company-demo', fixture_state: null }, 0, 50);
      expect(rows.data).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'activity-overdue', timing: 'overdue', state: 'planned' }),
        expect.objectContaining({ id: 'activity-done', timing: 'done', state: 'done' }),
      ]));
      const doneRows = await repository.querySource(source('activities'), { q: null, state: 'done', activity_type: null, timing: null, current_company_id: 'company-demo', fixture_state: null }, 0, 50);
      expect(doneRows.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'activity-done', state: 'done' })]));

      const created = await repository.executeMutation(action('create_activity').mutation, {
        current_company_id: 'company-demo',
        values: { contact_id: 'contact-demo', summary: 'Standalone overview QA', activity_type: 'call', due_date: '2026-09-25', assigned_user_name: 'Administrator' },
      }) as any;
      expect(created).toMatchObject({ contact_id: 'contact-demo', summary: 'Standalone overview QA', state: 'planned' });
      const createdRow = (await repository.query('SELECT id, row_version FROM base_activities WHERE id = ?', [created.id]))[0] as any;
      expect(createdRow).toMatchObject({ id: created.id, row_version: 1 });
      const completed = await repository.executeMutation(action('complete_activity').mutation, {
        id: created.id, expected_row_version: createdRow.row_version, current_company_id: 'company-demo', current_user_id: 'user-admin', current_user_name: 'Administrator',
        values: { state: 'done', completed_at: '2026-09-22 10:00:00' },
      }) as any;
      expect(completed).toMatchObject({ id: created.id, state: 'done', row_version: createdRow.row_version + 1 });
      expect(await repository.query("SELECT action, detail FROM base_contact_messages WHERE action = 'base.activities.done' AND detail = 'Standalone overview QA'"))
        .toEqual([expect.objectContaining({ action: 'base.activities.done', detail: 'Standalone overview QA' })]);

      await database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_activities_overview_restart', ['schema', 'data']);
      expect(await repository.query('SELECT state FROM base_activities WHERE id = ?', [created.id])).toEqual([{ state: 'done' }]);
    } finally {
      await database.close();
      unlinkSync(databasePath);
    }
  });

  test('enforces read/write permission and company/stale guards', () => {
    expect(source('activities').permission).toBe('base.activities.read');
    expect(action('create_activity').permission).toBe('base.activities.write');
    expect(action('complete_activity').mutation.guards.map((guard: any) => guard.code)).toEqual(expect.arrayContaining(['BASE_ACTIVITY_SCOPE', 'BASE_ACTIVITY_STALE']));
    expect(action('cancel_activity').mutation.concurrency).toEqual({ required: true });
    expect(yaml('pages/activity-detail.yaml').page.auth.require).toContain('base.activities.read');
  });
});

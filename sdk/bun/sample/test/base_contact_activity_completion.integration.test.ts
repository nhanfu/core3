import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/base');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (id: string) => yaml('api/contact-detail.yaml').actions.find((candidate: any) => candidate.id === id);
const source = (id: string) => yaml('api/contact-detail.yaml').datasources.find((candidate: any) => candidate.id === id);

describe('Base contact activity completion parity', () => {
  test('matches Odoo activity list actions and keeps page/API ownership explicit', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/mail/views/mail_activity_views.xml', 'utf8');
    const page = yaml('pages/contact-detail.yaml');
    const activityList = page.components.find((component: any) => component.type === 'ListView' && component.source === 'contact_activities');

    expect(sourceView).toContain('name="action_done"');
    expect(sourceView).toContain('name="action_cancel"');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(activityList).toMatchObject({ source: 'contact_activities', create_action: 'schedule_activity' });
    expect(activityList.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'complete_contact_activity', label: 'Mark done', permission: 'base.activities.write' }),
      expect.objectContaining({ id: 'cancel_contact_activity', label: 'Cancel', permission: 'base.activities.write' }),
    ]));
    expect(source('contact_activities').query).toContain('a.row_version');
    expect(source('contact_activities').query).toContain('a.completed_at');
    expect(action('complete_contact_activity')).toMatchObject({ type: 'server', permission: 'base.activities.write', operation: 'complete_activity' });
    expect(action('cancel_contact_activity')).toMatchObject({ type: 'server', permission: 'base.activities.write', operation: 'cancel_activity' });
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('contact-detail')).toContain('contact_activities');
  });

  test('completes a planned activity with actor, company, persistence, audit, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_contact_activity_completion_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_contact_activity_completion_migrations', ['schema', 'data']);

    const complete = action('complete_contact_activity');
    const activityBefore = await repository.querySource(source('contact_activities'), { id: 'contact-demo', current_company_id: 'company-demo', fixture_state: null }, 0, 50);
    expect(activityBefore.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'activity-demo', state: 'planned', row_version: 1, completed_at: null })]));

    await expect(repository.executeMutation(complete.mutation, {
      id: 'activity-demo', expected_row_version: 1, current_company_id: 'company-demo', current_user_id: '',
      values: { state: 'done', completed_at: '2026-09-22 10:00:00' },
    })).rejects.toMatchObject({ status: 403, code: 'BASE_CONTACT_ACTIVITY_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(complete.mutation, {
      id: 'activity-demo', expected_row_version: 1, current_company_id: 'company-vietnam', current_user_id: 'user-admin',
      values: { state: 'done', completed_at: '2026-09-22 10:00:00' },
    })).rejects.toMatchObject({ status: 403, code: 'BASE_CONTACT_ACTIVITY_COMPANY_FORBIDDEN' });

    const completed = await repository.executeMutation(complete.mutation, {
      id: 'activity-demo', expected_row_version: 1, current_company_id: 'company-demo', current_user_id: 'user-admin', current_user_name: 'Administrator',
      values: { state: 'done', completed_at: '2026-09-22 10:00:00' },
    }) as any;
    expect(completed).toMatchObject({ id: 'activity-demo', contact_id: 'contact-demo', state: 'done', row_version: 2, completed_at: expect.stringContaining('2026-09-22') });
    expect(await repository.query('SELECT state, row_version, completed_at FROM base_activities WHERE id = ?', ['activity-demo'])).toEqual([
      expect.objectContaining({ state: 'done', row_version: 2, completed_at: expect.anything() }),
    ]);
    expect(await repository.query("SELECT actor_id, action, action_label, detail FROM base_contact_messages WHERE action = 'base.contacts.activity.done' AND contact_id = 'contact-demo'")).toEqual([
      expect.objectContaining({ actor_id: 'user-admin', action_label: 'Activity completed', detail: 'Welcome call' }),
    ]);
    expect((await repository.querySource(source('contact_activities'), { id: 'contact-demo', current_company_id: 'company-demo', fixture_state: null }, 0, 50)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'activity-demo', state: 'done', row_version: 2 })]));
    await expect(repository.executeMutation(complete.mutation, {
      id: 'activity-demo', expected_row_version: 1, current_company_id: 'company-demo', current_user_id: 'user-admin',
      values: { state: 'done', completed_at: '2026-09-22 10:00:00' },
    })).rejects.toMatchObject({ status: 409, code: 'BASE_CONTACT_ACTIVITY_STALE' });
    database.close();
  });

  test('cancels a planned activity and records the Odoo-shaped audit entry', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_contact_activity_cancel_migrations', ['schema', 'data']);
    const schedule = action('schedule_activity');
    const cancel = action('cancel_contact_activity');
    const created = await repository.executeMutation(schedule.mutation, {
      values: { contact_id: 'contact-demo', summary: 'Cancel this QA activity', activity_type: 'todo', due_date: '2026-09-25' },
    }) as any;
    const createdRow = (await repository.query('SELECT id, contact_id, state, row_version FROM base_activities WHERE id = ?', [created.id]))[0] as any;
    expect(createdRow).toMatchObject({ id: created.id, contact_id: 'contact-demo', state: 'planned', row_version: 1 });
    await expect(repository.executeMutation(cancel.mutation, {
      id: created.id, expected_row_version: 1, current_company_id: 'company-demo', current_user_id: '',
    })).rejects.toMatchObject({ status: 403, code: 'BASE_CONTACT_ACTIVITY_ACTOR_REQUIRED' });
    const cancelled = await repository.executeMutation(cancel.mutation, {
      id: created.id, expected_row_version: 1, current_company_id: 'company-demo', current_user_id: 'user-admin', current_user_name: 'Administrator',
    }) as any;
    expect(cancelled).toEqual({ id: created.id, cancelled: true });
    expect(await repository.query('SELECT id FROM base_activities WHERE id = ?', [created.id])).toEqual([]);
    expect(await repository.query("SELECT actor_id, action, action_label, detail FROM base_contact_messages WHERE action = 'base.contacts.activity.cancel' AND contact_id = 'contact-demo'")).toEqual([
      expect.objectContaining({ actor_id: 'user-admin', action_label: 'Activity cancelled', detail: 'Cancel this QA activity' }),
    ]);
    await expect(repository.executeMutation(cancel.mutation, {
      id: created.id, expected_row_version: 1, current_company_id: 'company-demo', current_user_id: 'user-admin',
    })).rejects.toMatchObject({ status: 404, code: 'BASE_CONTACT_ACTIVITY_NOT_FOUND' });
    database.close();
  });
});

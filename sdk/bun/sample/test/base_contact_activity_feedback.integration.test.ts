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

describe('Base contact activity feedback parity', () => {
  test('maps Odoo action_feedback into the page/API contact-detail seam', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/mail/models/mail_activity.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/mail/views/mail_activity_views.xml', 'utf8');
    const page = yaml('pages/contact-detail.yaml');
    const activityList = page.components.find((component: any) => component.type === 'ListView' && component.source === 'contact_activities');
    const feedback = action('complete_contact_activity_feedback');

    expect(sourceModel).toContain('def action_feedback(self, feedback=False, attachment_ids=None):');
    expect(sourceModel).toContain('_action_done(feedback=feedback, attachment_ids=attachment_ids)');
    expect(sourceView).toContain('name="action_done"');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(activityList.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'complete_contact_activity_feedback', label: 'Mark done with feedback', permission: 'base.activities.write' }),
    ]));
    expect(source('contact_activities').query).toContain('a.feedback');
    expect(feedback).toMatchObject({ type: 'server_form', permission: 'base.activities.write', operation: 'complete_activity_feedback' });
    expect(feedback.fields).toEqual([{ field: 'feedback', label: 'Feedback', type: 'textarea', required: true }]);
    expect(feedback.mutation.guards.map((guard: any) => guard.code)).toEqual(expect.arrayContaining([
      'BASE_CONTACT_ACTIVITY_FEEDBACK_INVALID',
      'BASE_CONTACT_ACTIVITY_ACTOR_REQUIRED',
      'BASE_CONTACT_ACTIVITY_STALE',
    ]));
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('contact-detail')).toContain('contact_activities');
  });

  test('completes with feedback, persists it, audits it, and rejects invalid or stale submissions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_contact_activity_feedback_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'base_contact_activity_feedback_migrations', ['schema', 'data']);

    const feedback = action('complete_contact_activity_feedback');
    const base = { id: 'activity-demo', expected_row_version: 1, current_company_id: 'company-demo', current_user_id: 'user-admin', current_user_name: 'Administrator' };
    await expect(repository.executeMutation(feedback.mutation, { ...base, current_user_id: '', values: { feedback: 'A valid note' } })).rejects.toMatchObject({ status: 403, code: 'BASE_CONTACT_ACTIVITY_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(feedback.mutation, { ...base, values: { feedback: '   ' } })).rejects.toMatchObject({ status: 422, code: 'BASE_CONTACT_ACTIVITY_FEEDBACK_INVALID' });
    await expect(repository.executeMutation(feedback.mutation, { ...base, values: { feedback: 'Reached the contact and confirmed the renewal date.' } })).resolves.toMatchObject({
      id: 'activity-demo', state: 'done', feedback: 'Reached the contact and confirmed the renewal date.', row_version: 2,
    });
    expect(await repository.query('SELECT state, feedback, row_version, completed_at FROM base_activities WHERE id = ?', ['activity-demo'])).toEqual([
      expect.objectContaining({ state: 'done', feedback: 'Reached the contact and confirmed the renewal date.', row_version: 2, completed_at: expect.anything() }),
    ]);
    expect(await repository.query("SELECT actor_id, action, action_label, detail FROM base_contact_messages WHERE action = 'base.contacts.activity.feedback' AND contact_id = 'contact-demo'")).toEqual([
      expect.objectContaining({ actor_id: 'user-admin', action_label: 'Activity completed with feedback', detail: 'Welcome call — Reached the contact and confirmed the renewal date.' }),
    ]);
    await expect(repository.executeMutation(feedback.mutation, { ...base, values: { feedback: 'Second completion' } })).rejects.toMatchObject({ status: 409, code: 'BASE_CONTACT_ACTIVITY_STALE' });
    database.close();
  });
});

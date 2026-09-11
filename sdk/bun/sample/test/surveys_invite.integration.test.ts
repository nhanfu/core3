import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

describe('Surveys share and invite parity', () => {
  test('joins the share dialog action to the survey page by page.id', () => {
    const page = yaml('pages/surveys.yaml');
    const api = yaml('api/surveys.yaml');
    const detailPage = yaml('pages/survey-detail.yaml');
    const detailApi = yaml('api/survey-detail.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const form = detailPage.components.find((component: any) => component.type === 'OdooFormView');
    const share = action(api, 'share_survey');
    const detailShare = action(detailApi, 'share_survey_detail');

    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    expect(list.actions).toContainEqual(expect.objectContaining({ id: 'share_survey', label: 'Share' }));
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'share_survey_detail', label: 'Share' }));
    expect(share).toMatchObject({ type: 'server_form', permission: 'surveys.write', action: 'surveys.invites.send', handler: 'yaml_mutation', operation: 'create', title: 'Share a Survey' });
    expect(detailShare).toMatchObject({ type: 'server_form', permission: 'surveys.write', action: 'surveys.invites.send', handler: 'yaml_mutation' });
    expect(share.fields.map((field: any) => field.label)).toEqual([
      'Survey Link', 'Send by Email', 'Recipients', 'Additional emails', 'Subject',
      'Message', 'Attachments', 'Answer deadline', 'Mail Template',
    ]);
    expect(share.mutation).toMatchObject({ operation: 'insert', table: 'survey_invites', generated: ['id'] });
    expect(share.mutation.guards.map((guard: any) => [guard.status, guard.code])).toEqual([
      [409, 'SURVEY_INVITE_SURVEY_CHANGED'],
      [422, 'SURVEY_INVITE_TOKEN_REQUIRED'],
      [422, 'SURVEY_INVITE_RECIPIENTS_REQUIRED'],
      [422, 'SURVEY_INVITE_MESSAGE_REQUIRED'],
    ]);
    expect(String(share.mutation.guards[0].query)).toContain("state <> 'Archived'");
    expect(String(share.mutation.steps[1].query)).toContain('row_version = :expected_row_version');
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('surveys')).toContain('surveys');
  });

  test('seeds deterministic link and sent invite states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_invite_seed_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_invite_seed_migrations', ['schema', 'data']);
    const api = yaml('api/surveys.yaml');
    const source = api.datasources.find((entry: any) => entry.id === 'surveys');
    const rows = await repository.querySource(source, { q: null, state: null }, 0, 50);
    expect(rows.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Feedback Form', share_url: '/survey/start/b135640d-14d4-4748-9ef6-344ca256531e' }),
      expect.objectContaining({ title: 'MyCompany Vendor Certification', invite_subject: 'Participate to MyCompany Vendor Certification survey' }),
    ]));
    expect(await repository.query('SELECT id, state, send_email FROM survey_invites ORDER BY id')).toEqual([
      { id: 'invite-certification-sent', state: 'Sent', send_email: true },
      { id: 'invite-feedback-link', state: 'Link ready', send_email: false },
    ]);
    database.close();
  });

  test('guards link sharing, email recipients, archived surveys, and stale versions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_invite_mutation_migrations', ['schema', 'data']);
    const share = action(yaml('api/surveys.yaml'), 'share_survey');
    const common = {
      survey_id: 'survey-demo-feedback',
      survey_name: 'Feedback Form',
      expected_row_version: 1,
      values: {
        survey_link: '/survey/start/b135640d-14d4-4748-9ef6-344ca256531e',
        send_email: false,
        recipients: '',
        additional_emails: '',
        subject: 'Participate to Feedback Form survey',
        body: 'Dear participant',
        attachment_names: '',
        deadline: '2026-01-30',
        mail_template: 'Survey: Invite',
      },
    };
    const link = await repository.executeMutation(share.mutation, { ...common, id: '' });
    expect(link).toMatchObject({ state: 'Link ready', survey_id: 'survey-demo-feedback', send_email: false });
    expect((await repository.query('SELECT row_version FROM surveys WHERE id = ?', ['survey-demo-feedback']))[0]).toEqual({ row_version: 2 });

    await expect(repository.executeMutation(share.mutation, {
      ...common,
      id: '',
      expected_row_version: 2,
      values: { ...common.values, send_email: true },
    })).rejects.toMatchObject({ status: 422, code: 'SURVEY_INVITE_RECIPIENTS_REQUIRED' });

    await repository.run("UPDATE surveys SET access_token = NULL WHERE id = 'survey-demo-feedback'");
    await expect(repository.executeMutation(share.mutation, {
      ...common,
      id: '',
      expected_row_version: 2,
    })).rejects.toMatchObject({ status: 422, code: 'SURVEY_INVITE_TOKEN_REQUIRED' });
    await repository.run("UPDATE surveys SET access_token = 'b135640d-14d4-4748-9ef6-344ca256531e' WHERE id = 'survey-demo-feedback'");

    await repository.run("UPDATE surveys SET state = 'Archived' WHERE id = 'survey-demo-feedback'");
    await expect(repository.executeMutation(share.mutation, {
      ...common,
      id: '',
      expected_row_version: 2,
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_INVITE_SURVEY_CHANGED' });

    await repository.run("UPDATE surveys SET state = 'Published' WHERE id = 'survey-demo-feedback'");
    await expect(repository.executeMutation(share.mutation, {
      ...common,
      id: '',
      expected_row_version: 1,
    })).rejects.toMatchObject({ status: 409, code: 'SURVEY_INVITE_SURVEY_CHANGED' });

    const email = await repository.executeMutation(share.mutation, {
      ...common,
      id: '',
      expected_row_version: 2,
      values: { ...common.values, send_email: true, additional_emails: 'qa@example.com' },
    });
    expect(email).toMatchObject({ state: 'Sent', send_email: true, additional_emails: 'qa@example.com' });
    expect((await repository.query('SELECT state, row_version FROM survey_invites WHERE id = ?', [email.id]))[0]).toMatchObject({ state: 'Sent', row_version: 1 });
    database.close();
  });
});

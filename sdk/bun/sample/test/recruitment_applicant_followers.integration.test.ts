import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const api = yaml('api/applicants.yaml');
const action = (id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Recruitment applicant followers parity action', () => {
  test('joins the Odoo list and kanban follower wizard through the applicants page contract', () => {
    const page = yaml('pages/applicants.yaml');
    const followerAction = action('edit_recruitment_applicant_followers');

    expect(page.page).toMatchObject({ id: 'applicants', auth: { require: ['recruitment.read'] } });
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.map((source: any) => source.id)).toEqual(expect.arrayContaining([
      'recruitment_applicants', 'recruitment_applicant_follower_options',
    ]));
    expect(page.components[0].bulk_actions).toContainEqual({
      id: 'edit_recruitment_applicant_followers', label: 'Add/Remove Followers', permission: 'recruitment.write',
    });
    expect(followerAction).toMatchObject({
      type: 'server_form', title: 'Add/Remove Followers', submit_label: 'Update Followers',
      cancel_label: 'Discard', permission: 'recruitment.write', handler: 'yaml_mutation',
    });
    expect(followerAction.fields.map((field: any) => field.label)).toEqual([
      'Applications', 'Operation', 'Followers', 'Notify Recipients', 'Extra Comments',
    ]);
    expect(followerAction.fields.find((field: any) => field.field === 'partner_ids')).toMatchObject({
      type: 'multi-select', multiple: true, options_source: 'recruitment_applicant_follower_options', required: true,
    });
  });

  test('seeds active follower contacts, existing subscriptions, and idempotent migration state', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = 'recruitment_applicant_followers_seed';
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);

    const options = await repository.querySource(api.datasources.find((source: any) => source.id === 'recruitment_applicant_follower_options'), {}, 0, 50);
    expect(options.data.map((row: any) => row.value)).toEqual([
      'recruitment-contact-recruiter', 'recruitment-contact-hiring-panel',
      'recruitment-contact-interviewer', 'recruitment-contact-hr-manager',
    ]);
    expect(await repository.query("SELECT applicant_id, contact_id FROM recruitment_applicant_followers ORDER BY applicant_id, contact_id")).toEqual([
      { applicant_id: 'applicant-demo-001', contact_id: 'recruitment-contact-hr-manager' },
      { applicant_id: 'applicant-demo-002', contact_id: 'recruitment-contact-recruiter' },
    ]);
    expect(await repository.query("SELECT COUNT(*) AS count FROM recruitment_follower_contacts")).toEqual([{ count: 5 }]);
    database.close();
  });

  test('adds/removes multiple followers atomically and records optional notification audit', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_applicant_followers_mutation', ['schema', 'data']);
    const followerAction = action('edit_recruitment_applicant_followers');
    const values = {
      selectedIds: ['applicant-demo-001', 'applicant-demo-003'],
      operation: 'add',
      partner_ids: ['recruitment-contact-interviewer', 'recruitment-contact-hiring-panel'],
      notify: true,
      message: 'Please follow the interview updates.',
      current_user_name: 'Recruitment Manager',
      current_company_name: 'Core3 Demo Company',
    };

    const added = await repository.executeMutation(followerAction.mutation, { values });
    expect(added).toBeDefined();
    expect(await repository.query("SELECT applicant_id, contact_id FROM recruitment_applicant_followers WHERE applicant_id IN ('applicant-demo-001', 'applicant-demo-003') ORDER BY applicant_id, contact_id")).toEqual([
      { applicant_id: 'applicant-demo-001', contact_id: 'recruitment-contact-hiring-panel' },
      { applicant_id: 'applicant-demo-001', contact_id: 'recruitment-contact-hr-manager' },
      { applicant_id: 'applicant-demo-001', contact_id: 'recruitment-contact-interviewer' },
      { applicant_id: 'applicant-demo-003', contact_id: 'recruitment-contact-hiring-panel' },
      { applicant_id: 'applicant-demo-003', contact_id: 'recruitment-contact-interviewer' },
    ]);
    expect(await repository.query("SELECT COUNT(*) AS count FROM recruitment_applicant_follower_events WHERE operation = 'add' AND notify = TRUE")).toEqual([{ count: 4 }]);

    await repository.executeMutation(followerAction.mutation, { values });
    expect(await repository.query("SELECT COUNT(*) AS count FROM recruitment_applicant_follower_events WHERE operation = 'add' AND notify = TRUE")).toEqual([{ count: 4 }]);
    await repository.executeMutation(followerAction.mutation, { values: { ...values, operation: 'remove', notify: false, message: '' } });
    expect(await repository.query("SELECT applicant_id, contact_id FROM recruitment_applicant_followers WHERE applicant_id = 'applicant-demo-003'")).toEqual([]);
    database.close();
  });

  test('rejects invalid contacts/company scope and retains subscriptions after restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-recruitment-applicant-followers-'));
    const databasePath = join(directory, 'followers.duckdb');
    const migrationName = `recruitment_applicant_followers_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const followerAction = action('edit_recruitment_applicant_followers');
    const baseValues = {
      selectedIds: ['applicant-demo-003'], operation: 'add', partner_ids: ['recruitment-contact-interviewer'],
      notify: false, message: '', current_user_name: 'Recruitment Manager', current_company_name: 'Core3 Demo Company',
    };
    let database = await DuckDbDatabase.open(databasePath);
    let repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    await expect(repository.executeMutation(followerAction.mutation, { values: { ...baseValues, partner_ids: ['recruitment-contact-archived'] } }))
      .rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_FOLLOWERS_CONTACT_INVALID' });
    await expect(repository.executeMutation(followerAction.mutation, { values: { ...baseValues, current_company_name: 'Other Company' } }))
      .rejects.toMatchObject({ status: 403, code: 'RECRUITMENT_FOLLOWERS_COMPANY_FORBIDDEN' });
    await expect(repository.executeMutation(followerAction.mutation, { values: { ...baseValues, operation: 'remove', notify: true } }))
      .rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_FOLLOWERS_NOTIFY_INVALID' });
    await repository.executeMutation(followerAction.mutation, { values: baseValues });
    database.close();

    database = await DuckDbDatabase.open(databasePath);
    repository = new YamlRepository(database);
    expect(await repository.query("SELECT applicant_id, contact_id FROM recruitment_applicant_followers WHERE applicant_id = 'applicant-demo-003'")).toEqual([
      { applicant_id: 'applicant-demo-003', contact_id: 'recruitment-contact-interviewer' },
    ]);
    database.close();
    rmSync(directory, { recursive: true, force: true });
  });
});

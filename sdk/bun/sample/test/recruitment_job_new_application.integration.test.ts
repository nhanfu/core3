import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages, discoverPageRoutes } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = () => yaml('api/opening-detail.yaml').actions.find((entry: any) => entry.id === 'create_recruitment_application_from_opening');

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const repo = new YamlRepository(database);
  await migrateDatabase(repo, join(root, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repo };
}

describe('Recruitment job-position New Application action', () => {
  test('traces Odoo action_hr_job_new_application and joins detail page/API by page.id', () => {
    const odoo = readFileSync('/home/nhanjs/projects/odoo/addons/hr_recruitment/views/hr_job_views.xml', 'utf8');
    const page = yaml('pages/opening-detail.yaml');
    const api = yaml('api/opening-detail.yaml');
    const manifest = yaml('manifest.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(odoo).toContain('<record model="ir.actions.act_window" id="action_hr_job_new_application">');
    expect(odoo).toContain('<field name="name">New Application</field>');
    expect(odoo).toContain("'default_job_id': active_id");
    expect(page.page).toMatchObject({ id: 'recruitment-opening-detail', route: '/openings/detail', auth: { require: ['recruitment.read'] } });
    expect(api.page.id).toBe(page.page.id);
    expect(page.datasources).toBeUndefined();
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'create_recruitment_application_from_opening', label: 'New Application' }));
    expect(action()).toMatchObject({ action: 'recruitment.job.new_application', permission: 'recruitment.write', operation: 'create', submit_label: 'Create', cancel_label: 'Discard' });
    expect(action().fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'name', required: true }),
      expect.objectContaining({ field: 'email', required: true }),
      expect.objectContaining({ field: 'opening_id', type: 'hidden' }),
    ]));
    expect(discovered.pages.get('recruitment-opening-detail')).toBeTruthy();
    expect(discovered.pageDatasources.get('recruitment-opening-detail')).toContain('recruitment_opening_detail');
    expect(discoverPageRoutes(discovered)).toContainEqual(expect.objectContaining({ path: '/openings/detail', page: 'recruitment-opening-detail', module: 'recruitment' }));
    expect(manifest.menu.groups.find((group: any) => group.id === 'hiring').items).toContainEqual(expect.objectContaining({ path: '/openings', label: 'Job Openings' }));
  });

  test('loads a company-scoped opening and persists a new application after reload', async () => {
    const { database, repo } = await repository('recruitment_job_new_application_create');
    const api = yaml('api/opening-detail.yaml');
    const detail = api.datasources.find((source: any) => source.id === 'recruitment_opening_detail');
    expect(await repo.querySource(detail, { id: 'opening-demo-001', current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 1)).toMatchObject({
      data: { id: 'opening-demo-001', company_name: 'Core3 Demo Company', application_count: 3 },
    });

    const result = await repo.executeMutation(action().mutation, {
      opening_id: 'opening-demo-001',
      opening_name: 'JOB/2026/0001',
      expected_row_version: 1,
      current_user_name: 'Recruitment QA',
      current_company_name: 'Core3 Demo Company',
      values: { name: 'Jordan New Applicant', email: 'jordan.new@example.com', phone: '+1 555 0100', source: 'Website', recruiter: 'Maya Singh', rating: 'Good', priority: 'High', notes: 'Created from the job position.' },
    });
    expect(result).toMatchObject({ id: 'recruitment-applicant-job-opening-demo-001-jordan-new-applicant-4', name: 'Jordan New Applicant', opening_id: 'opening-demo-001', opening_name: 'JOB/2026/0001', stage: 'New', archived: false, company_name: 'Core3 Demo Company', row_version: 1 });
    expect((await repo.querySource(detail, { id: 'opening-demo-001', current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 1)).data.application_count).toBe(4);
    await database.close();
  });

  test('guards actor, missing/closed/company-scoped/stale openings, and invalid details atomically', async () => {
    const { database, repo } = await repository('recruitment_job_new_application_guards');
    const create = action();
    const base = { opening_id: 'opening-demo-001', opening_name: 'JOB/2026/0001', expected_row_version: 1, current_user_name: 'Recruitment QA', current_company_name: 'Core3 Demo Company', values: { name: 'Guard Candidate', email: 'guard@example.com' } };
    await expect(repo.executeMutation(create.mutation, { ...base, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'RECRUITMENT_JOB_NEW_APPLICATION_ACTOR_REQUIRED' });
    await expect(repo.executeMutation(create.mutation, { ...base, opening_id: 'missing-opening' })).rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_JOB_NEW_APPLICATION_OPENING_NOT_FOUND' });
    await expect(repo.executeMutation(create.mutation, { ...base, opening_id: 'opening-demo-003', opening_name: 'JOB/2026/0003' })).rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_JOB_NEW_APPLICATION_OPENING_NOT_FOUND' });
    await expect(repo.executeMutation(create.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'RECRUITMENT_JOB_NEW_APPLICATION_COMPANY_FORBIDDEN' });
    await expect(repo.executeMutation(create.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_JOB_NEW_APPLICATION_STALE' });
    await expect(repo.executeMutation(create.mutation, { ...base, values: { name: '', email: 'guard@example.com' } })).rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_JOB_NEW_APPLICATION_NAME_INVALID' });
    await expect(repo.executeMutation(create.mutation, { ...base, values: { name: 'Invalid Email', email: 'not-an-email' } })).rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_JOB_NEW_APPLICATION_EMAIL_INVALID' });
    expect(await repo.query("SELECT COUNT(*) AS count FROM recruitment_applicants WHERE name = 'Guard Candidate' OR name = 'Invalid Email'")).toEqual([{ count: 0 }]);
    await database.close();
  });

  test('keeps the created application durable across a file-backed restart', async () => {
    const dbPath = join('/tmp', `core3-recruitment-job-new-application-${Date.now()}.duckdb`);
    const firstDatabase = await DuckDbDatabase.open(dbPath);
    const first = new YamlRepository(firstDatabase);
    await migrateDatabase(first, join(root, 'migrations'), undefined, 'recruitment_job_new_application_restart', ['schema', 'data']);
    await first.executeMutation(action().mutation, {
      opening_id: 'opening-demo-002', opening_name: 'JOB/2026/0002', expected_row_version: 1,
      current_user_name: 'Recruitment QA', current_company_name: 'Core3 Demo Company',
      values: { name: 'Restarted Applicant', email: 'restart@example.com' },
    });
    await firstDatabase.close();

    const secondDatabase = await DuckDbDatabase.open(dbPath);
    const second = new YamlRepository(secondDatabase);
    await migrateDatabase(second, join(root, 'migrations'), undefined, 'recruitment_job_new_application_restart', ['schema', 'data']);
    expect(await second.query("SELECT name, opening_id, stage, company_name FROM recruitment_applicants WHERE email = 'restart@example.com'"))
      .toEqual([{ name: 'Restarted Applicant', opening_id: 'opening-demo-002', stage: 'New', company_name: 'Core3 Demo Company' }]);
    await secondDatabase.close();
  });
});

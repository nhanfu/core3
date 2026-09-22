import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const api = () => yaml('api/talent-pool-talents.yaml');
const detailApi = () => yaml('api/applicant-detail.yaml');
const action = (id: string) => api().actions.find((candidate: any) => candidate.id === id);

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const repo = new YamlRepository(database);
  await migrateDatabase(repo, join(root, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repo };
}

describe('Recruitment applicant Create Applications parity action', () => {
  test('joins the talent page/API by page.id and declares the Odoo wizard contract', () => {
    const page = yaml('pages/talent-pool-talents.yaml');
    const fragment = api();
    const create = action('create_recruitment_applications');

    expect(page.page).toMatchObject({ id: 'recruitment-talent-pool-talents', route: '/recruitment/talent-pools/talents' });
    expect(fragment.page.id).toBe(page.page.id);
    expect(fragment.datasources.map((source: any) => source.id)).toEqual(expect.arrayContaining(['recruitment_talent_pool_members', 'recruitment_job_application_options']));
    expect(page.components[0]).toMatchObject({ selectable: true, bulk_actions: [{ id: 'create_recruitment_applications', label: 'Create Applications', permission: 'recruitment.manage' }] });
    expect(create).toMatchObject({ title: 'Create Applications', submit_label: 'Create Applications', cancel_label: 'Discard', permission: 'recruitment.manage' });
    expect(create.fields).toEqual([expect.objectContaining({ field: 'job_ids', type: 'multi-select', multiple: true, required: true })]);
    expect(String(create.mutation.steps[0].query)).toContain('pool_applicant_id');
  });

  test('creates one durable application per selected talent and job, preserving source data', async () => {
    const { database, repo } = await repository('recruitment_applicant_job_applications_create');
    const create = action('create_recruitment_applications');
    const result = await repo.executeMutation(create.mutation, {
      selectedIds: ['talent-member-developers-001', 'talent-member-developers-002'],
      job_ids: ['opening-demo-002', 'opening-demo-003'],
      current_user_name: 'Recruitment Team',
      current_company_name: 'Core3 Demo Company',
    });

    expect(result).toMatchObject({ pool_applicant_id: 'applicant-demo-001', opening_id: 'opening-demo-002', name: 'Demo Candidate' });
    expect(await repo.query("SELECT COUNT(*) AS count FROM recruitment_applicants WHERE pool_applicant_id IN ('applicant-demo-001', 'applicant-demo-002')")).toEqual([{ count: 4 }]);
    expect(await repo.query("SELECT COUNT(*) AS count FROM recruitment_applicants WHERE name = 'Demo Candidate'")).toEqual([{ count: 3 }]);
    database.close();
  });

  test('rejects empty, missing, archived, cross-company, and invalid-position requests atomically', async () => {
    const { database, repo } = await repository('recruitment_applicant_job_applications_guards');
    const create = action('create_recruitment_applications');
    const base = { job_ids: ['opening-demo-002'], current_user_name: 'Recruitment Team', current_company_name: 'Core3 Demo Company' };

    await expect(repo.executeMutation(create.mutation, { ...base, selectedIds: [] })).rejects.toMatchObject({ status: 400, code: 'RECRUITMENT_JOB_APPLICATIONS_SELECTION_REQUIRED' });
    await expect(repo.executeMutation(create.mutation, { ...base, selectedIds: ['missing-member'] })).rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_JOB_APPLICATIONS_APPLICANT_NOT_FOUND' });
    await expect(repo.executeMutation(create.mutation, { ...base, selectedIds: ['talent-member-engineering-004'] })).rejects.toMatchObject({ status: 403, code: 'RECRUITMENT_JOB_APPLICATIONS_COMPANY_FORBIDDEN' });
    await expect(repo.executeMutation(create.mutation, { ...base, selectedIds: ['talent-member-developers-001'], job_ids: ['missing-opening'] })).rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_JOB_APPLICATIONS_JOB_INVALID' });
    await expect(repo.executeMutation(create.mutation, { ...base, selectedIds: ['talent-member-developers-001'], current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'RECRUITMENT_JOB_APPLICATIONS_ACTOR_REQUIRED' });
    expect(await repo.query("SELECT COUNT(*) AS count FROM recruitment_applicants WHERE pool_applicant_id IS NOT NULL")).toEqual([{ count: 0 }]);
    database.close();
  });

  test('keeps created applications and source counters after a file-backed restart', async () => {
    const dbPath = join('/tmp', `core3-recruitment-job-applications-${Date.now()}.duckdb`);
    const firstDatabase = await DuckDbDatabase.open(dbPath);
    const first = new YamlRepository(firstDatabase);
    await migrateDatabase(first, join(root, 'migrations'), undefined, 'recruitment_applicant_job_applications_restart', ['schema', 'data']);
    await first.executeMutation(action('create_recruitment_applications').mutation, {
      selectedIds: ['talent-member-developers-001'],
      job_ids: ['opening-demo-002'],
      current_user_name: 'Recruitment Team',
      current_company_name: 'Core3 Demo Company',
    });
    firstDatabase.close();

    const secondDatabase = await DuckDbDatabase.open(dbPath);
    const second = new YamlRepository(secondDatabase);
    await migrateDatabase(second, join(root, 'migrations'), undefined, 'recruitment_applicant_job_applications_restart', ['schema', 'data']);
    const members = api().datasources.find((source: any) => source.id === 'recruitment_talent_pool_members');
    expect((await second.querySource(members, { pool_id: 'talent-pool-developers', q: null, fixture_state: null }, 0, 50)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ applicant_id: 'applicant-demo-001', created_application_count: 1 })]));
    expect(await second.query("SELECT name, opening_id, pool_applicant_id FROM recruitment_applicants WHERE id = 'recruitment-applicant-job-applicant-demo-001-opening-demo-002-1'")).toEqual([
      { name: 'Demo Candidate', opening_id: 'opening-demo-002', pool_applicant_id: 'applicant-demo-001' },
    ]);
    secondDatabase.close();
  });

  test('exposes the same wizard from a pool applicant detail with a stale-row guard', async () => {
    const detailAction = detailApi().actions.find((candidate: any) => candidate.id === 'create_recruitment_applications_from_detail');
    expect(detailAction).toMatchObject({ title: 'Create Applications', permission: 'recruitment.write', params: { source_applicant_id: '{state.id}' } });
    expect(detailApi().datasources.find((source: any) => source.id === 'recruitment_applicant_detail').query).toContain('is_pool_applicant');
    const { database, repo } = await repository('recruitment_applicant_job_applications_detail');
    const base = { source_applicant_id: 'applicant-demo-001', expected_row_version: 1, job_ids: ['opening-demo-002'], current_user_name: 'Recruitment Team', current_company_name: 'Core3 Demo Company' };

    await expect(repo.executeMutation(detailAction.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_JOB_APPLICATIONS_STALE' });
    await expect(repo.executeMutation(detailAction.mutation, { ...base, source_applicant_id: 'applicant-talent-pool-005' })).rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_JOB_APPLICATIONS_APPLICANT_NOT_FOUND' });
    const created = await repo.executeMutation(detailAction.mutation, base);
    expect(created).toMatchObject({ pool_applicant_id: 'applicant-demo-001', opening_id: 'opening-demo-002', name: 'Demo Candidate' });
    database.close();
  });
});

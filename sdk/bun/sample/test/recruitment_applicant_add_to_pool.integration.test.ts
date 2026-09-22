import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const listApi = () => yaml('api/applicants.yaml');
const detailApi = () => yaml('api/applicant-detail.yaml');
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const repo = new YamlRepository(database);
  await migrateDatabase(repo, root + '/migrations', undefined, name, ['schema', 'data']);
  return { database, repo };
}

describe('Recruitment applicant Add to Pool parity action', () => {
  test('maps the Odoo form/list action to separate page/API contracts', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_recruitment/models/hr_applicant.py', 'utf8');
    const applicantView = readFileSync('/home/nhanjs/projects/odoo/addons/hr_recruitment/views/hr_applicant_views.xml', 'utf8');
    const page = yaml('pages/applicants.yaml');
    const detailPage = yaml('pages/applicant-detail.yaml');
    const list = listApi();
    const detail = detailApi();
    const bulk = action(list, 'add_recruitment_applicants_to_pool');
    const single = action(detail, 'add_recruitment_applicant_to_pool');

    expect(source).toContain('def action_talent_pool_add_applicants(self):');
    expect(applicantView).toContain('name="action_talent_pool_add_applicants"');
    expect(page.page.id).toBe('applicants');
    expect(detailPage.page.id).toBe('applicant-detail');
    expect(list.page.id).toBe(page.page.id);
    expect(detail.page.id).toBe(detailPage.page.id);
    expect(page.components[0].bulk_actions).toContainEqual({ id: 'add_recruitment_applicants_to_pool', label: 'Add to Pool', permission: 'recruitment.write' });
    expect(detailPage.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'add_recruitment_applicant_to_pool', permission: 'recruitment.write' }));
    expect(bulk).toMatchObject({ type: 'server_form', operation: 'bulk_create', handler: 'yaml_mutation', permission: 'recruitment.write' });
    expect(single).toMatchObject({ type: 'server_form', operation: 'bulk_create', handler: 'yaml_mutation', permission: 'recruitment.write', params: { source_applicant_id: '{state.id}' } });
    expect(bulk.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'pool_ids', type: 'multi-select', multiple: true, required: true }),
      expect.objectContaining({ field: 'tag_ids', type: 'multi-select', multiple: true }),
    ]));
    expect(list.datasources.map((source: any) => source.id)).toEqual(expect.arrayContaining(['recruitment_active_talent_pool_options', 'recruitment_applicant_tag_options']));
  });

  test('copies a normal applicant, links the pool, applies tags, and is idempotent', async () => {
    const { database, repo } = await repository('recruitment_applicant_add_to_pool_create');
    const add = action(listApi(), 'add_recruitment_applicants_to_pool');
    const params = {
      selectedIds: ['applicant-talent-pool-005'],
      pool_ids: ['talent-pool-developers', 'talent-pool-engineering'],
      tag_ids: ['recruitment-tag-it'],
      current_user_name: 'Recruitment Team',
      current_company_name: 'Core3 Demo Company',
    };

    const created = await repo.executeMutation(add.mutation, params);
    expect(created).toMatchObject({ pool_id: 'talent-pool-developers', applicant_id: 'recruitment-applicant-pool-applicant-talent-pool-005' });
    expect(await repo.query("SELECT COUNT(*) AS count FROM recruitment_talent_pool_members WHERE applicant_id = 'recruitment-applicant-pool-applicant-talent-pool-005'")).toEqual([{ count: 2 }]);
    expect(await repo.query("SELECT id, opening_id, opening_name, pool_applicant_id FROM recruitment_applicants WHERE id = 'recruitment-applicant-pool-applicant-talent-pool-005'")).toEqual([
      { id: 'recruitment-applicant-pool-applicant-talent-pool-005', opening_id: 'opening-demo-001', opening_name: 'JOB/2026/0001', pool_applicant_id: 'recruitment-applicant-pool-applicant-talent-pool-005' },
    ]);
    expect(await repo.query("SELECT pool_id, applicant_id FROM recruitment_talent_pool_members WHERE applicant_id = 'recruitment-applicant-pool-applicant-talent-pool-005' ORDER BY pool_id")).toEqual([
      { pool_id: 'talent-pool-developers', applicant_id: 'recruitment-applicant-pool-applicant-talent-pool-005' },
      { pool_id: 'talent-pool-engineering', applicant_id: 'recruitment-applicant-pool-applicant-talent-pool-005' },
    ]);
    expect(await repo.query("SELECT applicant_id, tag_id, added_by FROM recruitment_applicant_tags WHERE applicant_id = 'recruitment-applicant-pool-applicant-talent-pool-005'")).toEqual([
      { applicant_id: 'recruitment-applicant-pool-applicant-talent-pool-005', tag_id: 'recruitment-tag-it', added_by: 'Recruitment Team' },
    ]);
    await repo.executeMutation(add.mutation, params);
    expect(await repo.query("SELECT COUNT(*) AS count FROM recruitment_talent_pool_members WHERE applicant_id = 'recruitment-applicant-pool-applicant-talent-pool-005'")).toEqual([{ count: 2 }]);
    database.close();
  });

  test('adds existing pool applicants without cloning and rejects invalid requests atomically', async () => {
    const { database, repo } = await repository('recruitment_applicant_add_to_pool_guards');
    const add = action(listApi(), 'add_recruitment_applicants_to_pool');
    const base = { pool_ids: ['talent-pool-leadership'], current_user_name: 'Recruitment Team', current_company_name: 'Core3 Demo Company' };

    const existing = await repo.executeMutation(add.mutation, { ...base, selectedIds: ['applicant-demo-001'], tag_ids: [] });
    expect(existing).toEqual({ id: 'talent-member-applicant-demo-001-talent-pool-leadership', pool_id: 'talent-pool-leadership', applicant_id: 'applicant-demo-001', pool_name: 'Leadership Shortlist' });
    expect(await repo.query("SELECT COUNT(*) AS count FROM recruitment_applicants WHERE id LIKE 'recruitment-applicant-pool-applicant-demo-001%'")).toEqual([{ count: 0 }]);

    await expect(repo.executeMutation(add.mutation, { ...base, selectedIds: [] })).rejects.toMatchObject({ status: 400, code: 'RECRUITMENT_TALENT_POOL_ADD_SELECTION_REQUIRED' });
    await expect(repo.executeMutation(add.mutation, { ...base, selectedIds: ['applicant-demo-004'] })).rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_TALENT_POOL_ADD_APPLICANT_INACTIVE' });
    await expect(repo.executeMutation(add.mutation, { ...base, selectedIds: ['missing-applicant'] })).rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_TALENT_POOL_ADD_APPLICANT_NOT_FOUND' });
    await expect(repo.executeMutation(add.mutation, { ...base, selectedIds: ['applicant-demo-002'], pool_ids: ['talent-pool-archived'] })).rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_TALENT_POOL_ADD_POOL_INVALID' });
    await expect(repo.executeMutation(add.mutation, { ...base, selectedIds: ['applicant-demo-002'], current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'RECRUITMENT_TALENT_POOL_ADD_ACTOR_REQUIRED' });
    expect(await repo.query("SELECT COUNT(*) AS count FROM recruitment_talent_pool_members WHERE applicant_id = 'applicant-demo-002' AND pool_id = 'talent-pool-archived'")).toEqual([{ count: 0 }]);
    database.close();
  });

  test('supports the applicant detail action and persists across restart', async () => {
    const dbPath = join('/tmp', `core3-recruitment-applicant-add-pool-${Date.now()}.duckdb`);
    const firstDatabase = await DuckDbDatabase.open(dbPath);
    const first = new YamlRepository(firstDatabase);
    await migrateDatabase(first, root + '/migrations', undefined, 'recruitment_applicant_add_to_pool_restart', ['schema', 'data']);
    const add = action(detailApi(), 'add_recruitment_applicant_to_pool');
    await first.executeMutation(add.mutation, {
      source_applicant_id: 'applicant-talent-pool-006',
      pool_ids: ['talent-pool-leadership'],
      tag_ids: [],
      current_user_name: 'Recruitment Team',
      current_company_name: 'Core3 Demo Company',
    });
    firstDatabase.close();

    const secondDatabase = await DuckDbDatabase.open(dbPath);
    const second = new YamlRepository(secondDatabase);
    await migrateDatabase(second, root + '/migrations', undefined, 'recruitment_applicant_add_to_pool_restart', ['schema', 'data']);
    expect(await second.query("SELECT a.pool_applicant_id, m.pool_id FROM recruitment_applicants a JOIN recruitment_talent_pool_members m ON m.applicant_id = a.pool_applicant_id WHERE a.id = 'applicant-talent-pool-006'")).toEqual([
      { pool_applicant_id: 'recruitment-applicant-pool-applicant-talent-pool-006', pool_id: 'talent-pool-leadership' },
    ]);
    secondDatabase.close();
  });
});

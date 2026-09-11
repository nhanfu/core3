import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages, discoverPageRoutes } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const listApi = () => yaml('api/talent-pools.yaml');
const detailApi = () => yaml('api/talent-pool-detail.yaml');
const membersApi = () => yaml('api/talent-pool-talents.yaml');
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Recruitment Talent Pools parity action', () => {
  test('joins list, kanban, form, and membership pages to API fragments by page.id', () => {
    const poolPage = yaml('pages/talent-pools.yaml');
    const detailPage = yaml('pages/talent-pool-detail.yaml');
    const membersPage = yaml('pages/talent-pool-talents.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(poolPage.page).toMatchObject({ id: 'recruitment-talent-pools', route: '/recruitment/talent-pools', auth: { require: ['recruitment.read'] } });
    expect(detailPage.page).toMatchObject({ id: 'recruitment-talent-pool-detail', route: '/recruitment/talent-pools/detail' });
    expect(membersPage.page).toMatchObject({ id: 'recruitment-talent-pool-talents', route: '/recruitment/talent-pools/talents' });
    for (const page of [poolPage, detailPage, membersPage]) {
      expect(page.datasources).toBeUndefined();
      expect(page.actions).toBeUndefined();
    }
    expect(listApi().page.id).toBe(poolPage.page.id);
    expect(detailApi().page.id).toBe(detailPage.page.id);
    expect(membersApi().page.id).toBe(membersPage.page.id);
    expect(discovered.pageDatasources.get('recruitment-talent-pools')).toContain('recruitment_talent_pools');
    expect(discovered.pageDatasources.get('recruitment-talent-pool-detail')).toEqual(expect.arrayContaining(['recruitment_talent_pool_detail', 'recruitment_pool_applicant_options']));
    expect(discovered.pageDatasources.get('recruitment-talent-pool-talents')).toEqual(expect.arrayContaining(['recruitment_talent_pool_members', 'recruitment_pool_member_applicant_options']));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/recruitment/talent-pools', page: 'recruitment-talent-pools', module: 'recruitment' }),
      expect.objectContaining({ path: '/recruitment/talent-pools/detail', page: 'recruitment-talent-pool-detail', module: 'recruitment' }),
      expect.objectContaining({ path: '/recruitment/talent-pools/talents', page: 'recruitment-talent-pool-talents', module: 'recruitment' }),
    ]));
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'hiring').items)
      .toContainEqual({ path: '/recruitment/talent-pools', label: 'By Talent Pools', icon: 'users', permission: 'recruitment.read' });
    expect(poolPage.components[0].views.map((view: any) => view.id)).toEqual(['card', 'list']);
    expect(detailPage.components[0].stat_buttons).toContainEqual(expect.objectContaining({ id: 'view_recruitment_talent_pool_talents' }));
  });

  test('seeds deterministic pools and memberships, including search, empty, archived, and missing states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_talent_pool_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_talent_pool_test_migrations', ['schema', 'data']);

    const pools = listApi().datasources.find((source: any) => source.id === 'recruitment_talent_pools');
    expect((await repository.querySource(pools, { q: null, active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name))
      .toEqual(['Developer', 'Engineering Bench', 'Leadership Shortlist']);
    expect((await repository.querySource(pools, { q: 'Engineering', active: null, fixture_state: null }, 0, 50)).data).toMatchObject([{ name: 'Engineering Bench', talent_count: 2 }]);
    expect((await repository.querySource(pools, { q: null, active: 'archived', fixture_state: null }, 0, 50)).data).toMatchObject([{ name: '2025 Archive', active: false, talent_count: 0 }]);
    expect((await repository.querySource(pools, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const members = membersApi().datasources.find((source: any) => source.id === 'recruitment_talent_pool_members');
    const memberRows = await repository.querySource(members, { pool_id: 'talent-pool-developers', q: null, fixture_state: null }, 0, 50);
    expect(memberRows.data.map((row: any) => row.applicant_name)).toEqual(['Demo Candidate', 'Emily Brooks', 'Meldona Thang']);
    expect((await repository.querySource(members, { pool_id: 'talent-pool-developers', q: 'Meldona', fixture_state: null }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(members, { pool_id: 'talent-pool-developers', q: null, fixture_state: 'not_found' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('enforces manager CRUD, membership guards, validation, optimistic concurrency, and missing records', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_talent_pool_mutation_migrations', ['schema', 'data']);

    const create = action(listApi(), 'create_recruitment_talent_pool');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Future Product Leaders', pool_manager: 'Recruitment Team', tags: 'Leadership', company_name: 'Visible to all', color: 8, active: true } });
    expect(created).toMatchObject({ name: 'Future Product Leaders', active: true, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'future product leaders' } })).rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_TALENT_POOL_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: '   ' } })).rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_TALENT_POOL_NAME_REQUIRED' });

    const edit = action(detailApi(), 'edit_recruitment_talent_pool');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Future Product Leaders Updated', pool_manager: 'Maya Singh', tags: 'Leadership, Product' } });
    expect(edited).toMatchObject({ name: 'Future Product Leaders Updated', row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale pool edit' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-talent-pool', expected_row_version: 1, values: { name: 'Missing' } })).rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_TALENT_POOL_NOT_FOUND' });

    const add = action(detailApi(), 'add_recruitment_pool_talent');
    const membership = await repository.executeMutation(add.mutation, { values: { pool_id: created.id, applicant_id: 'applicant-demo-001' } });
    expect(membership).toMatchObject({ pool_id: created.id, applicant_id: 'applicant-demo-001', row_version: 1 });
    await expect(repository.executeMutation(add.mutation, { values: { pool_id: created.id, applicant_id: 'applicant-demo-001' } })).rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_TALENT_POOL_MEMBER_EXISTS' });
    await expect(repository.executeMutation(add.mutation, { values: { pool_id: created.id, applicant_id: 'missing-applicant' } })).rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_APPLICANT_NOT_FOUND' });

    const remove = action(membersApi(), 'remove_recruitment_pool_talent');
    await expect(repository.executeMutation(remove.mutation, { id: membership.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(remove.mutation, { id: membership.id, expected_row_version: 1 });
    expect((await repository.querySource(membersApi().datasources[0], { pool_id: created.id, q: null, fixture_state: null }, 0, 50)).data).toEqual([]);

    const removePool = action(listApi(), 'delete_recruitment_talent_pool');
    await repository.executeMutation(removePool.mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(removePool.mutation, { id: 'missing-talent-pool', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_TALENT_POOL_NOT_FOUND' });
    database.close();
  });

  test('keeps the Odoo user/interviewer permission boundary and datasource failure contracts explicit', () => {
    const poolPage = yaml('pages/talent-pools.yaml');
    const membersPage = yaml('pages/talent-pool-talents.yaml');
    const allActions = [...listApi().actions, ...detailApi().actions, ...membersApi().actions];
    expect(listApi().datasources[0].permission).toBe('recruitment.read');
    expect(detailApi().datasources[0].permission).toBe('recruitment.read');
    expect(membersApi().datasources[0].permission).toBe('recruitment.read');
    expect(allActions.filter((item: any) => item.id.startsWith('view_') || item.id.startsWith('back_')).every((item: any) => item.permission === 'recruitment.read')).toBe(true);
    expect(allActions.filter((item: any) => !item.id.startsWith('view_') && !item.id.startsWith('back_')).every((item: any) => item.permission === 'recruitment.manage')).toBe(true);
    expect(poolPage.page.auth.require).toEqual(['recruitment.read']);
    expect(membersPage.page.auth.require).toEqual(['recruitment.read']);
    for (const source of [...listApi().datasources, ...detailApi().datasources, ...membersApi().datasources]) {
      expect(source.error_states.transport_error).toBeDefined();
      expect(String(source.query || '')).not.toMatch(/CURRENT_DATE|CURRENT_TIMESTAMP|gen_random_uuid|random\s*\(/i);
    }
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (id: string) => yaml('api/openings-interviewer.yaml').actions.find((entry: any) => entry.id === id);

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const repo = new YamlRepository(database);
  await migrateDatabase(repo, join(root, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repo };
}

describe('Recruitment interviewer Job Positions action', () => {
  test('traces Odoo action_hr_job_interviewer and joins the read-only page/API pair by page.id', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/hr_recruitment/views/hr_job_views.xml', 'utf8');
    const page = yaml('pages/openings-interviewer.yaml');
    const detail = yaml('pages/openings-interviewer-detail.yaml');
    const api = yaml('api/openings-interviewer.yaml');
    const detailApi = yaml('api/openings-interviewer-detail.yaml');

    expect(source).toMatch(/id="action_hr_job_interviewer"[\s\S]*<field name="view_mode">kanban,form<\/field>[\s\S]*<field name="context">\{'create': False\}<\/field>[\s\S]*interviewer_ids/);
    expect(page.page).toMatchObject({ id: 'recruitment-openings-interviewer', route: '/openings/interviewer', auth: { require: ['recruitment.read'] } });
    expect(detail.page).toMatchObject({ id: 'recruitment-opening-interviewer-detail', route: '/openings/interviewer/detail' });
    expect(api.page.id).toBe(page.page.id);
    expect(detailApi.page.id).toBe(detail.page.id);
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...detail, actions: detailApi.actions }, { allowExternalSources: true })).not.toThrow();
    expect(api.datasources.map((candidate: any) => candidate.id)).toEqual(['recruitment_interviewer_openings']);
    expect(detailApi.datasources.map((candidate: any) => candidate.id)).toEqual(['recruitment_interviewer_opening_detail']);
    expect(page.components[0]).toMatchObject({ source: 'recruitment_interviewer_openings' });
    expect(page.components[0].create_action).toBeUndefined();
    expect(page.components[0].views).toEqual([expect.objectContaining({ id: 'kanban', label: 'Kanban' })]);
    expect(action('view_recruitment_interviewer_opening')).toMatchObject({ permission: 'recruitment.read', navigate_to: '/openings/interviewer/detail' });
    expect(detailApi.actions.find((entry: any) => entry.id === 'back_to_recruitment_interviewer_openings')).toMatchObject({ permission: 'recruitment.read', navigate_to: '/openings/interviewer' });
  });

  test('filters positions by assigned interviewer, company, search, status, and empty state', async () => {
    const { database, repo } = await repository('recruitment_interviewer_openings_scope');
    const source = yaml('api/openings-interviewer.yaml').datasources[0];
    const base = { current_user_name: 'Maya Singh', current_company_name: 'Core3 Demo Company', q: null, state: null, fixture_state: null };
    expect((await repo.querySource(source, base, 0, 50)).data).toMatchObject([
      expect.objectContaining({ id: 'opening-demo-001', name: 'JOB/2026/0001' }),
      expect.objectContaining({ id: 'opening-demo-002', name: 'JOB/2026/0002' }),
    ]);
    expect((await repo.querySource(source, { ...base, q: 'People' }, 0, 50)).data).toHaveLength(1);
    expect((await repo.querySource(source, { ...base, state: 'Closed' }, 0, 50)).data).toEqual([]);
    expect((await repo.querySource(source, { ...base, current_user_name: 'Alex Chen' }, 0, 50)).data).toMatchObject([expect.objectContaining({ id: 'opening-demo-003' })]);
    expect((await repo.querySource(source, { ...base, current_company_name: 'Other Company' }, 0, 50)).data).toEqual([]);
    expect((await repo.querySource(source, { ...base, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repo.querySource(source, { ...base, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'RECRUITMENT_INTERVIEWER_OPENINGS_UNAVAILABLE' });
    await database.close();
  });

  test('protects the interviewer detail from unassigned or wrong-company direct access', async () => {
    const { database, repo } = await repository('recruitment_interviewer_opening_detail');
    const source = yaml('api/openings-interviewer-detail.yaml').datasources[0];
    const assigned = (await repo.querySource(source, { id: 'opening-demo-001', current_user_name: 'Maya Singh', current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 1)).data;
    expect(assigned).toMatchObject({ id: 'opening-demo-001', name: 'JOB/2026/0001', application_count: 3 });
    expect((await repo.querySource(source, { id: 'opening-demo-001', current_user_name: 'Alex Chen', current_company_name: 'Core3 Demo Company', fixture_state: null }, 0, 1)).data).toEqual({});
    expect((await repo.querySource(source, { id: 'opening-demo-001', current_user_name: 'Maya Singh', current_company_name: 'Other Company', fixture_state: null }, 0, 1)).data).toEqual({});
    await expect(repo.querySource(source, { id: 'opening-demo-001', current_user_name: 'Maya Singh', current_company_name: 'Core3 Demo Company', fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'RECRUITMENT_INTERVIEWER_OPENING_UNAVAILABLE' });
    await database.close();
  });

  test('keeps interviewer assignments durable and the action read-only', async () => {
    const { database, repo } = await repository('recruitment_interviewer_openings_restart');
    expect(await repo.query("SELECT opening_id, interviewer_name, company_name, row_version FROM recruitment_opening_interviewers ORDER BY id")).toEqual([
      { opening_id: 'opening-demo-001', interviewer_name: 'Maya Singh', company_name: 'Core3 Demo Company', row_version: 1 },
      { opening_id: 'opening-demo-002', interviewer_name: 'Maya Singh', company_name: 'Core3 Demo Company', row_version: 1 },
      { opening_id: 'opening-demo-003', interviewer_name: 'Alex Chen', company_name: 'Core3 Demo Company', row_version: 1 },
    ]);
    const page = yaml('pages/openings-interviewer.yaml');
    expect(page.components[0].create_action).toBeUndefined();
    expect(yaml('api/openings-interviewer.yaml').actions.every((entry: any) => entry.type === 'navigate')).toBe(true);
    await database.close();
  });
});

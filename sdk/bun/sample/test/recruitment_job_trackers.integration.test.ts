import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (id: string) => yaml('api/opening-trackers.yaml').actions.find((entry: any) => entry.id === id);

async function repository(name: string) {
  const database = await DuckDbDatabase.open(':memory:');
  const repo = new YamlRepository(database);
  await migrateDatabase(repo, join(root, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repo };
}

describe('Recruitment job-position Trackers action', () => {
  test('traces Odoo action_hr_job_sources and joins the tracker page/API by page.id', () => {
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr_recruitment/views/hr_recruitment_source_views.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr_recruitment/models/hr_recruitment_source.py', 'utf8');
    const page = yaml('pages/opening-trackers.yaml');
    const api = yaml('api/opening-trackers.yaml');
    const openingPage = yaml('pages/opening-detail.yaml');
    const openingApi = yaml('api/opening-detail.yaml');

    expect(sourceView).toContain('id="action_hr_job_sources"');
    expect(sourceView).toContain('<field name="name">Trackers</field>');
    expect(sourceView).toContain('<field name="campaign_id" optional="show"/>');
    expect(sourceView).toContain('<field name="source_id" placeholder="e.g. LinkedIn"');
    expect(sourceModel).toContain("_name = 'hr.recruitment.source'");
    expect(sourceModel).toContain("job_id = fields.Many2one('hr.job'");
    expect(page.page).toMatchObject({ id: 'recruitment-job-trackers', route: '/openings/trackers', auth: { require: ['recruitment.read'] } });
    expect(page.datasources).toBeUndefined();
    expect(api.page.id).toBe(page.page.id);
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(api.datasources.map((source: any) => source.id)).toEqual(['recruitment_job_trackers']);
    expect(page.components[0]).toMatchObject({ source: 'recruitment_job_trackers', create_action: 'create_recruitment_job_tracker' });
    expect(page.components[0].columns.map((column: any) => column.field)).toEqual(['campaign_name', 'source_name', 'medium_name', 'email', 'id']);
    expect(openingPage.components[0].stat_buttons).toContainEqual(expect.objectContaining({ id: 'view_recruitment_opening_trackers', label: 'Trackers', value_field: 'tracker_count' }));
    expect(openingApi.datasources[0].query).toContain('tracker_count');
    expect(action('create_recruitment_job_tracker')).toMatchObject({ permission: 'recruitment.write', operation: 'create', title: 'New Tracker' });
    expect(action('edit_recruitment_job_tracker')).toMatchObject({ permission: 'recruitment.write', operation: 'update', title: 'Edit Tracker' });
    expect(action('delete_recruitment_job_tracker')).toMatchObject({ permission: 'recruitment.write', operation: 'delete' });
  });

  test('seeds trackers per job, supports search/empty, CRUD, scope, validation, and stale guards', async () => {
    const { database, repo } = await repository('recruitment_job_trackers_crud');
    const source = yaml('api/opening-trackers.yaml').datasources[0];
    expect((await repo.querySource(source, { opening_id: 'opening-demo-001', current_company_name: 'Core3 Demo Company', q: null, fixture_state: null }, 0, 50)).data)
      .toMatchObject([
        { source_name: 'Careers Page', campaign_name: 'Spring Hiring', medium_name: 'Website' },
        { source_name: 'LinkedIn', campaign_name: 'Job Campaign', medium_name: 'Website' },
      ]);
    expect((await repo.querySource(source, { opening_id: 'opening-demo-001', current_company_name: 'Core3 Demo Company', q: 'spring', fixture_state: null }, 0, 50)).data).toHaveLength(1);
    expect((await repo.querySource(source, { opening_id: 'opening-demo-003', current_company_name: 'Core3 Demo Company', q: null, fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repo.querySource(source, { opening_id: 'opening-demo-001', current_company_name: 'Core3 Demo Company', q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repo.querySource(source, { opening_id: 'opening-demo-001', current_company_name: 'Core3 Demo Company', q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'RECRUITMENT_JOB_TRACKERS_UNAVAILABLE' });

    const create = action('create_recruitment_job_tracker');
    const base = { opening_id: 'opening-demo-001', opening_name: 'JOB/2026/0001', current_user_name: 'Recruitment QA', current_company_name: 'Core3 Demo Company', values: { opening_id: 'opening-demo-001', opening_name: 'JOB/2026/0001', campaign_name: 'University Hiring', source_name: 'Campus Fair', medium_name: 'Events', email: 'campus@example.com' } };
    const created = await repo.executeMutation(create.mutation, base);
    expect(created).toMatchObject({ id: 'job-tracker-opening-demo-001-campus-fair-3', opening_id: 'opening-demo-001', source_name: 'Campus Fair', company_name: 'Core3 Demo Company', row_version: 1 });
    await expect(repo.executeMutation(create.mutation, { ...base, values: { ...base.values, email: 'other@example.com' } })).rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_JOB_TRACKERS_DUPLICATE' });
    await expect(repo.executeMutation(create.mutation, { ...base, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'RECRUITMENT_JOB_TRACKERS_ACTOR_REQUIRED' });
    await expect(repo.executeMutation(create.mutation, { ...base, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_JOB_TRACKERS_OPENING_NOT_FOUND' });
    await expect(repo.executeMutation(create.mutation, { ...base, values: { ...base.values, source_name: '' } })).rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_JOB_TRACKERS_SOURCE_REQUIRED' });

    const edit = action('edit_recruitment_job_tracker');
    const edited = await repo.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { campaign_name: 'University Hiring 2026', source_name: 'Campus Fair', medium_name: 'Events', email: 'campus@example.com' } });
    expect(edited).toMatchObject({ campaign_name: 'University Hiring 2026', row_version: 2 });
    await expect(repo.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { campaign_name: 'Stale', source_name: 'Campus Fair', medium_name: 'Events', email: '' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repo.executeMutation(edit.mutation, { id: 'missing-tracker', expected_row_version: 1, current_company_name: 'Core3 Demo Company', values: { campaign_name: '', source_name: 'Missing', medium_name: 'Website', email: '' } })).rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_JOB_TRACKER_NOT_FOUND' });

    await repo.executeMutation(action('delete_recruitment_job_tracker').mutation, { id: created.id, expected_row_version: 2, current_company_name: 'Core3 Demo Company' });
    await expect(repo.executeMutation(action('delete_recruitment_job_tracker').mutation, { id: created.id, expected_row_version: 2, current_company_name: 'Core3 Demo Company' })).rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_JOB_TRACKER_NOT_FOUND' });
    expect((await repo.querySource(source, { opening_id: 'opening-demo-001', current_company_name: 'Core3 Demo Company', q: 'campus', fixture_state: null }, 0, 50)).data).toEqual([]);
    await database.close();
  });

  test('keeps a created tracker durable across a file-backed restart', async () => {
    const dbPath = join('/tmp', `core3-recruitment-job-trackers-${Date.now()}.duckdb`);
    const firstDatabase = await DuckDbDatabase.open(dbPath);
    const first = new YamlRepository(firstDatabase);
    await migrateDatabase(first, join(root, 'migrations'), undefined, 'recruitment_job_trackers_restart', ['schema', 'data']);
    await first.executeMutation(action('create_recruitment_job_tracker').mutation, {
      opening_id: 'opening-demo-002', opening_name: 'JOB/2026/0002', current_user_name: 'Recruitment QA', current_company_name: 'Core3 Demo Company',
      values: { opening_id: 'opening-demo-002', opening_name: 'JOB/2026/0002', campaign_name: 'Restart Check', source_name: 'Referral Network', medium_name: 'Referral', email: '' },
    });
    await firstDatabase.close();

    const secondDatabase = await DuckDbDatabase.open(dbPath);
    const second = new YamlRepository(secondDatabase);
    await migrateDatabase(second, join(root, 'migrations'), undefined, 'recruitment_job_trackers_restart', ['schema', 'data']);
    expect(await second.query("SELECT opening_id, source_name, campaign_name FROM recruitment_job_trackers WHERE source_name = 'Referral Network'"))
      .toEqual([{ opening_id: 'opening-demo-002', source_name: 'Referral Network', campaign_name: 'Restart Check' }]);
    await secondDatabase.close();
  });

  test('keeps read/write boundaries, concurrency, and error states explicit', () => {
    const api = yaml('api/opening-trackers.yaml');
    expect(api.datasources[0]).toMatchObject({ permission: 'recruitment.read', error_states: { unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } } });
    for (const id of ['create_recruitment_job_tracker', 'edit_recruitment_job_tracker', 'delete_recruitment_job_tracker']) {
      expect(action(id).permission, id).toBe('recruitment.write');
      expect(action(id).handler, id).toBe('yaml_mutation');
      expect(action(id).mutation, id).toBeDefined();
    }
    expect(action('edit_recruitment_job_tracker').mutation.concurrency.required).toBe(true);
    expect(action('delete_recruitment_job_tracker').mutation.concurrency.required).toBe(true);
  });
});

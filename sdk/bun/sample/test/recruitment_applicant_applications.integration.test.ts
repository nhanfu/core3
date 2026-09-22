import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const page = yaml('pages/applicant-applications.yaml');
const api = yaml('api/applicant-applications.yaml');
const detailPage = yaml('pages/applicant-detail.yaml');
const detailApi = yaml('api/applicant-detail.yaml');
const datasource = api.datasources.find((entry: any) => entry.id === 'recruitment_applicant_applications');
const action = (id: string) => api.actions.find((entry: any) => entry.id === id);

async function openRepository(path = ':memory:', name = `recruitment_applicant_applications_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(path);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);
  return { database, repository };
}

describe('Recruitment applicant related applications parity', () => {
  test('maps Odoo action_open_applications to separate page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr_recruitment/models/hr_applicant.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr_recruitment/views/hr_applicant_views.xml', 'utf8');
    const open = action('view_recruitment_applicant_application');
    const detailOpen = detailApi.actions.find((entry: any) => entry.id === 'view_recruitment_applicant_applications');

    expect(sourceModel).toContain('def action_open_applications(self):');
    expect(sourceModel).toContain('ignore_talent=True');
    expect(sourceModel).toContain('"active_test": False');
    expect(sourceView).toContain('name="action_open_applications"');
    expect(sourceView).toContain('string="Applications"');
    expect(page.page).toMatchObject({ id: 'recruitment-applicant-applications', route: '/applicants/applications' });
    expect(api.page.id).toBe(page.page.id);
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(page.components[0]).toMatchObject({ source: 'recruitment_applicant_applications', row_open_action: 'view_recruitment_applicant_application' });
    expect(detailPage.components[0].stat_buttons).toContainEqual(expect.objectContaining({ id: 'view_recruitment_applicant_applications', label: 'Applications', value_field: 'application_count' }));
    expect(detailOpen).toMatchObject({ type: 'navigate', permission: 'recruitment.read', navigate_to: '/applicants/applications', params: { applicant_id: '{state.id}' } });
    expect(open).toMatchObject({ type: 'navigate', permission: 'recruitment.read', navigate_to: '/applicants/detail', params: { id: '{row.id}' } });
    expect(datasource).toMatchObject({ permission: 'recruitment.read', workflow: 'recruitment_applicants' });
    expect(datasource.error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, missing_record: { status: 404 }, transport_error: { status: 503 } });
  });

  test('returns same-person applications, includes archived rows, and scopes by company', async () => {
    const { database, repository } = await openRepository();
    try {
      const result = await repository.querySource(datasource, { applicant_id: 'applicant-related-001', current_company_name: 'Core3 Demo Company', fixture_state: null, q: null }, 0, 25);
      expect(result.data).toEqual([
        expect.objectContaining({ id: 'applicant-related-001', opening_name: 'JOB/2026/0003', stage: 'New', application_status: 'Ongoing', archived: false, is_source_application: true }),
        expect.objectContaining({ id: 'applicant-related-002', opening_name: 'JOB/2026/0002', stage: 'Screening', application_status: 'Archived', archived: true, is_source_application: false }),
      ]);
      expect((await repository.querySource(datasource, { applicant_id: 'applicant-related-001', current_company_name: 'Core3 Demo Company', fixture_state: null, q: 'JOB/2026/0002' }, 0, 25)).data).toHaveLength(1);
      expect((await repository.querySource(datasource, { applicant_id: 'applicant-related-001', current_company_name: 'Other Company', fixture_state: null, q: null }, 0, 25)).data).toEqual([]);
      expect((await repository.querySource(datasource, { applicant_id: 'applicant-related-001', current_company_name: 'Core3 Demo Company', fixture_state: 'empty', q: null }, 0, 25)).data).toEqual([]);
      expect((await repository.querySource(datasource, { applicant_id: 'missing-applicant', current_company_name: 'Core3 Demo Company', fixture_state: 'not_found', q: null }, 0, 25)).data).toEqual([]);
      expect((await repository.querySource(detailApi.datasources[0], { id: 'applicant-related-001', current_company_name: 'Core3 Demo Company', fixture_state: null })).data).toMatchObject({ application_count: 2 });
    } finally {
      await database.close();
    }
  });

  test('keeps the deterministic related applications visible after a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-recruitment-applications-'));
    const path = join(directory, 'recruitment.duckdb');
    const first = await openRepository(path, 'recruitment_applicant_applications_restart');
    await first.database.close();
    const second = await openRepository(path, 'recruitment_applicant_applications_restart_reload');
    try {
      expect(await second.repository.query("SELECT id, email, archived FROM recruitment_applicants WHERE id IN ('applicant-related-001', 'applicant-related-002') ORDER BY id")).toEqual([
        { id: 'applicant-related-001', email: 'avery.morgan@example.com', archived: false },
        { id: 'applicant-related-002', email: 'avery.morgan@example.com', archived: true },
      ]);
    } finally {
      await second.database.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

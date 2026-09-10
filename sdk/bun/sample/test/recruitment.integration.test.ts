import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const source = (file: string, id: string) => yaml(`api/${file}`).datasources.find((item: any) => item.id === id);

describe('Recruitment parity batch', () => {
  it('discovers service-owned API fragments for the core Odoo states', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pages.get('applicants')?.config.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban']);
    expect(discovered.pages.get('openings')?.config.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban']);
    expect(discovered.pageDatasources.get('applicants')).toContain('recruitment_applicants');
    expect(discovered.pageDatasources.get('applicant-detail')).toContain('recruitment_applicant_detail');
    expect(discovered.pages.get('applicants')?.config.actions.map((action: any) => action.id)).toContain('screen_applicant');
  });

  it('matches the Odoo Recruitment Analysis Graph/Pivot contract', () => {
    const page = yaml('pages/analysis.yaml');
    const list = page.components[0];
    expect(page.datasources).toBeUndefined();
    expect(page.page.breadcrumb).toEqual(['Recruitment', 'Reporting', 'Recruitment Analysis']);
    expect(list.view_navigation).toBe('tabs');
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'pivot']);
    expect(list.views.find((view: any) => view.id === 'graph')).toMatchObject({ category_field: 'stage', measure_field: 'applicant_count' });
    expect(list.views.find((view: any) => view.id === 'pivot')?.pivot.default).toMatchObject({ rows: ['stage'], columns: ['opening_name'] });
    expect(list.empty_state.title).toBe('No data yet!');
  });

  it('keeps fixture SQL deterministic and page YAML free of backend SQL', () => {
    const files = ['pages/applicants.yaml', 'pages/openings.yaml', 'pages/applicant-detail.yaml', 'pages/analysis.yaml', 'migrations/20260818210000-001-recruitment-foundation.yaml', 'migrations/20260818211000-002-recruitment-demo-data.yaml', 'migrations/20260818212000-003-recruitment-parity-fixtures.yaml'];
    const contents = files.map((file) => readFileSync(join(root, file), 'utf8'));
    expect(contents.slice(0, 4).every((content) => !/\bSELECT\b|\bUPDATE\b|\bINSERT\b/i.test(content))).toBe(true);
    expect(contents.slice(4).every((content) => !/CURRENT_DATE|CURRENT_TIMESTAMP|gen_random_uuid/i.test(content))).toBe(true);
  });

  it('preserves guarded workflow transitions and hired-count consistency steps', () => {
    const workflow = yaml('pages/recruitment-workflow.yaml').workflow;
    expect(workflow.states.map((state: any) => state.id)).toEqual(['New', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']);
    expect(workflow.transitions.map((transition: any) => transition.id)).toEqual(['screen', 'interview', 'offer', 'hire', 'reject']);
    expect(workflow.transitions.every((transition: any) => transition.mutation.guards?.[0]?.status === 409)).toBe(true);
    expect(workflow.transitions.find((transition: any) => transition.id === 'hire').mutation.steps).toHaveLength(2);
  });

  it('seeds deterministic report rows and supports search, empty, and transport-error states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_analysis_test_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_analysis_test_schema_migrations', ['schema', 'data']);
    const analysis = source('analysis.yaml', 'recruitment_analysis');
    const ready = await repository.querySource(analysis, { q: null, fixture_state: null }, 0, 50);
    expect(ready.data).toHaveLength(3);
    expect(ready.data.map((row: any) => row.stage)).toEqual(['New', 'Screening', 'Interview']);
    expect((await repository.querySource(analysis, { q: 'Meldona', fixture_state: null }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(analysis, { q: null, stage: 'Interview', opening_name: null, recruiter: null, fixture_state: null }, 0, 50)).data).toMatchObject([{ stage: 'Interview', applicant_count: 1 }]);
    expect((await repository.querySource(analysis, { q: 'No matching applicant', fixture_state: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(analysis, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(analysis, { q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'RECRUITMENT_ANALYSIS_DATA_UNAVAILABLE' });
  });

  it('keeps the report datasource page-owned and SQL deterministic', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const api = yaml('api/analysis.yaml');
    expect(api.page.id).toBe('recruitment-analysis');
    expect(discovered.pageDatasources.get('recruitment-analysis')).toContain('recruitment_analysis');
    expect(api.datasources.find((item: any) => item.id === 'recruitment_analysis').query).not.toMatch(/CURRENT_DATE|CURRENT_TIMESTAMP|gen_random_uuid/i);
    expect(source('analysis.yaml', 'recruitment_analysis').error_states.transport_error).toMatchObject({ status: 503, code: 'RECRUITMENT_ANALYSIS_DATA_UNAVAILABLE' });
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import { discoverPages } from '@core3/server/discovery';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Recruitment parity batch', () => {
  it('discovers service-owned API fragments for the core Odoo states', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pages.get('applicants')?.config.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban']);
    expect(discovered.pages.get('openings')?.config.components[0].views.map((view: any) => view.id)).toEqual(['list', 'kanban']);
    expect(discovered.pageDatasources.get('applicants')).toContain('recruitment_applicants');
    expect(discovered.pageDatasources.get('applicant-detail')).toContain('recruitment_applicant_detail');
    expect(discovered.pages.get('applicants')?.config.actions.map((action: any) => action.id)).toContain('screen_applicant');
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
});

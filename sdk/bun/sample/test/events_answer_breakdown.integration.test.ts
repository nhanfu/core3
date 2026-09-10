import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';

const root = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Events Answer Breakdown parity slice', () => {
  test('maps the Odoo reporting menu and visible view order', () => {
    const manifest = yaml('manifest.yaml');
    const reporting = manifest.menu.groups.find((group: any) => group.id === 'reporting');
    expect(reporting.items).toContainEqual({ path: '/events/answer-breakdown', label: 'Answer Breakdown', icon: 'chart', permission: 'events.read' });

    const page = yaml('pages/answer-breakdown.yaml');
    expect(page.datasources).toBeUndefined();
    const list = page.components[0];
    expect(list.view_navigation).toBe('tabs');
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'graph', 'pivot']);
    expect(list.views.find((view: any) => view.id === 'graph')).toMatchObject({ category_field: 'value_answer_id', measure_field: 'answer_count', type: 'bar' });
    expect(list.views.find((view: any) => view.id === 'pivot')?.pivot.default).toMatchObject({ rows: ['registration_name'], columns: ['value_answer_id'] });
    expect(list.empty_state.title).toBe('No Answers yet!');
  });

  test('keeps answer data page-id owned and deterministic', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const page = yaml('api/answer-breakdown.yaml');
    expect(page.page.id).toBe('answer-breakdown');
    expect(discovered.pageDatasources.get('answer-breakdown')).toContain('event_answer_breakdown');
    const source = page.datasources[0];
    expect(source.permission).toBe('events.read');
    expect(source.query).toContain('event_registration_answers');
    expect(source.query).toContain(":fixture_state");
    expect(source.query).toContain('ORDER BY e.name, r.attendee_name, a.question, a.id');
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'EVENTS_ANSWER_DATA_UNAVAILABLE' });
  });
});

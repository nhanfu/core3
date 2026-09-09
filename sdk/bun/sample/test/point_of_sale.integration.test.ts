import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS session parity batch', () => {
  test('exposes the Sessions menu and registered detail route', () => {
    const manifest = yaml('manifest.yaml');
    const menu = manifest.menu.groups.flatMap((group: any) => group.items);
    expect(menu).toContainEqual(expect.objectContaining({ path: '/point-of-sale/sessions', label: 'Sessions' }));
    expect(yaml('pages/sessions.yaml').page.route).toBe('/point-of-sale/sessions');
    expect(yaml('api/sessions.yaml').actions.find((action: any) => action.id === 'view_pos_session').navigate_to).toBe('/point-of-sale/session-detail');
  });

  test('covers all Odoo session lifecycle states with guarded controls', () => {
    const workflow = yaml('pages/pos-workflow.yaml').workflow;
    expect(workflow.states.map((state: any) => state.id)).toEqual(['Opening Control', 'In Progress', 'Closing Control', 'Closed & Posted']);
    expect(workflow.transitions.map((transition: any) => transition.id)).toEqual(['open', 'start_closing', 'close']);
    const detail = yaml('pages/pos-session-detail.yaml').components.find((component: any) => component.type === 'OdooFormView');
    expect(detail.statusbar.map((state: any) => state.value)).toEqual(workflow.states.map((state: any) => state.id));
    expect(detail.header_actions.map((action: any) => action.id)).toEqual(expect.arrayContaining(['open_session_detail', 'start_closing_session_detail', 'close_session_detail']));
  });

  test('keeps lifecycle fixture data service-owned and deterministic', () => {
    const fixture = yaml('migrations/20260910120000-012-pos-session-parity.yaml');
    expect(fixture.kind).toBe('data');
    expect(fixture.type.postgres.up).toContain("'pos-session-demo-opening'");
    expect(fixture.type.postgres.up).toContain("'pos-session-demo-closing'");
    expect(fixture.type.postgres.up).toContain("'pos-session-demo-closed'");
  });
});

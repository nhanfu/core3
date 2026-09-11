import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPages } from '@core3/server/discovery';

const serviceRoot = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('POS Session Report action 723 parity', () => {
  test('registers the installed Reporting action as a distinct wizard route', () => {
    const manifest = yaml('manifest.yaml');
    const menu = manifest.menu.groups.flatMap((group: any) => group.items);
    const page = yaml('pages/pos-session-report.yaml');
    const api = yaml('api/pos-session-report.yaml');

    expect(menu).toContainEqual(expect.objectContaining({ path: '/point-of-sale/session-report', label: 'Session Report', permission: 'pos.read' }));
    expect(page.page).toMatchObject({ id: 'pos-session-report', route: '/point-of-sale/session-report' });
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0]).toMatchObject({ type: 'OdooFormView', source: 'pos_session_report_wizard', initial_editing: true });
  });

  test('matches the Odoo wizard fields and guarded actions', () => {
    const page = yaml('pages/pos-session-report.yaml');
    const api = yaml('api/pos-session-report.yaml');
    const form = page.components[0];

    expect(form.groups[0].fields).toEqual([
      { field: 'session_id', label: 'Pos Session', type: 'select', options_source: 'pos_session_report_sessions' },
      { field: 'add_per_employee', label: 'Add a report per each employee', type: 'checkbox' },
    ]);
    expect(form.header_actions.map((candidate: any) => candidate.id)).toEqual([
      'print_pos_session_report', 'cancel_pos_session_report',
    ]);
    expect(action(api, 'print_pos_session_report')).toMatchObject({ type: 'client', permission: 'pos.read' });
    expect(action(api, 'cancel_pos_session_report')).toMatchObject({ type: 'navigate', permission: 'pos.read', navigate_to: '/point-of-sale' });
    expect(api.datasources[0].query).toContain('SELECT id AS value');
    expect(api.datasources[1].error_states.transport_error.status).toBe(503);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('pos-session-report')).toEqual([
      'pos_session_report_sessions', 'pos_session_report_wizard',
    ]);
  });

  test('seeds a stable empty-selection wizard and live session options', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'pos_session_report_contract', ['schema', 'data']);
    const api = yaml('api/pos-session-report.yaml');

    const wizard = await repository.querySource(api.datasources[1], { id: null, fixture_state: null }, 0, 1);
    expect(wizard.data).toMatchObject({ id: 'pos-session-report-demo-001', name: 'Session Report', session_id: null, add_per_employee: true, state: 'Draft' });
    const sessions = await repository.querySource(api.datasources[0], {}, 0, 20);
    expect(sessions.data.length).toBeGreaterThanOrEqual(4);
    expect(sessions.data[0]).toEqual(expect.objectContaining({ value: expect.any(String), label: expect.stringContaining(' — ') }));
    expect((await repository.querySource(api.datasources[1], { id: null, fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(api.datasources[1], { id: 'missing-session-report', fixture_state: null }, 0, 1)).data).toEqual({});
  });

  test('keeps report controls read-only at the POS permission boundary', () => {
    const page = yaml('pages/pos-session-report.yaml');
    const api = yaml('api/pos-session-report.yaml');
    expect(page.page.auth.require).toEqual(['pos.read']);
    expect(api.datasources.every((source: any) => source.permission === 'pos.read')).toBe(true);
    expect(api.actions.every((candidate: any) => candidate.permission === 'pos.read')).toBe(true);
    expect(yaml('migrations/20260911210000-032-pos-session-report.yaml').type.postgres.up).not.toContain('CURRENT_');
  });
});

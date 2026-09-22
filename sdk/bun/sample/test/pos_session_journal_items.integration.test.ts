import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS session Journal Items smart button parity', () => {
  test('maps the Odoo show_journal_items action to an accounting-guarded page/API pair', () => {
    const sessionPage = yaml('pages/pos-session-detail.yaml');
    const sessionApi = yaml('api/pos-session-detail.yaml');
    const journalPage = yaml('pages/pos-session-journal-items.yaml');
    const journalApi = yaml('api/pos-session-journal-items.yaml');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/views/pos_session_view.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/models/pos_session.py', 'utf8');
    const statButton = sessionPage.components[0].stat_buttons.find((candidate: any) => candidate.id === 'open_session_journal_items');
    const action = sessionApi.actions.find((candidate: any) => candidate.id === 'open_session_journal_items');

    expect(journalApi.page.id).toBe(journalPage.page.id);
    expect(statButton).toMatchObject({ label: 'Journal Items', permission: 'accounting.read' });
    expect(action).toMatchObject({ type: 'navigate', permission: 'accounting.read', navigate_to: '/point-of-sale/session-journal-items' });
    expect(journalPage.components[0]).toMatchObject({ source: 'pos_session_journal_items', default_group_by: 'entry_name' });
    expect(journalApi.datasources[0]).toMatchObject({ id: 'pos_session_journal_items', permission: 'accounting.read' });
    expect(journalApi.datasources[0].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, not_found: { status: 404 }, transport_error: { status: 503 } });
    expect(journalApi.datasources[0].query).toContain('i.session_id = :session_id');
    expect(journalApi.datasources[0].query).toContain('i.company = :current_company_name');
    expect(sourceView).toContain('name="show_journal_items"');
    expect(sourceView).toContain('groups="account.group_account_readonly"');
    expect(sourceModel).toContain('def show_journal_items(self):');
    expect(sourceModel).toContain("'res_model': 'account.move.line'");
    expect(sourceModel).toContain("'search_default_group_by_move': 1");
  });

  test('returns only posted journal items for the selected session and company', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, `pos_session_journal_items_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
    const source = yaml('api/pos-session-journal-items.yaml').datasources[0];

    const rows = await repository.querySource(source, { session_id: 'pos-session-demo-001', current_company_name: 'Core3 Demo Company', state: 'Posted' }, 0, 50);
    expect(rows.data).toHaveLength(4);
    expect(rows.data.every((row: any) => row.session_id === 'pos-session-demo-001')).toBe(true);
    expect(rows.data.every((row: any) => row.company === 'Core3 Demo Company')).toBe(true);
    expect(rows.data.every((row: any) => row.state === 'Posted')).toBe(true);
    expect(new Set(rows.data.map((row: any) => row.entry_name))).toEqual(new Set(['POS/2026/08/17/001']));
    expect((await repository.querySource(source, { session_id: 'pos-session-demo-001', current_company_name: 'Core3 Vietnam Branch', state: 'Posted' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { session_id: 'missing-session', current_company_name: 'Core3 Demo Company', state: 'Posted' }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('preserves search, status filter, back navigation, and migration durability', async () => {
    const page = yaml('pages/pos-session-journal-items.yaml');
    const api = yaml('api/pos-session-journal-items.yaml');
    const source = api.datasources[0];
    expect(page.components[0].filters).toEqual([{ field: 'state', label: 'Status', options: [{ id: 'Posted', label: 'Posted' }] }]);
    expect(page.actions.find((candidate: any) => candidate.id === 'back_to_pos_session_from_journal_items')).toMatchObject({ navigate_to: '/point-of-sale/session-detail', permission: 'accounting.read' });
    expect(source.query).toContain('i.entry_name ILIKE');
    expect(source.query).toContain('i.state = :state');
    expect(yaml('migrations/20260922170000-053-pos-session-journal-items.yaml').type.postgres.up).toContain('ON CONFLICT(id) DO NOTHING');

    const databasePath = join('/tmp', `core3-pos-session-journal-items-${crypto.randomUUID()}.duckdb`);
    const migrationName = `pos_session_journal_items_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const firstDatabase = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(firstDatabase);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const first = await firstRepository.querySource(source, { session_id: 'pos-session-demo-001', current_company_name: 'Core3 Demo Company', state: 'Posted' }, 0, 50);
    await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    firstDatabase.close();
    const reopenedDatabase = await DuckDbDatabase.open(databasePath);
    const reopenedRepository = new YamlRepository(reopenedDatabase);
    const second = await reopenedRepository.querySource(source, { session_id: 'pos-session-demo-001', current_company_name: 'Core3 Demo Company', state: 'Posted' }, 0, 50);
    expect(second.data).toEqual(first.data);
    reopenedDatabase.close();
  });
});

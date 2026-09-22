import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS session Continue Selling action parity', () => {
  test('maps the Odoo session action to the existing touch route with write permission', () => {
    const page = yaml('pages/pos-session-detail.yaml');
    const api = yaml('api/pos-session-detail.yaml');
    const touchPage = yaml('pages/pos-touch.yaml');
    const touchApi = yaml('api/pos-touch.yaml');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/views/pos_session_view.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/models/pos_session.py', 'utf8');
    const headerAction = page.components[0].header_actions.find((candidate: any) => candidate.id === 'continue_session_selling');
    const action = api.actions.find((candidate: any) => candidate.id === 'continue_session_selling');
    const sessionSource = touchApi.datasources.find((candidate: any) => candidate.id === 'pos_touch_session');

    expect(api.page.id).toBe(page.page.id);
    expect(headerAction).toMatchObject({ id: 'continue_session_selling', label: 'Continue Selling', permission: 'pos.write' });
    expect(headerAction.show_if).toContain("state.pos_session_detail.state === 'Opening Control'");
    expect(headerAction.show_if).toContain("state.pos_session_detail.state === 'In Progress'");
    expect(action).toMatchObject({ type: 'navigate', permission: 'pos.write', navigate_to: '/point-of-sale/touch', params: { id: '{state.id}' } });
    expect(touchPage.page).toMatchObject({ id: 'pos-touch', route: '/point-of-sale/touch' });
    expect(sessionSource).toMatchObject({ permission: 'pos.read' });
    expect(sessionSource.query).toContain('s.company = :current_company_name');
    expect(sessionSource.query).toContain('s.id = :id');
    expect(sourceView).toContain('name="open_frontend_cb"');
    expect(sourceView).toContain('string="Continue Selling"');
    expect(sourceModel).toContain('def open_frontend_cb(self):');
    expect(sourceModel).toContain("return self.config_id.open_ui()");
  });

  test('keeps the selected session durable and company-scoped for the touch handoff', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `pos_session_continue_selling_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const source = yaml('api/pos-touch.yaml').datasources.find((candidate: any) => candidate.id === 'pos_touch_session');
    const params = { id: 'pos-session-demo-001', current_company_name: 'Core3 Demo Company', fixture_state: null };
    const session = await repository.querySource(source, params, 0, 1);

    expect(session.data).toMatchObject({ id: params.id, state: 'In Progress', config: 'Furniture Shop' });
    expect((await repository.querySource(source, { ...params, current_company_name: 'Core3 Vietnam Branch' }, 0, 1)).data).toEqual({});
    expect(source).toMatchObject({ permission: 'pos.read' });

    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await repository.querySource(source, params, 0, 1)).data).toEqual(session.data);
    database.close();
  });
});

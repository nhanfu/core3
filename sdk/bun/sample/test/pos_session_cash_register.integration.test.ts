import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS session Cash Register action parity', () => {
  test('maps Odoo show_cash_register to a permissioned session-scoped page/API pair', () => {
    const page = yaml('pages/pos-session-detail.yaml');
    const api = yaml('api/pos-session-detail.yaml');
    const cashRegisterPage = yaml('pages/pos-session-cash-register.yaml');
    const cashRegisterApi = yaml('api/pos-session-cash-register.yaml');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/views/pos_session_view.xml', 'utf8');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/point_of_sale/models/pos_session.py', 'utf8');
    const statButton = page.components[0].stat_buttons.find((candidate: any) => candidate.id === 'open_session_cash_register');
    const action = api.actions.find((candidate: any) => candidate.id === 'open_session_cash_register');
    const source = cashRegisterApi.datasources.find((candidate: any) => candidate.id === 'pos_session_cash_register');

    expect(api.page.id).toBe(page.page.id);
    expect(statButton).toMatchObject({ id: 'open_session_cash_register', label: 'Cash Register', value_field: 'cash_register_line_count', permission: 'accounting.read' });
    expect(statButton.show_if).toContain('state.pos_session_detail.cash_control === true');
    expect(action).toMatchObject({
      type: 'navigate',
      permission: 'accounting.read',
      navigate_to: '/point-of-sale/session-cash-register',
      params: { session_id: '{state.id}' },
    });
    expect(cashRegisterApi.page.id).toBe(cashRegisterPage.page.id);
    expect(cashRegisterPage.page).toMatchObject({ id: 'pos-session-cash-register', route: '/point-of-sale/session-cash-register' });
    expect(cashRegisterPage.page.auth).toEqual({ require: ['accounting.read'] });
    expect(source).toMatchObject({ permission: 'accounting.read' });
    expect(source.query).toContain('m.session_id = :session_id');
    expect(source.query).toContain('s.company = :current_company_name');
    expect(sourceView).toContain('name="show_cash_register"');
    expect(sourceView).toContain('<span class="o_stat_text">Cash Register</span>');
    expect(sourceView).toContain('groups="account.group_account_readonly"');
    expect(sourceModel).toContain('def show_cash_register(self):');
    expect(sourceModel).toContain("'res_model': 'account.bank.statement.line'");
    expect(sourceModel).toContain("('id', 'in', self.statement_line_ids.ids)");
  });

  test('returns only the selected company session lines and survives migration replay', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrationName = `pos_session_cash_register_${crypto.randomUUID().replaceAll('-', '_')}`;
    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const source = yaml('api/pos-session-cash-register.yaml').datasources[0];
    const params = { session_id: 'pos-session-demo-closing', current_company_name: 'Core3 Demo Company', q: null };
    const lines = await repository.querySource(source, params, 0, 50);

    expect(lines.data).toHaveLength(2);
    expect(lines.data.map((line: any) => line.reason)).toEqual(['Petty cash', 'Float top-up']);
    expect((await repository.querySource(source, { ...params, q: 'Float' }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(source, { ...params, current_company_name: 'Core3 Vietnam Branch' }, 0, 50)).data).toEqual([]);
    expect(source).toMatchObject({ permission: 'accounting.read' });

    await migrateDatabase(repository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect((await repository.querySource(source, params, 0, 50)).data).toEqual(lines.data);
    database.close();
  });
});

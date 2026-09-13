import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS R2 actor and company boundaries', () => {
  test('isolates session, order, and payment detail routes by the authenticated company', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_actor_company_boundaries', ['schema', 'data']);

    const session = yaml('api/pos-session-detail.yaml').datasources[0];
    const order = yaml('api/pos-order-detail.yaml').datasources[0];
    const payment = yaml('api/pos-payment-detail.yaml').datasources[0];
    const demo = { id: 'pos-session-demo-001', current_company_name: 'Core3 Demo Company' };
    const vietnam = { id: 'pos-session-r2-vietnam', current_company_name: 'Core3 Vietnam Branch' };

    expect((await repository.querySource(session, demo, 0, 1)).data).toMatchObject({ id: demo.id, company: demo.current_company_name });
    expect((await repository.querySource(session, { ...vietnam, current_company_name: demo.current_company_name }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(session, vietnam, 0, 1)).data).toMatchObject({ id: vietnam.id, company: vietnam.current_company_name });
    expect((await repository.querySource(order, { id: 'pos-order-r2-vietnam', current_company_name: 'Core3 Demo Company' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(payment, { id: 'pos-payment-r2-vietnam', current_company_name: 'Core3 Vietnam Branch' }, 0, 1)).data)
      .toMatchObject({ id: 'pos-payment-r2-vietnam', company: 'Core3 Vietnam Branch' });
  });

  test('requires an authenticated actor, company ownership, and the current order version before payment', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_actor_payment_mutation', ['schema', 'data']);
    await repository.run("INSERT INTO pos_orders(id, name, session_id, state, amount_total, amount_paid, company) VALUES ('pos-order-r2-payment-test', 'POS/R2/TEST', 'pos-session-demo-001', 'New', 20, 0, 'Core3 Demo Company')");
    const action = yaml('pages/pos-order-detail.yaml').actions.find((candidate: any) => candidate.id === 'pay_pos_order_detail');
    const base = { id: 'pos-order-r2-payment-test', payment_amount: 20, payment_method: 'Cash', expected_row_version: 1 };

    await expect(repository.executeMutation(action.mutation, base)).rejects.toMatchObject({ status: 401, code: 'POS_ORDER_UNAUTHENTICATED' });
    await expect(repository.executeMutation(action.mutation, { ...base, current_user_id: 'user-admin', current_company_name: 'Core3 Vietnam Branch' }))
      .rejects.toMatchObject({ status: 403, code: 'POS_ORDER_COMPANY_FORBIDDEN' });
    await expect(repository.executeMutation(action.mutation, { ...base, current_user_id: 'user-admin', current_company_name: 'Core3 Demo Company', expected_row_version: 9 }))
      .rejects.toMatchObject({ status: 409, code: 'POS_ORDER_STALE' });

    const paid = await repository.executeMutation(action.mutation, { ...base, current_user_id: 'user-admin', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company' }) as any;
    expect(paid).toMatchObject({ id: base.id, state: 'Paid', amount_paid: 20, actor_id: 'user-admin' });
    expect(await repository.query('SELECT COUNT(*) AS count FROM pos_payments WHERE order_id = ?', [base.id])).toEqual([{ count: 1 }]);
    expect(await repository.query('SELECT COUNT(*) AS count FROM pos_payments WHERE order_id = ?', ['missing-order'])).toEqual([{ count: 0 }]);
  });

  test('declares refusal states and actor/company guards on the three R2 surfaces', () => {
    const session = yaml('api/pos-session-detail.yaml');
    const order = yaml('api/pos-order-detail.yaml');
    const payment = yaml('api/pos-payment-detail.yaml');
    for (const source of [session.datasources[0], order.datasources[0], payment.datasources[0]]) {
      expect(source.error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, not_found: { status: 404 }, transport_error: { status: 503 } });
      expect(source.query).toContain(':current_company_name');
    }
    const workflow = yaml('pages/pos-order-workflow.yaml').workflow;
    expect(workflow.transitions[0].mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 401, code: 'POS_ORDER_UNAUTHENTICATED' }),
      expect.objectContaining({ status: 403, code: 'POS_ORDER_COMPANY_FORBIDDEN' }),
      expect.objectContaining({ status: 409, code: 'POS_ORDER_STALE' }),
    ]));
  });
});

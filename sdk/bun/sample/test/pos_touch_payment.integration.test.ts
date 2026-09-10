import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS touch payment contract', () => {
  test('keeps touch tender methods and open-ticket line data service-owned', () => {
    const api = yaml('api/pos-touch.yaml');
    const methods = api.datasources.find((source: any) => source.id === 'pos_touch_payment_methods');
    const orders = api.datasources.find((source: any) => source.id === 'pos_touch_open_orders');

    expect(methods).toMatchObject({ permission: 'pos.read', single: false });
    expect(methods.query).toContain('FROM pos_payment_methods');
    expect(methods.query).toContain('active = true');
    expect(orders.query).toContain('line_product_id');
    expect(orders.query).toContain("o.state = 'New'");
  });

  test('keeps add-product and payment guards on named server mutations', () => {
    const page = yaml('pages/pos-touch.yaml');
    const add = page.actions.find((action: any) => action.action === 'pos.touch.add_product');
    const pay = page.actions.find((action: any) => action.action === 'pos.touch.payment');

    expect(add).toMatchObject({ type: 'server', permission: 'pos.write', handler: 'yaml_mutation' });
    expect(add.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 409, message: 'Select an open ticket before adding products' }),
      expect.objectContaining({ status: 404, message: 'Product not found or inactive' }),
    ]));
    expect(pay).toMatchObject({ type: 'server', permission: 'pos.write', handler: 'yaml_mutation' });
    expect(pay.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 400, message: 'Payment exceeds the remaining balance' }),
      expect.objectContaining({ status: 422, message: 'Payment method is not available in this register' }),
    ]));
  });

  test('exposes the opening-control session state and guarded open action', () => {
    const api = yaml('api/pos-touch.yaml');
    const session = api.datasources.find((source: any) => source.id === 'pos_touch_session');
    expect(session.query).toContain("'Opening Control'");
    expect(session.query).toContain('opening_note');

    const page = yaml('pages/pos-touch.yaml');
    const open = page.actions.find((action: any) => action.action === 'pos.touch.open_session');
    expect(open).toMatchObject({ type: 'server', permission: 'pos.write', handler: 'yaml_mutation' });
    expect(open.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 409, message: 'This register is no longer waiting for opening control' }),
      expect.objectContaining({ status: 422, message: 'Opening cash must be zero or greater' }),
    ]));
  });

  test('provides a deterministic open touch ticket fixture', () => {
    const migration = yaml('migrations/20260910180000-014-pos-touch-payment.yaml');
    expect(migration.version).toBe('0.0.14');
    expect(migration.type.postgres.up).toContain('pos-order-touch-demo-001');
    expect(migration.type.postgres.up).toContain('pos-line-touch-demo-001');
  });

  test('adds the opening note column after the existing session fixtures', () => {
    const migration = yaml('migrations/20260910230000-019-pos-touch-opening-control.yaml');
    expect(migration.version).toBe('0.0.19');
    expect(migration.type.postgres.up).toContain('opening_note');
  });

  test('opens the deterministic register with counted cash and note', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'pos_touch_opening_control_migrations', ['schema', 'data']);
    const api = yaml('api/pos-touch.yaml');
    const page = yaml('pages/pos-touch.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'pos_touch_session');
    const open = page.actions.find((candidate: any) => candidate.id === 'touch_open_session_backend');

    expect((await repository.querySource(source, { id: 'pos-session-demo-opening' }, 0, 1)).data)
      .toMatchObject({ id: 'pos-session-demo-opening', state: 'Opening Control', opening_note: '' });
    await expect(repository.executeMutation(open.mutation, {
      session_id: 'pos-session-demo-opening', opening_cash: '-1', opening_note: '',
    })).rejects.toMatchObject({ status: 422 });
    const opened = await repository.executeMutation(open.mutation, {
      session_id: 'pos-session-demo-opening', opening_cash: '312.50', opening_note: 'Counted by Maya',
    });
    expect(opened).toMatchObject({ id: 'pos-session-demo-opening', state: 'In Progress', opening_counted: 312.5, opening_note: 'Counted by Maya' });
    await expect(repository.executeMutation(open.mutation, {
      session_id: 'pos-session-demo-opening', opening_cash: '1', opening_note: '',
    })).rejects.toMatchObject({ status: 409 });
  });
});

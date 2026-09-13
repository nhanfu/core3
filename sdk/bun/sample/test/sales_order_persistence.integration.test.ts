import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/order');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Sales order persistence parity', () => {
  test('preserves quotation edits across restart and idempotent migration replay', async () => {
    const databasePath = `/tmp/core3-order-restart-${crypto.randomUUID()}.duckdb`;
    const migrationTable = `order_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const migrationRoot = join(root, 'migrations');

    const firstDatabase = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(firstDatabase);
    await migrateDatabase(firstRepository, migrationRoot, undefined, migrationTable, ['schema', 'data']);

    const api = yaml('api/sale-order-detail.yaml');
    const update = api.actions.find((action: any) => action.id === 'edit_sale_order');
    const original = (await firstRepository.query('SELECT row_version FROM orders WHERE id = ?', ['order-demo-01']))[0];
    const changed = await firstRepository.executeMutation(update.mutation, {
      id: 'order-demo-01',
      order_number: 'DH-2026-0101',
      customer_name: 'Công ty TNHH Minh Long',
      customer_legal_name: 'Minh Long Logistics Co., Ltd.',
      customer_reference: 'PO-RESTART-001',
      order_date: '2026-08-12',
      validity_date: '2026-09-30',
      commitment_date: '2026-10-01',
      pricelist_name: 'Public Pricelist',
      payment_term_name: 'Net 30',
      require_signature: true,
      require_payment: false,
      notes: 'Persist this quotation edit across restart',
      expected_row_version: original.row_version,
      view_scope: 'all',
    }) as any;
    expect(changed).toMatchObject({ id: 'order-demo-01', customer_reference: 'PO-RESTART-001', validity_date: '2026-09-30T00:00:00.000Z' });
    expect(Number(changed.row_version)).toBe(Number(original.row_version) + 1);
    await firstDatabase.close();

    const secondDatabase = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(secondDatabase);
    await migrateDatabase(secondRepository, migrationRoot, undefined, migrationTable, ['schema', 'data']);
    await migrateDatabase(secondRepository, migrationRoot, undefined, migrationTable, ['schema', 'data']);

    expect(await secondRepository.query(
      'SELECT customer_reference, validity_date, commitment_date, notes, row_version FROM orders WHERE id = ?',
      ['order-demo-01'],
    )).toEqual([expect.objectContaining({
      customer_reference: 'PO-RESTART-001',
      validity_date: '2026-09-30T00:00:00.000Z',
      commitment_date: '2026-10-01T00:00:00.000Z',
      notes: 'Persist this quotation edit across restart',
      row_version: Number(original.row_version) + 1,
    })]);
    expect(await secondRepository.query('SELECT COUNT(*) AS count FROM orders WHERE id LIKE \'order-demo-%\'')).toEqual([{ count: 12 }]);
    expect(await secondRepository.query('SELECT COUNT(*) AS count FROM order_lines WHERE id LIKE \'order-line-demo-%\'')).toEqual([{ count: 11 }]);
    expect(await secondRepository.query('SELECT COUNT(*) AS count FROM sale_quotation_templates')).toEqual([{ count: 1 }]);
    expect(await secondRepository.query('SELECT COUNT(*) AS count FROM sale_quotation_template_lines')).toEqual([{ count: 1 }]);
    await secondDatabase.close();
  }, 30000);
});

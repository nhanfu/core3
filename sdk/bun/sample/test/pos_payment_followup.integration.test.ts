import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '../services/point_of_sale');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('POS cashier payment follow-up', () => {
  test('projects the remaining amount and active tender catalog from service-owned data', () => {
    const api = yaml('api/pos-cashier.yaml');
    const tickets = api.datasources.find((source: any) => source.id === 'pos_open_tickets');
    const methods = api.datasources.find((source: any) => source.id === 'pos_cashier_payment_methods');

    expect(tickets.query).toContain('AS amount');
    expect(methods.permission).toBe('pos.read');
    expect(methods.query).toContain('FROM pos_payment_methods');
    expect(methods.query).toContain('active = true');
  });

  test('uses row-aware payment prefill and validates the tender contract', () => {
    const page = yaml('pages/pos-cashier.yaml');
    const payment = page.actions.find((action: any) => action.id === 'pay_cashier_ticket');

    expect(payment.prefill).toEqual({ ticket_id: '{row.id}', amount: '{row.amount}' });
    expect(payment.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'amount', type: 'money', decimals: 2, min: 0.01 }),
      expect.objectContaining({ field: 'method', options_source: 'pos_cashier_payment_methods', default: 'Cash' }),
    ]));
    expect(payment.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: 'Payment exceeds remaining balance', status: 400 }),
      expect.objectContaining({ message: 'Payment method is not available in this POS', status: 422 }),
    ]));
  });

  test('declares explicit cashier empty states', () => {
    const page = yaml('pages/pos-cashier.yaml');
    const lists = page.components.filter((component: any) => component.type === 'ListView');
    expect(lists[0].empty_state).toEqual(expect.objectContaining({ title: 'No products found' }));
    expect(lists[1].empty_state).toEqual(expect.objectContaining({ title: 'No open tickets' }));
  });
});

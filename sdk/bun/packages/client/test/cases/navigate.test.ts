import { afterEach, describe, expect, it } from 'vitest';
import { getPageParams } from '@core3/client/navigate';

describe('page parameters', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('reads query parameters from an SPA hash', () => {
    window.history.replaceState(
      {},
      '',
      '/?stale=true#/accounting/documents/detail?id=acct-debit-01&kind=debit_note',
    );

    expect(getPageParams()).toEqual({
      id: 'acct-debit-01',
      kind: 'debit_note',
    });
  });

  it('falls back to the document query string for non-hash navigation', () => {
    window.history.replaceState({}, '', '/orders/detail?id=order-01');

    expect(getPageParams()).toEqual({ id: 'order-01' });
  });

  it('decodes status filters from dashboard hash links', () => {
    window.history.replaceState({}, '', '/#/orders?status=Pending%20Approval');

    expect(getPageParams()).toEqual({ status: 'Pending Approval' });
  });
});

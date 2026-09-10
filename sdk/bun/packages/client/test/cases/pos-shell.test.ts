import { afterEach, describe, expect, it, vi } from 'vitest';
import { PosShell } from '@core3/client/components/PosShell';

const session = { id: 'session-1', name: 'POS/2026/09/10/001', state: 'In Progress' };
const product = { id: 'product-1', name: 'House coffee', barcode: 'POS-COFFEE', category: 'Drinks', price: 3.5, tax_rate: 10 };
const line = { lineId: 'line-1', productId: product.id, productName: product.name, qty: 1, unitPrice: 3.5, taxRate: 10, discount: 0, total: 3.85 };

afterEach(() => {
  document.body.innerHTML = '';
});

describe('POS touch selling shell', () => {
  it('submits a service action when a touch product is selected', async () => {
    const submit = vi.fn().mockResolvedValue({});
    const shell = new PosShell('touch', {
      sessionSource: session,
      bootstrapProducts: [product],
      openOrders: [{ id: 'order-1', amount_total: 3.85, amount_paid: 0 }],
      activeOrderId: 'order-1',
      canWrite: true,
      paymentMethods: [{ value: 'Cash', label: 'Cash' }],
    });
    shell._transport = { submit };
    shell.mount(document.body);

    document.querySelector<HTMLElement>('[data-touch-product="product-1"]')!.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(submit).toHaveBeenCalledWith('touch_add_product', {
      ticket_id: 'order-1', product_id: 'product-1', quantity: 1,
    });
    expect(document.querySelector('.pos-cart-panel')?.textContent).toContain('House coffee');
  });

  it('shows tender amount/change and submits the selected payment method', async () => {
    const submit = vi.fn().mockResolvedValue({});
    const shell = new PosShell('touch', {
      sessionSource: session,
      screen: 'payment',
      openOrders: [{ id: 'order-1', name: 'POS/1', amount_total: 3.85, amount_paid: 0 }],
      activeOrderId: 'order-1',
      cart: [line],
      canWrite: true,
      paymentMethods: [{ value: 'Cash', label: 'Cash' }, { value: 'Card', label: 'Card' }],
      selectedPaymentMethod: 'Cash',
    });
    shell._transport = { submit };
    shell.mount(document.body);

    const amount = document.querySelector<HTMLInputElement>('[data-touch-tender-amount]')!;
    expect(amount.value).toBe('3.85');
    amount.value = '5.00';
    amount.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector('[data-touch-payment-error]')?.textContent).toBe('');
    expect(document.querySelector('[data-touch-validate-payment]')?.textContent).toContain('Validate payment');
    expect(document.body.textContent).toContain('$1.15');

    document.querySelector<HTMLButtonElement>('[data-touch-tender="Card"]')!.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    document.querySelector<HTMLButtonElement>('[data-touch-validate-payment]')!.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(submit).toHaveBeenCalledWith('touch_submit_payment', {
      ticket_id: 'order-1', amount: '5.00', method: 'Card',
    });
    expect(document.querySelector('.pos-receipt-screen')).not.toBeNull();
  });

  it('renders a visible permission boundary and keeps product taps inert', async () => {
    const submit = vi.fn();
    const shell = new PosShell('touch', {
      sessionSource: session,
      bootstrapProducts: [product],
      canWrite: false,
      paymentMethods: [{ value: 'Cash', label: 'Cash' }],
    });
    shell._transport = { submit };
    shell.mount(document.body);

    const card = document.querySelector<HTMLElement>('[data-touch-product="product-1"]')!;
    expect(card.getAttribute('aria-disabled')).toBe('true');
    card.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(submit).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('POS write access is required');
  });

  it('renders Odoo-style opening control and submits the counted cash', async () => {
    const submit = vi.fn().mockResolvedValue({});
    const shell = new PosShell('touch', {
      sessionSource: { id: 'opening-1', name: 'POS/2026/09/10/001', state: 'Opening Control', balance_start: 300 },
      bootstrapProducts: [product],
      canWrite: true,
    });
    shell._transport = { submit };
    shell.mount(document.body);

    expect(document.querySelector('[data-touch-opening-control]')).not.toBeNull();
    expect(document.body.textContent).toContain('Opening Control');
    const cash = document.querySelector<HTMLInputElement>('[data-touch-opening-cash]')!;
    expect(cash.value).toBe('300.00');
    cash.value = '312.50';
    document.querySelector<HTMLTextAreaElement>('[data-touch-opening-note]')!.value = 'Counted by Maya';
    document.querySelector<HTMLButtonElement>('[data-touch-opening-submit]')!.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(submit).toHaveBeenCalledWith('touch_open_session', {
      session_id: 'opening-1', opening_cash: '312.50', opening_note: 'Counted by Maya',
    });
  });

  it('restores a pending receipt after the page is reconstructed', () => {
    sessionStorage.setItem('core3.pos.touch.pending-receipt', JSON.stringify({
      receiptOrder: { name: 'POS/1', amount_total: 3.85, amount_paid: 3.85, payment_method: 'Cash' },
      change: 1.15,
      timestamp: Date.now(),
    }));

    const state = PosShell.resolveState({}, {
      dataMap: {
        pos_touch_session: { data: session },
        pos_touch_open_orders: { data: [] },
        pos_touch_payment_methods: { data: [{ value: 'Cash', label: 'Cash' }] },
        pos_touch_products: { data: [] },
      },
      user: { permissions: ['pos.write'] },
    });

    expect(state.screen).toBe('receipt');
    expect(state.receiptOrder).toMatchObject({ name: 'POS/1', amount_paid: 3.85 });
    expect(state.change).toBe(1.15);
    sessionStorage.removeItem('core3.pos.touch.pending-receipt');
  });
});

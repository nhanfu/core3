import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { showToast } from '@core3/client/components/Toast';
import { hasPermission } from '@core3/client/meta';

type CatalogProduct = {
  id: string;
  name: string;
  barcode: string | null;
  category: string;
  price: number;
  tax_rate: number;
};

type CartLine = {
  lineId: string;
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  total: number;
};

type PaymentMethod = {
  value: string;
  label: string;
};

export class PosShell extends BaseComponent {
  private static readonly receiptStorageKey = 'core3.pos.touch.pending-receipt';
  def: any;
  private _session: any = null;
  private _products: CatalogProduct[] = [];
  private _orders: any[] = [];

  constructor(id: string, state: any = {}, def: any = {}) {
    super(id, {
      sessionId: null,
      sessionName: 'No session',
      sessionStatus: 'closed',
      activeOrderId: null,
      screen: 'product',
      catalog: [],
      cart: [],
      customer: null,
      paymentsDue: 0,
      change: 0,
      receiptOrder: null,
      canWrite: false,
      paymentMethods: [],
      paidAmount: 0,
      tenderAmount: '',
      selectedPaymentMethod: 'Cash',
      paymentError: '',
      ...state,
    });
    this.def = def;
  }

  static resolveState(_definition: any, context: any = {}) {
    const dataMap = context.dataMap || {};
    const value = (id: string) => dataMap[id]?.data;
    const session = value('pos_touch_session') || {};
    const orders = Array.isArray(value('pos_touch_open_orders')) ? value('pos_touch_open_orders') : [];
    const paymentMethods = (Array.isArray(value('pos_touch_payment_methods')) ? value('pos_touch_payment_methods') : [])
      .map((method: any) => ({
        value: String(method.value ?? method.name ?? ''),
        label: String(method.label ?? method.name ?? method.value ?? ''),
      }))
      .filter((method: PaymentMethod) => method.value);
    const order = orders[0] || {};
    const lineQuantity = Number(order.line_quantity || 0);
    const lineUnitPrice = Number(order.line_price_unit || 0);
    const lineTaxRate = Number(order.line_tax_rate || 0);
    const lineTotal = Number(order.line_total || 0);
    const initialCart = order.line_product_id && lineQuantity > 0
      ? [{
          lineId: `existing-${order.id}`,
          productId: String(order.line_product_id),
          productName: String(order.line_product_name || 'Current item'),
          qty: lineQuantity,
          unitPrice: lineUnitPrice,
          taxRate: lineTaxRate,
          discount: 0,
          total: lineTotal || Math.round(lineQuantity * lineUnitPrice * (1 + lineTaxRate / 100) * 100) / 100,
        }]
      : [];
    let storedReceipt: { receiptOrder: any; change: number; timestamp: number } | null = null;
    try {
      const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(PosShell.receiptStorageKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Date.now() - Number(parsed.timestamp || 0) < 10 * 60 * 1000) storedReceipt = parsed;
        else sessionStorage.removeItem(PosShell.receiptStorageKey);
      }
    } catch {
      storedReceipt = null;
    }

    return {
      sessionSource: session,
      bootstrapProducts: Array.isArray(value('pos_touch_products')) ? value('pos_touch_products') : [],
      openOrders: orders,
      sessionId: session.id || null,
      sessionName: session.name || 'No active session',
      sessionStatus: session.state || 'closed',
      activeOrderId: order.id || null,
      cart: initialCart,
      canWrite: hasPermission(context.user, 'pos.write'),
      paymentMethods,
      paidAmount: Number(order.amount_paid || 0),
      selectedPaymentMethod: paymentMethods[0]?.value || 'Cash',
      ...(storedReceipt ? {
        screen: 'receipt',
        activeOrderId: null,
        cart: [],
        receiptOrder: storedReceipt.receiptOrder,
        change: Number(storedReceipt.change || 0),
      } : {}),
    };
  }

  draw(container: HTMLElement) {
    this.disposeChildren();
    const sessionSource = this.state.sessionSource || {};
    const bootstrapProducts = this.state.bootstrapProducts || [];
    const openOrders = this.state.openOrders || [];

    const shell = html.take(container).div
      .className('pos-shell flex flex-col h-full min-h-screen w-full max-w-full overflow-x-hidden bg-gray-100')
      .ele();

    this._drawHeader(shell, sessionSource);

    const screen = this.state.screen || 'product';
    const body = html.take(shell).div.className('pos-shell__body flex-1 min-w-0 max-w-full overflow-hidden').ele();

    if (!sessionSource.id) {
      this._drawClosedSession(body);
    } else if (screen === 'payment') {
      this._drawPaymentScreen(body);
    } else if (screen === 'receipt') {
      this._drawReceiptScreen(body);
    } else if (screen === 'ticket') {
      this._drawTicketScreen(body, openOrders);
    } else {
      this._drawProductScreen(body, bootstrapProducts);
    }
  }

  private _drawHeader(container: HTMLElement, session: any) {
    const header = html.take(container).header
      .className('pos-shell__header flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-white border-b shadow-sm')
      .ele();

    // Left: session info
    const info = html.take(header).div.className('flex flex-col').ele();
    html.take(info).span.className('text-xs text-gray-500').text('Session').ele();
    html.take(info).span.className('text-sm font-semibold text-gray-900')
      .text(session?.name || this.state.sessionName || 'No active session').ele();

    // Center: screen tabs
    const tabs = html.take(header).div.className('flex gap-1').ele();
    const screens: Array<[string, string]> = [
      ['product', 'Products'],
      ['ticket', 'Tickets'],
    ];
    for (const [screen, label] of screens) {
      const active = this.state.screen === screen;
      html.take(tabs).button
        .attr('data-touch-screen', screen)
        .className(`px-3 py-1.5 text-sm rounded-md transition-colors ${active ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`)
        .text(label)
        .event('click', () => this.setState({ screen }))
        .ele();
    }

    // Right: status badge + session state
    const right = html.take(header).div.className('flex items-center gap-3').ele();
    const status = session?.state || this.state.sessionStatus || '—';
    const statusColor = status === 'In Progress' ? 'bg-green-100 text-green-800'
      : status === 'Closing Control' ? 'bg-amber-100 text-amber-800'
      : 'bg-gray-100 text-gray-600';
    html.take(right).span
      .className(`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`)
      .text(status).ele();
  }

  private _drawClosedSession(container: HTMLElement) {
    const panel = html.take(container).div
      .className('pos-touch-state flex min-h-[360px] items-center justify-center bg-white p-6')
      .ele();
    const card = html.take(panel).div.className('w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm').ele();
    html.take(card).div.className('mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700').text('!').ele();
    html.take(card).h2.className('mb-2 text-lg font-semibold text-gray-900').text('No active register').ele();
    html.take(card).p.className('mb-6 text-sm text-gray-500').text(
      this.state.canWrite
        ? 'Open a POS register before starting a touch sale.'
        : 'You have view-only access. POS write access is required to open a register and accept payments.',
    ).ele();
    if (this.state.canWrite) {
      html.take(card).button
        .attr('data-touch-open-register', 'true')
        .className('min-h-12 w-full rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700')
        .text('Open register')
        .event('click', () => this.submit('touch_open_cashier'))
        .ele();
    }
  }

  private _drawProductScreen(container: HTMLElement, products: CatalogProduct[]) {
    const wrap = html.take(container).div
      .className('pos-product-screen flex flex-col md:flex-row h-full min-w-0 max-w-full')
      .ele();

    // Catalog panel
    const catalog = html.take(wrap).div
      .className('pos-catalog w-full md:flex-1 p-4 overflow-y-auto bg-white border-r')
      .ele();

    html.take(catalog).h2.className('text-sm font-semibold text-gray-700 mb-3').text('Products').ele();
    if (!this.state.canWrite) {
      html.take(catalog).div
        .attr('role', 'status')
        .className('mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800')
        .text('View-only register: POS write access is required to add products or accept payments.')
        .ele();
    }

    // Search bar
    const searchWrap = html.take(catalog).div.className('relative mb-4').ele();
    const searchInput = html.take(searchWrap).input
      .attr('type', 'text')
      .attr('placeholder', 'Search by name or barcode...')
      .className('w-full pl-3 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300')
      .ele() as HTMLInputElement;

    const grid = html.take(catalog).div
      .className('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3')
      .ele();

    const renderProducts = (filter: string) => {
      grid.innerHTML = '';
      const filtered = filter
        ? products.filter(p => p.name.toLowerCase().includes(filter) || (p.barcode || '').toLowerCase().includes(filter))
        : products;
      for (const product of filtered) {
        const card = html.take(grid).div
          .className(`pos-product-card min-h-24 p-3 border border-gray-200 rounded-lg ${this.state.canWrite ? 'cursor-pointer hover:border-indigo-400 hover:bg-indigo-50' : 'cursor-not-allowed opacity-70'} transition-colors select-none`)
          .attr('data-touch-product', product.id)
          .attr('aria-disabled', String(!this.state.canWrite))
          .event('click', () => this._addToCart(product))
          .ele();
        html.take(card).div.className('font-medium text-sm text-gray-900 truncate').text(product.name).ele();
        html.take(card).div.className('text-xs text-gray-500 mt-0.5').text(product.category).ele();
        html.take(card).div.className('mt-2 flex items-center justify-between').ele().innerHTML =
          `<span class="text-sm font-semibold text-indigo-700">$${product.price.toFixed(2)}</span><span class="text-xs text-gray-400">${product.tax_rate}% tax</span>`;
      }
      if (!filtered.length) {
        html.take(grid).div.className('col-span-full flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 px-5 py-8 text-center')
          .text(products.length ? 'No products match this search' : 'No products are available in this register').ele();
      }
    };

    searchInput.addEventListener('input', () => renderProducts(searchInput.value.toLowerCase().trim()));
    renderProducts('');

    // Cart panel
    this._drawCartPanel(wrap);
  }

  private _drawCartPanel(container: HTMLElement) {
    const cart = this.state.cart || [];
    const cartTotal = cart.reduce((s: number, l: CartLine) => s + l.total, 0);

    const panel = html.take(container).div
      .className('pos-cart-panel w-full md:w-80 max-h-80 md:max-h-none flex flex-col bg-gray-50 border-l')
      .ele();

    // Cart header
    const cartHeader = html.take(panel).div
      .className('flex items-center justify-between px-4 py-3 border-b bg-white')
      .ele();
    html.take(cartHeader).span.className('font-semibold text-gray-800').text('Current order').ele();
    if (this.state.activeOrderId) {
      html.take(cartHeader).span.className('text-xs text-gray-400').text(`#${this.state.activeOrderId.slice(-6)}`).ele();
    }

    // Cart lines
    const lines = html.take(panel).div.className('flex-1 overflow-y-auto px-3 py-2 space-y-2').ele();
    if (!cart.length) {
      html.take(lines).div.className('text-center text-sm text-gray-400 py-8').text('No items in cart').ele();
    }
    for (const line of cart) {
      const row = html.take(lines).div.className('flex items-center gap-2 bg-white rounded p-2 shadow-sm').ele();
      const info = html.take(row).div.className('flex-1 min-w-0').ele();
      html.take(info).div.className('text-sm font-medium text-gray-900 truncate').text(line.productName).ele();
      html.take(info).div.className('text-xs text-gray-500').text(`${line.qty} × $${line.unitPrice.toFixed(2)}`).ele();
      html.take(row).span.className('text-sm font-semibold text-gray-900').text(`$${line.total.toFixed(2)}`).ele();
    }

    // Cart footer
    const footer = html.take(panel).div.className('border-t bg-white px-4 py-3 space-y-3').ele();
    const totalRow = html.take(footer).div.className('flex justify-between items-center').ele();
    html.take(totalRow).span.className('text-sm font-semibold text-gray-700').text('Total').ele();
    html.take(totalRow).span.className('text-lg font-bold text-gray-900').text(`$${cartTotal.toFixed(2)}`).ele();

    const payBtn = html.take(footer).button
      .attr('data-touch-pay', 'true')
      .className(`min-h-12 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${cart.length && this.state.canWrite ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`)
      .text('Pay')
      .ele();
    if (cart.length && this.state.canWrite) {
      payBtn.addEventListener('click', () => this.setState({ screen: 'payment' }));
    } else if (cart.length && !this.state.canWrite) {
      payBtn.setAttribute('aria-disabled', 'true');
    }
  }

  private _drawPaymentScreen(container: HTMLElement) {
    const cart = this.state.cart || [];
    const order = (this.state.openOrders || []).find((candidate: any) => candidate.id === this.state.activeOrderId) || {};
    const total = Number(order.amount_total || cart.reduce((s: number, l: CartLine) => s + l.total, 0));
    const paid = Number(this.state.paidAmount || order.amount_paid || 0);
    const due = Math.max(0, Math.round((total - paid) * 100) / 100);
    const methods: PaymentMethod[] = this.state.paymentMethods || [];
    const selectedMethod = this.state.selectedPaymentMethod || methods[0]?.value || '';
    const initialTender = this.state.tenderAmount || due.toFixed(2);

    const wrap = html.take(container).div
      .className('pos-payment-screen flex min-h-[420px] flex-col bg-white p-4 md:p-6')
      .ele();

    const top = html.take(wrap).div.className('mb-4 flex items-center justify-between gap-3 border-b pb-4').ele();
    html.take(top).button
      .attr('data-touch-payment-back', 'true')
      .className('min-h-11 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50')
      .text('← Back to order')
      .event('click', () => this.setState({ screen: 'product', paymentError: '' }))
      .ele();
    html.take(top).h2.className('text-lg font-semibold text-gray-900').text('Payment').ele();

    if (!this.state.activeOrderId || !cart.length) {
      const empty = html.take(wrap).div.className('flex flex-1 items-center justify-center').ele();
      const card = html.take(empty).div.className('w-full max-w-md rounded-xl border border-dashed border-gray-300 p-8 text-center').ele();
      html.take(card).h3.className('mb-2 text-base font-semibold text-gray-900').text('No order to pay').ele();
      html.take(card).p.className('mb-5 text-sm text-gray-500').text('Add an item to the current order before choosing a tender.').ele();
      html.take(card).button
        .className('min-h-11 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700')
        .text('Return to products')
        .event('click', () => this.setState({ screen: 'product', paymentError: '' }))
        .ele();
      return;
    }

    const columns = html.take(wrap).div.className('grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]').ele();
    const summary = html.take(columns).div.className('rounded-xl border border-gray-200 bg-gray-50 p-5').ele();
    html.take(summary).div.className('mb-1 text-sm text-gray-500').text('Amount due').ele();
    html.take(summary).div.className('text-4xl font-bold tracking-tight text-gray-900').text(`$${due.toFixed(2)}`).ele();
    html.take(summary).div.className('mt-3 flex justify-between border-t border-gray-200 pt-3 text-sm').ele()
      .innerHTML = `<span class="text-gray-500">Order total</span><strong>$${total.toFixed(2)}</strong>`;
    html.take(summary).div.className('flex justify-between text-sm').ele()
      .innerHTML = `<span class="text-gray-500">Already paid</span><strong>$${paid.toFixed(2)}</strong>`;

    const tender = html.take(columns).div.className('rounded-xl border border-gray-200 bg-white p-5 shadow-sm').ele();
    html.take(tender).h3.className('mb-3 text-base font-semibold text-gray-900').text('Choose a payment method').ele();
    const methodGrid = html.take(tender).div.className('grid grid-cols-2 gap-3').ele();
    for (const method of methods) {
      const active = method.value === selectedMethod;
      html.take(methodGrid).button
        .attr('data-touch-tender', method.value)
        .attr('aria-pressed', String(active))
        .className(`min-h-14 rounded-lg border-2 px-3 py-3 text-sm font-semibold transition-colors ${active ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'}`)
        .text(method.label)
        .event('click', () => this.setState({ selectedPaymentMethod: method.value, paymentError: '' }))
        .ele();
    }
    if (!methods.length) {
      html.take(tender).div.className('rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500').text('No active payment methods are configured for this register.').ele();
    }

    const amountLabel = html.take(tender).label.className('mt-5 block text-sm font-medium text-gray-700').text('Amount tendered').ele() as HTMLLabelElement;
    const amountInput = html.take(tender).input
      .attr('data-touch-tender-amount', 'true')
      .attr('type', 'text')
      .attr('inputmode', 'decimal')
      .attr('autocomplete', 'off')
      .className('mt-2 min-h-14 w-full rounded-lg border border-gray-300 px-4 text-right text-2xl font-semibold text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200')
      .ele() as HTMLInputElement;
    amountInput.value = initialTender;
    amountLabel.htmlFor = amountInput.id = `touch-tender-${Date.now()}`;

    const tenderSummary = html.take(tender).div.className('mt-3 space-y-1 text-sm').ele();
    const changeRow = html.take(tenderSummary).div.className('flex justify-between').ele();
    html.take(changeRow).span.className('text-gray-500').text('Change').ele();
    const changeValue = html.take(changeRow).strong.className('text-gray-900').ele() as HTMLElement;
    const remainingRow = html.take(tenderSummary).div.className('flex justify-between').ele();
    html.take(remainingRow).span.className('text-gray-500').text('Remaining').ele();
    const remainingValue = html.take(remainingRow).strong.className('text-gray-900').ele() as HTMLElement;

    const quickAmounts = html.take(tender).div.className('mt-4 grid grid-cols-2 gap-2').ele();
    for (const [id, label, value] of [['exact', 'Exact amount', due.toFixed(2)], ['twenty', '$20.00', '20.00']]) {
      html.take(quickAmounts).button
        .attr('data-touch-quick-amount', id)
        .className('min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50')
        .text(label)
        .event('click', () => {
          amountInput.value = value;
          this.state.tenderAmount = value;
          updateTenderSummary();
        })
        .ele();
    }

    html.take(tender).div
      .attr('data-touch-payment-error', 'true')
      .attr('role', 'alert')
      .className(`mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 ${this.state.paymentError ? '' : 'hidden'}`)
      .text(this.state.paymentError || '')
      .ele();
    const validate = html.take(tender).button
      .attr('data-touch-validate-payment', 'true')
      .className('mt-4 min-h-14 w-full rounded-lg bg-indigo-600 px-4 py-3 text-base font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300')
      .text('Validate payment')
      .ele() as HTMLButtonElement;
    validate.disabled = !methods.length;

    const updateTenderSummary = () => {
      const tenderAmount = Number(String(amountInput.value).replace(',', '.'));
      const valid = Number.isFinite(tenderAmount);
      const change = valid ? Math.max(0, tenderAmount - due) : 0;
      const remaining = valid ? Math.max(0, due - tenderAmount) : due;
      changeValue.textContent = `$${change.toFixed(2)}`;
      remainingValue.textContent = `$${remaining.toFixed(2)}`;
      this.state.tenderAmount = amountInput.value;
    };
    amountInput.addEventListener('input', updateTenderSummary);
    updateTenderSummary();
    validate.addEventListener('click', () => this._submitPayment(selectedMethod, Number(String(amountInput.value).replace(',', '.')), due));
  }

  private _drawReceiptScreen(container: HTMLElement) {
    const order = this.state.receiptOrder;
    const wrap = html.take(container).div
      .className('pos-receipt-screen flex flex-col items-center justify-center h-full p-8 bg-white')
      .ele();

    const card = html.take(wrap).div.className('w-full max-w-sm bg-white border rounded-xl shadow-md p-6').ele();
    html.take(card).div.className('text-center mb-4').ele().innerHTML =
      `<div class="text-lg font-bold text-gray-900">Receipt</div><div class="text-sm text-gray-500">${order?.receipt_number || order?.name || '—'}</div>`;

    if (order) {
      const fields = [
        ['Total', `$${Number(order.amount_total || 0).toFixed(2)}`],
        ['Paid', `$${Number(order.amount_paid || 0).toFixed(2)}`],
        ['Payment', order.payment_method || '—'],
        ['Change', `$${Number(this.state.change || 0).toFixed(2)}`],
      ];
      const table = html.take(card).div.className('space-y-2 border-t pt-4').ele();
      for (const [label, value] of fields) {
        const row = html.take(table).div.className('flex justify-between text-sm').ele();
        html.take(row).span.className('text-gray-500').text(label).ele();
        html.take(row).span.className('font-medium text-gray-900').text(value).ele();
      }
    }

    html.take(wrap).button
      .attr('data-touch-new-ticket', 'true')
      .className('mt-6 w-full max-w-sm py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors')
      .text('New ticket')
      .event('click', () => {
        try { sessionStorage.removeItem(PosShell.receiptStorageKey); } catch { /* storage may be disabled */ }
        this.setState({ screen: 'product', cart: [], activeOrderId: null, receiptOrder: null, paidAmount: 0, tenderAmount: '', change: 0, paymentError: '' });
      })
      .ele();
  }

  private _drawTicketScreen(container: HTMLElement, orders: any[]) {
    const wrap = html.take(container).div.className('pos-ticket-screen p-6 bg-white h-full overflow-y-auto').ele();
    html.take(wrap).h2.className('text-lg font-semibold text-gray-900 mb-4').text('Open tickets').ele();

    if (!orders.length) {
      const empty = html.take(wrap).div.className('flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 px-5 py-12 text-center').ele();
      html.take(empty).div.className('mb-2 text-base font-semibold text-gray-800').text('No open tickets').ele();
      html.take(empty).div.className('text-sm text-gray-500').text(this.state.canWrite ? 'Return to the register to start a new order.' : 'POS write access is required to create or pay tickets.').ele();
      return;
    }

    const list = html.take(wrap).div.className('space-y-3').ele();
    for (const order of orders) {
      const row = html.take(list).div
        .className('flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors')
        .event('click', () => this._resumeTicket(order))
        .ele();
      const info = html.take(row).div.className('flex-1').ele();
      html.take(info).div.className('text-sm font-semibold text-gray-900').text(order.name).ele();
      if (order.partner_name) {
        html.take(info).div.className('text-xs text-gray-500').text(order.partner_name).ele();
      }
      html.take(row).div.className('text-sm font-bold text-gray-900').text(`$${Number(order.amount_total || 0).toFixed(2)}`).ele();
    }
  }

  private async _addToCart(product: CatalogProduct) {
    if (!this.state.canWrite) {
      const message = 'POS write access is required to add products or accept payments.';
      showToast(message, 'warning');
      this.setState({ paymentError: message });
      return;
    }
    if (!this.state.activeOrderId) {
      const message = 'No active ticket is available. Open the cashier and start a ticket first.';
      showToast(message, 'warning');
      this.setState({ paymentError: message });
      return;
    }
    const existing = (this.state.cart || []).find((l: CartLine) => l.productId === product.id);
    let newCart: CartLine[];
    const subtotal = Number(product.price);
    const tax = Math.round(subtotal * product.tax_rate) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    if (existing) {
      newCart = (this.state.cart || []).map((l: CartLine) =>
        l.productId === product.id
          ? { ...l, qty: l.qty + 1, total: Math.round((l.unitPrice * (1 + l.taxRate / 100)) * (l.qty + 1) * 100) / 100 }
          : l
      );
    } else {
      const newLine: CartLine = {
        lineId: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: product.id,
        productName: product.name,
        qty: 1,
        unitPrice: subtotal,
        taxRate: product.tax_rate,
        discount: 0,
        total,
      };
      newCart = [...(this.state.cart || []), newLine];
    }
    try {
      await this.submit('touch_add_product', {
        ticket_id: this.state.activeOrderId,
        product_id: product.id,
        quantity: 1,
      });
      this.setState({ cart: newCart, paymentError: '' });
    } catch (error: any) {
      const message = error?.message || 'Unable to add this product to the order.';
      showToast(message, 'error');
      this.setState({ paymentError: message });
    }
  }

  private async _submitPayment(method: string, amount: number, due: number) {
    if (!this.state.activeOrderId) {
      showToast('No active ticket — create a ticket first.', 'warning');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      const message = 'Enter a payment amount greater than zero.';
      showToast(message, 'warning');
      this.setState({ paymentError: message });
      return;
    }
    if (!method) {
      const message = 'Select an active payment method.';
      showToast(message, 'warning');
      this.setState({ paymentError: message });
      return;
    }
    const order = (this.state.openOrders || []).find((candidate: any) => candidate.id === this.state.activeOrderId) || {};
    const total = Number(order.amount_total || due + Number(this.state.paidAmount || 0));
    const newPaid = Math.round((Number(this.state.paidAmount || 0) + amount) * 100) / 100;
    const change = Math.max(0, Math.round((amount - due) * 100) / 100);
    const remaining = Math.max(0, Math.round((due - amount) * 100) / 100);
    const receiptOrder = {
      ...order,
      amount_total: total,
      amount_paid: newPaid,
      payment_method: method,
    };
    if (remaining === 0) {
      try {
        sessionStorage.setItem(PosShell.receiptStorageKey, JSON.stringify({ receiptOrder, change, timestamp: Date.now() }));
      } catch { /* storage may be disabled */ }
    }
    try {
      await this.submit('touch_submit_payment', {
        ticket_id: this.state.activeOrderId,
        amount: amount.toFixed(2),
        method,
      });
      if (remaining === 0) {
        this.setState({
          screen: 'receipt',
          change,
          paymentError: '',
          receiptOrder,
        });
      } else {
        this.setState({ paidAmount: newPaid, change, paymentError: '' });
      }
    } catch (error: any) {
      if (remaining === 0) {
        try { sessionStorage.removeItem(PosShell.receiptStorageKey); } catch { /* storage may be disabled */ }
      }
      const message = error?.message || 'Payment failed — please retry.';
      showToast(message, 'error');
      this.setState({ paymentError: message });
    }
  }

  private _resumeTicket(order: any) {
    this.setState({ activeOrderId: order.id, screen: 'product' });
  }
}

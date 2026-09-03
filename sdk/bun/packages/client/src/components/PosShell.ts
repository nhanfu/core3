import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { showToast } from '@core3/client/components/Toast';

type PosState = {
  sessionId: string | null;
  sessionName: string;
  sessionStatus: string;
  activeOrderId: string | null;
  screen: 'product' | 'payment' | 'receipt' | 'ticket';
  catalog: CatalogProduct[];
  cart: CartLine[];
  customer: string | null;
  paymentsDue: number;
  change: number;
  receiptOrder: any | null;
};

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

export class PosShell extends BaseComponent {
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
      ...state,
    });
    this.def = def;
  }

  draw(container: HTMLElement) {
    this.disposeChildren();
    const sessionSource = this.state.sessionSource || {};
    const bootstrapProducts = this.state.bootstrapProducts || [];
    const openOrders = this.state.openOrders || [];

    const shell = html.take(container).div
      .className('pos-shell flex flex-col h-full min-h-screen bg-gray-100')
      .ele();

    this._drawHeader(shell, sessionSource);

    const screen = this.state.screen || 'product';
    const body = html.take(shell).div.className('pos-shell__body flex-1 overflow-hidden').ele();

    if (screen === 'payment') {
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
      .className('pos-shell__header flex items-center justify-between px-4 py-2 bg-white border-b shadow-sm')
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

  private _drawProductScreen(container: HTMLElement, products: CatalogProduct[]) {
    const wrap = html.take(container).div
      .className('pos-product-screen flex h-full')
      .ele();

    // Catalog panel
    const catalog = html.take(wrap).div
      .className('pos-catalog flex-1 p-4 overflow-y-auto bg-white border-r')
      .ele();

    html.take(catalog).h2.className('text-sm font-semibold text-gray-700 mb-3').text('Products').ele();

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
          .className('pos-product-card p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors select-none')
          .event('click', () => this._addToCart(product))
          .ele();
        html.take(card).div.className('font-medium text-sm text-gray-900 truncate').text(product.name).ele();
        html.take(card).div.className('text-xs text-gray-500 mt-0.5').text(product.category).ele();
        html.take(card).div.className('mt-2 flex items-center justify-between').ele().innerHTML =
          `<span class="text-sm font-semibold text-indigo-700">$${product.price.toFixed(2)}</span><span class="text-xs text-gray-400">${product.tax_rate}% tax</span>`;
      }
      if (!filtered.length) {
        html.take(grid).div.className('col-span-full text-center text-sm text-gray-400 py-8')
          .text('No products found').ele();
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
      .className('pos-cart-panel w-80 flex flex-col bg-gray-50 border-l')
      .ele();

    // Cart header
    const cartHeader = html.take(panel).div
      .className('flex items-center justify-between px-4 py-3 border-b bg-white')
      .ele();
    html.take(cartHeader).span.className('font-semibold text-gray-800').text('Current ticket').ele();
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
      .className(`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${cart.length ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`)
      .text('Payment')
      .ele();
    if (cart.length) {
      payBtn.addEventListener('click', () => this.setState({ screen: 'payment' }));
    }
  }

  private _drawPaymentScreen(container: HTMLElement) {
    const cart = this.state.cart || [];
    const total = cart.reduce((s: number, l: CartLine) => s + l.total, 0);

    const wrap = html.take(container).div
      .className('pos-payment-screen flex flex-col items-center justify-center h-full p-8 bg-white')
      .ele();

    html.take(wrap).h2.className('text-xl font-bold text-gray-900 mb-6').text('Payment').ele();

    // Total due
    const dueCard = html.take(wrap).div.className('w-full max-w-sm bg-gray-50 rounded-xl p-6 mb-6 text-center').ele();
    html.take(dueCard).div.className('text-sm text-gray-500 mb-1').text('Total due').ele();
    html.take(dueCard).div.className('text-4xl font-bold text-gray-900').text(`$${total.toFixed(2)}`).ele();

    // Payment method buttons
    const methods = html.take(wrap).div.className('w-full max-w-sm grid grid-cols-2 gap-3 mb-6').ele();
    for (const method of ['Cash', 'Card', 'Bank', 'Other']) {
      html.take(methods).button
        .className('py-3 px-4 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 transition-colors')
        .text(method)
        .event('click', () => this._submitPayment(method, total))
        .ele();
    }

    // Back button
    html.take(wrap).button
      .className('text-sm text-gray-500 hover:text-gray-700 underline')
      .text('← Back to products')
      .event('click', () => this.setState({ screen: 'product' }))
      .ele();
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
      ];
      const table = html.take(card).div.className('space-y-2 border-t pt-4').ele();
      for (const [label, value] of fields) {
        const row = html.take(table).div.className('flex justify-between text-sm').ele();
        html.take(row).span.className('text-gray-500').text(label).ele();
        html.take(row).span.className('font-medium text-gray-900').text(value).ele();
      }
    }

    html.take(wrap).button
      .className('mt-6 w-full max-w-sm py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors')
      .text('New ticket')
      .event('click', () => this.setState({ screen: 'product', cart: [], activeOrderId: null, receiptOrder: null }))
      .ele();
  }

  private _drawTicketScreen(container: HTMLElement, orders: any[]) {
    const wrap = html.take(container).div.className('pos-ticket-screen p-6 bg-white h-full overflow-y-auto').ele();
    html.take(wrap).h2.className('text-lg font-semibold text-gray-900 mb-4').text('Open tickets').ele();

    if (!orders.length) {
      html.take(wrap).div.className('text-center text-gray-400 py-12').text('No open tickets').ele();
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

  private _addToCart(product: CatalogProduct) {
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
    this.setState({ cart: newCart });
  }

  private async _submitPayment(method: string, amount: number) {
    if (!this.state.activeOrderId) {
      showToast({ message: 'No active ticket — create a ticket first', type: 'warning' });
      return;
    }
    // Delegate to YAML action via _onAction
    try {
      await this._onAction?.('pay_cashier_ticket', {
        ticket_id: this.state.activeOrderId,
        amount: amount.toFixed(2),
        method,
      });
      this.setState({ screen: 'receipt' });
    } catch {
      showToast({ message: 'Payment failed — please retry', type: 'error' });
    }
  }

  private _resumeTicket(order: any) {
    this.setState({ activeOrderId: order.id, screen: 'product' });
  }
}

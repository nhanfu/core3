import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export class ProductScreen extends BaseComponent {
  constructor(id: string, state: any = {}) {
    super(id, state);
  }

  draw(container: HTMLElement) {
    this.disposeChildren();
    const products = this.state.products || [];
    const cart = this.state.cart || [];
    const cartTotal = cart.reduce((s: number, l: any) => s + (l.total || 0), 0);

    const wrap = html.take(container).div
      .className('product-screen flex h-full bg-gray-50')
      .ele();

    // Left: product catalog
    const catalog = html.take(wrap).div
      .className('product-screen__catalog flex-1 flex flex-col p-4 bg-white border-r overflow-hidden')
      .ele();

    const searchWrap = html.take(catalog).div.className('relative mb-4').ele();
    const searchInput = html.take(searchWrap).input
      .attr('type', 'text')
      .attr('placeholder', 'Search by name or barcode...')
      .className('w-full pl-3 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300')
      .ele() as HTMLInputElement;

    const grid = html.take(catalog).div
      .className('flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3')
      .ele();

    const renderProducts = (filter: string) => {
      grid.innerHTML = '';
      const filtered = filter
        ? products.filter((p: any) => (p.name || '').toLowerCase().includes(filter) || (p.barcode || '').toLowerCase().includes(filter))
        : products;
      for (const product of filtered) {
        const card = html.take(grid).div
          .className('product-card p-3 border border-gray-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors select-none flex flex-col gap-1')
          .event('click', () => this.submit('add_product_to_cart', { product }))
          .ele();
        html.take(card).div.className('font-medium text-sm text-gray-900 truncate').text(product.name || '').ele();
        html.take(card).div.className('text-xs text-gray-500').text(product.category || '').ele();
        const priceRow = html.take(card).div.className('mt-auto flex items-center justify-between').ele();
        html.take(priceRow).span.className('text-sm font-semibold text-indigo-700').text(`$${Number(product.price || 0).toFixed(2)}`).ele();
        html.take(priceRow).span.className('text-xs text-gray-400').text(`${product.tax_rate || 0}% tax`).ele();
      }
      if (!filtered.length) {
        html.take(grid).div.className('col-span-full flex items-center justify-center text-sm text-gray-400 py-12')
          .text('No products found').ele();
      }
    };

    searchInput.addEventListener('input', () => renderProducts(searchInput.value.toLowerCase().trim()));
    renderProducts('');

    // Right: cart
    const cartPanel = html.take(wrap).div
      .className('product-screen__cart w-80 flex flex-col bg-gray-50 border-l')
      .ele();

    html.take(cartPanel).div
      .className('px-4 py-3 border-b bg-white font-semibold text-gray-800 text-sm')
      .text('Current ticket')
      .ele();

    const cartLines = html.take(cartPanel).div.className('flex-1 overflow-y-auto px-3 py-2 space-y-2').ele();
    if (!cart.length) {
      html.take(cartLines).div.className('text-center text-sm text-gray-400 py-8').text('No items in cart').ele();
    }
    for (const line of cart) {
      const lineRow = html.take(cartLines).div.className('flex items-center gap-2 bg-white rounded p-2 shadow-sm').ele();
      const info = html.take(lineRow).div.className('flex-1 min-w-0').ele();
      html.take(info).div.className('text-sm font-medium text-gray-900 truncate').text(line.productName || '').ele();
      html.take(info).div.className('text-xs text-gray-500').text(`${line.qty} × $${Number(line.unitPrice || 0).toFixed(2)}`).ele();
      html.take(lineRow).span.className('text-sm font-semibold text-gray-900').text(`$${Number(line.total || 0).toFixed(2)}`).ele();
    }

    const cartFooter = html.take(cartPanel).div.className('border-t bg-white px-4 py-3').ele();
    const totalRow = html.take(cartFooter).div.className('flex justify-between items-center mb-3').ele();
    html.take(totalRow).span.className('text-sm font-semibold text-gray-700').text('Total').ele();
    html.take(totalRow).span.className('text-lg font-bold text-gray-900').text(`$${cartTotal.toFixed(2)}`).ele();

    const payBtn = html.take(cartFooter).button
      .className(`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${cart.length ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`)
      .text('Payment')
      .ele();
    if (cart.length) {
      payBtn.addEventListener('click', () => this.submit('go_to_payment', {}));
    }
  }
}

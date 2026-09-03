import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export class ReceiptScreen extends BaseComponent {
  constructor(id: string, state: any = {}) {
    super(id, state);
  }

  draw(container: HTMLElement) {
    this.disposeChildren();
    const order = this.state.order || {};
    const lines = this.state.lines || [];
    const payments = this.state.payments || [];

    const wrap = html.take(container).div
      .className('receipt-screen flex flex-col items-center justify-center min-h-full p-8 bg-gray-50')
      .ele();

    const receipt = html.take(wrap).div
      .className('w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden')
      .ele();

    // Header
    const header = html.take(receipt).div.className('p-6 text-center bg-indigo-600 text-white').ele();
    html.take(header).div.className('text-lg font-bold mb-1').text('Receipt').ele();
    html.take(header).div.className('text-sm opacity-80').text(order.name || order.receipt_number || '—').ele();

    // Lines
    if (lines.length) {
      const lineSection = html.take(receipt).div.className('p-4 border-b').ele();
      for (const line of lines) {
        const lineRow = html.take(lineSection).div.className('flex justify-between text-sm py-1').ele();
        html.take(lineRow).span.className('text-gray-700').text(`${line.quantity || 1}× ${line.product_name || line.name || ''}`).ele();
        html.take(lineRow).span.className('font-medium text-gray-900').text(`$${Number(line.price_total || line.total || 0).toFixed(2)}`).ele();
      }
    }

    // Totals
    const totals = html.take(receipt).div.className('p-4 border-b space-y-2').ele();
    const fields: [string, string][] = [
      ['Tax', `$${Number(order.amount_tax || 0).toFixed(2)}`],
      ['Total', `$${Number(order.amount_total || 0).toFixed(2)}`],
    ];
    for (const [label, value] of fields) {
      const row = html.take(totals).div.className('flex justify-between text-sm').ele();
      html.take(row).span.className('text-gray-500').text(label).ele();
      html.take(row).span.className('font-semibold text-gray-900').text(value).ele();
    }

    // Payments
    if (payments.length) {
      const paySection = html.take(receipt).div.className('p-4 border-b space-y-2').ele();
      html.take(paySection).div.className('text-xs font-semibold text-gray-400 uppercase mb-2').text('Payments').ele();
      for (const payment of payments) {
        const row = html.take(paySection).div.className('flex justify-between text-sm').ele();
        html.take(row).span.className('text-gray-600').text(payment.method || 'Cash').ele();
        html.take(row).span.className('text-gray-900').text(`$${Number(payment.amount || 0).toFixed(2)}`).ele();
      }
    }

    // Change
    const paid = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const change = paid - Number(order.amount_total || 0);
    if (change > 0.001) {
      const changeSection = html.take(receipt).div.className('p-4 bg-green-50').ele();
      const row = html.take(changeSection).div.className('flex justify-between text-sm font-semibold').ele();
      html.take(row).span.className('text-green-700').text('Change').ele();
      html.take(row).span.className('text-green-800').text(`$${change.toFixed(2)}`).ele();
    }

    html.take(wrap).button
      .className('mt-6 w-full max-w-sm py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors')
      .text('New ticket')
      .event('click', () => this.submit('new_ticket', {}))
      .ele();
  }
}

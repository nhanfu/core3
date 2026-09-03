import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export class PaymentScreen extends BaseComponent {
  constructor(id: string, state: any = {}) {
    super(id, state);
  }

  draw(container: HTMLElement) {
    this.disposeChildren();
    const total = this.state.total || 0;
    const paymentMethods = this.state.paymentMethods || ['Cash', 'Card', 'Bank', 'Other'];

    const wrap = html.take(container).div
      .className('payment-screen flex flex-col items-center justify-center h-full p-8 bg-white')
      .ele();

    html.take(wrap).h2.className('text-2xl font-bold text-gray-900 mb-2').text('Payment').ele();
    html.take(wrap).p.className('text-sm text-gray-500 mb-8').text('Select a payment method to complete the sale').ele();

    const dueCard = html.take(wrap).div.className('w-full max-w-sm bg-indigo-50 border border-indigo-200 rounded-2xl p-8 mb-8 text-center').ele();
    html.take(dueCard).div.className('text-sm font-medium text-indigo-600 mb-1').text('Total due').ele();
    html.take(dueCard).div.className('text-5xl font-bold text-indigo-900').text(`$${Number(total).toFixed(2)}`).ele();

    const methods = html.take(wrap).div.className('w-full max-w-sm grid grid-cols-2 gap-3 mb-6').ele();
    for (const method of paymentMethods) {
      const label = typeof method === 'string' ? method : method.name;
      html.take(methods).button
        .className('py-4 px-4 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-indigo-500 hover:bg-indigo-50 transition-all')
        .text(label)
        .event('click', () => this.submit('submit_payment', { method: label, amount: total }))
        .ele();
    }

    html.take(wrap).button
      .className('text-sm text-gray-400 hover:text-gray-600 underline')
      .text('← Back to products')
      .event('click', () => this.submit('back_to_products', {}))
      .ele();
  }
}

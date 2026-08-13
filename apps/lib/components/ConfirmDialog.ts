import { html } from '@core3/client/html';
import { BaseComponent } from './BaseComponent.ts';

export class ConfirmDialog extends BaseComponent {
  draw(container) {
    const { open = false, title = 'Xác nhận', message = 'Bạn có chắc chắn không?', confirmLabel = 'Xác nhận', cancelLabel = 'Hủy', variant = 'danger' } = this.state;
    if (!open) return;

    const overlay = html.take(container)
      .div.className('fixed inset-0 z-50 flex items-center justify-center bg-black/40')
      .getContext();

    const dialog = html.take(overlay)
      .div.className('bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm mx-4 p-6')
      .getContext();

    html.take(dialog).h3.className('text-base font-semibold text-gray-900 mb-2').text(title);
    html.take(dialog).p.className('text-sm text-gray-600 mb-6').text(message);

    const btns = html.take(dialog).div.className('flex gap-2 justify-end').getContext();

    html.take(btns)
      .button.className('px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700')
      .text(cancelLabel)
      .event('click', () => this.setState({ open: false }));

    const confirmCls = variant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700'
      : 'bg-indigo-600 text-white hover:bg-indigo-700';

    html.take(btns)
      .button.className(`px-4 py-2 text-sm font-medium rounded-md ${confirmCls}`)
      .text(confirmLabel)
      .event('click', () => {
        this.setState({ open: false });
        this.submit('confirm', this.state.params || {});
      });
  }
}

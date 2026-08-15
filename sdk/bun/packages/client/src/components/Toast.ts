import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon } from '@core3/client/components/Icon';

export class Toast extends BaseComponent {
  draw(container) {
    const { message = '', type = 'info', visible = true } = this.state;
    if (!visible) return;

    const colorMap = {
      success: 'bg-green-50 border-green-200 text-green-800',
      error:   'bg-red-50 border-red-200 text-red-800',
      warning: 'bg-amber-50 border-amber-200 text-amber-800',
      info:    'bg-blue-50 border-blue-200 text-blue-800',
    };
    const cls = colorMap[type] || colorMap.info;

    const wrap = html.take(container)
      .div.className(`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-sm font-medium ${cls}`)
      .ele();

    html.take(wrap).span.text(String(message));
    const close = html.take(wrap)
      .button.className('ml-auto text-current opacity-60 hover:opacity-100 transition-opacity font-bold')
      .attr('aria-label', 'Đóng')
      .ele();
    appendIcon(close, 'x');
    html.take(close).event('click', () => this.setState({ visible: false }));
  }
}

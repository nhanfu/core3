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
      .div.className(`core3-toast core3-toast-${type} flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-sm font-medium ${cls}`)
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

export function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 4500): void {
  if (typeof document === 'undefined' || !document.body) return;
  const host = document.createElement('div');
  host.className = 'core3-toast-host';
  document.body.appendChild(host);
  const toast = new Toast(`toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, { message, type });
  toast.mount(host);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    toast.dispose();
    host.remove();
  };
  host.querySelector('button')?.addEventListener('click', close, { once: true });
  window.setTimeout(close, duration);
}

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

    const iconMap = { success: 'check', error: 'x', warning: 'warning', info: 'info' };
    const titleMap = { success: 'Saved', error: 'Unable to complete', warning: 'Not saved', info: 'Notice' };
    const wrap = html.take(container)
      .div.className(`core3-toast core3-toast-${type} ${cls}`)
      .attr('role', 'status')
      .attr('aria-live', type === 'error' ? 'assertive' : 'polite')
      .ele();

    const icon = html.take(wrap).span.className('core3-toast-icon').ele();
    appendIcon(icon, iconMap[type] || iconMap.info);
    const content = html.take(wrap).div.className('core3-toast-content').ele();
    html.take(content).strong.className('core3-toast-title').text(titleMap[type] || titleMap.info);
    html.take(content).span.className('core3-toast-message').text(String(message));
    const close = html.take(wrap)
      .button.className('core3-toast-close')
      .attr('aria-label', 'Đóng')
      .ele();
    appendIcon(close, 'x');
    html.take(close).event('click', () => this.setState({ visible: false }));
  }
}

export function toastTypeForError(error: unknown): 'error' | 'warning' {
  return error && typeof error === 'object' && (error as { code?: string }).code === 'STALE_RECORD'
    ? 'warning'
    : 'error';
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

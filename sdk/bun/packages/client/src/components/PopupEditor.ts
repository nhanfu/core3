import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon } from '@core3/client/components/Icon';
import { i18n } from '@core3/client/i18n';

export class PopupEditor extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state || { open: false, title: '' });
    this.def = def;
    this.child = null;
  }

  draw(container) {
    const { open = false, title = '' } = this.state;
    const d = this.def;
    if (!open) return;

    const overlay = html.take(container)
      .div.className('fixed inset-0 z-50 flex items-center justify-center bg-black/40')
      .ele();

    const panel = html.take(overlay)
      .div.className(`bg-white rounded-xl shadow-xl border border-gray-200 w-full ${d.width || 'max-w-lg'} mx-4 flex flex-col max-h-[90vh]`)
      .ele();

    const header = html.take(panel)
      .div.className('flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0')
      .ele();
    html.take(header).h3.className('text-base font-semibold text-gray-900').text(title);
    const close = html.take(header)
      .button.className('text-gray-400 hover:text-gray-600 text-xl leading-none')
      .attr('aria-label', i18n.tKey('labels.close', {}, 'Close'))
      .ele();
    appendIcon(close, 'x');
    html.take(close).event('click', () => this.setState({ open: false }));

    const body = html.take(panel).div.className('overflow-y-auto p-6 grow').ele();

    if (this.child instanceof BaseComponent) {
      this.child.parent = this;
      if (!this.children.includes(this.child)) this.children.push(this.child);
      this.child.mount(body);
    }
  }
}

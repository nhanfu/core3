import { html } from '../html.js';
import { BaseComponent } from '../runtime.js';

export class Section extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state || { collapsed: false });
    this.def = def;
  }

  draw(container) {
    const { collapsed = false } = this.state;
    const d = this.def;
    const panel = html.take(container).div.className('bg-white border border-gray-200 rounded-xl overflow-hidden').getContext();

    if (d.title || d.collapsible) {
      const header = html.take(panel)
        .div.className(`flex items-center justify-between px-5 py-3 ${d.collapsible ? 'cursor-pointer select-none hover:bg-gray-50' : ''} border-b border-gray-100`)
        .getContext();
      html.take(header).span.className('text-sm font-semibold text-gray-800').text(d.title || '');
      if (d.collapsible) {
        html.take(header).span.className('text-gray-400 text-xs').text(collapsed ? '▶' : '▼');
        header.addEventListener('click', () => this.setState({ collapsed: !this.state.collapsed }));
      }
    }

    const paddingCls = d.padding === false ? '' : 'p-5';
    html.take(panel).div.className(`${paddingCls}${collapsed ? ' hidden' : ''}`).dataAttr('section-content', '');
  }
}

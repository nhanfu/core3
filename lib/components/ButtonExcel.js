import { html } from '../html.js';
import { BaseComponent } from '../runtime.js';

export class ButtonExcel extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state || {});
    this.def = def;
  }

  draw(container) {
    const { loading = false } = this.state;
    const { label = 'Export Excel', filename = 'export' } = this.def;
    const disabledCls = loading ? 'opacity-60 cursor-not-allowed pointer-events-none' : '';

    const btn = html.take(container)
      .button
      .className(`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors border-transparent shadow-sm ${disabledCls}`)
      .getContext();

    if (loading) {
      btn.setAttribute('disabled', '');
      html.take(btn).span.className('h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent');
    }

    html.take(btn).text(label);

    if (!loading) {
      btn.addEventListener('click', () => this.submit('export.excel', { filename }));
    }
  }
}

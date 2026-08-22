import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { i18n } from '@core3/client/i18n';

export class ButtonPdf extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state || {});
    this.def = def;
  }

  draw(container) {
    const { loading = false } = this.state;
    const { label = i18n.tKey('export.pdf', {}, 'Export PDF'), filename = 'report' } = this.def;
    const disabledCls = loading ? 'opacity-60 cursor-not-allowed pointer-events-none' : '';

    const btn = html.take(container)
      .button
      .className(`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors border-transparent shadow-sm ${disabledCls}`)
      .ele();

    if (loading) {
      html.take(btn).attr('disabled', '');
      html.take(btn).span.className('h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent');
    }

    html.take(btn).text(label);

    if (!loading) {
      html.take(btn).event('click', () => this.submit('export.pdf', { filename }));
    }
  }
}

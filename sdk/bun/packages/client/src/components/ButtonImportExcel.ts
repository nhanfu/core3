import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export class ButtonImportExcel extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state || {});
    this.def = def;
  }

  draw(container) {
    const { loading = false } = this.state;
    const { label = 'Import Excel', accept = '.xlsx,.xls,.csv' } = this.def;
    const disabledCls = loading ? 'opacity-60 cursor-not-allowed pointer-events-none' : '';

    const wrap = html.take(container).div.className('inline-flex').ele();

    const fileInput = html.take(wrap)
      .input
      .type('file')
      .attr('accept', accept)
      .style('display:none;')
      .ele();

    const btn = html.take(wrap)
      .button
      .className(`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors border-transparent shadow-sm ${disabledCls}`)
      .ele();

    if (loading) {
      html.take(btn).attr('disabled', '');
      html.take(btn).span.className('h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent');
    }

    html.take(btn).text(label);

    if (!loading) {
      html.take(btn).event('click', () => fileInput.click());
      html.take(fileInput).event('change', () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        this.setState({ filename: file.name });
        this.submit('import.excel', { filename: file.name });
      });
    }
  }
}

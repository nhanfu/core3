import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon } from '@core3/client/components/Icon';

export class MultipleSearchEntry extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container) {
    const { value = [], options = [], query = '', open = false } = this.state;
    const d = this.def;
    const wrap = html.take(container).div.className('flex flex-col gap-1').ele();

    if (d.label) {
      html.take(wrap).label.className('token-form-label text-sm font-medium text-gray-700').text(d.label);
    }

    const fieldWrap = html.take(wrap).div.className('relative').ele();

    const chipRow = html.take(fieldWrap).div
      .className('token-form-control flex flex-wrap gap-1 min-h-[38px] px-2 py-1.5 border border-gray-300 rounded-md bg-white focus-within:ring-2 focus-within:ring-indigo-500 cursor-text')
      .ele();

    for (const chip of value) {
      const chipEl = html.take(chipRow).span
        .className('inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded-full')
        .ele();
      html.take(chipEl).text(String(chip));
      const rmBtn = html.take(chipEl).button
        .className('text-indigo-500 hover:text-indigo-800 leading-none font-bold')
        .ele();
      appendIcon(rmBtn, 'x');
      html.take(rmBtn).event('click', e => {
        e.stopPropagation();
        this.setState({ value: this.state.value.filter(v => v !== chip) }, false);
        this.redraw();
      });
    }

    const inp = html.take(chipRow)
      .input.type('text')
      .className('flex-1 min-w-[80px] text-sm outline-none bg-transparent')
      .value(String(query))
      .ele();

    if (d.placeholder && value.length === 0) html.take(inp).attr('placeholder', d.placeholder);

    html.take(inp).event('input', e => {
      this.setState({ query: e.target.value, open: true }, false);
      this.redraw();
    });
    html.take(inp).event('focus', () => {
      this.setState({ open: true }, false);
      this.redraw();
    });
    html.take(inp).event('blur', () => {
      setTimeout(() => {
        this.setState({ open: false }, false);
        this.redraw();
      }, 150);
    });

    if (open) {
      const filtered = options.filter(o => !value.includes(o) && String(o).toLowerCase().includes(String(query).toLowerCase()));
      if (filtered.length > 0) {
        const dropdown = html.take(fieldWrap).div
          .className('absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto')
          .ele();
        for (const opt of filtered) {
          const item = html.take(dropdown).div
            .className('px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 cursor-pointer')
            .text(String(opt))
            .ele();
          html.take(item).event('mousedown', e => {
            e.preventDefault();
            this.setState({ value: [...this.state.value, opt], query: '', open: false }, false);
            this.redraw();
          });
        }
      }
    }
  }
}

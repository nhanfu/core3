import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export class TextInput extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container) {
    const { value = '', error = null } = this.state;
    const d = this.def;
    const wrap = html.take(container).div.className('flex flex-col gap-1').ele();

    if (d.label) {
      const lbl = html.take(wrap).label.className('token-form-label text-sm font-medium text-gray-700').ele();
      html.take(lbl).text(d.label);
      if (d.required) html.take(lbl).span.className('text-red-500').text(' *');
    }

    const borderCls = error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500';
    const bgCls     = d.readonly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white';
    const inp = html.take(wrap)
      .input.type('text')
      .className(`token-form-control w-full px-3 py-2 text-sm border ${borderCls} rounded-md focus:outline-none focus:ring-2 ${bgCls}`)
      .value(String(value))
      .ele();

    if (d.readonly)    html.take(inp).attr('readonly', '');
    if (d.placeholder) html.take(inp).attr('placeholder', d.placeholder);
    if (!d.readonly)   html.take(inp).event('input', e => this.setState({ value: e.target.value, error: null }, false));

    if (error) html.take(wrap).span.className('text-xs text-red-600').text(error);
  }
}

import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export class DateInput extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container) {
    const { value = '' } = this.state;
    const d = this.def;
    const wrap = html.take(container).div.className('flex flex-col gap-1').getContext();

    if (d.label) html.take(wrap).label.className('token-form-label text-sm font-medium text-gray-700').text(d.label);

    const inp = html.take(wrap)
      .input.type('text')
      .className('token-form-control w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white')
      .value(String(value))
      .getContext();

    html.take(inp).prop('inputMode', 'numeric').prop('placeholder', d.placeholder || 'YYYY-MM-DD').prop('pattern', '\\d{4}-\\d{2}-\\d{2}');

    if (d.min) html.take(inp).attr('min', d.min);
    if (d.max) html.take(inp).attr('max', d.max);
    html.take(inp).event('change', e => this.setState({ value: e.target.value }, false));
  }
}

import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export class CheckboxInput extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container) {
    const { value = false } = this.state;
    const d = this.def;
    const lbl = html.take(container).label.className('flex items-center gap-2 cursor-pointer').ele();
    const inp = html.take(lbl).input.type('checkbox').className('token-form-check w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500').ele();
    html.take(inp).prop('checked', Boolean(value)).event('click', () => this.setState({ value: inp.checked }, false));
    if (d.label) html.take(lbl).span.className('token-form-label text-sm font-medium text-gray-700').text(d.label);
  }
}

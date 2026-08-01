import { html } from '../html.ts';
import { BaseComponent } from './BaseComponent.ts';

export class CheckboxInput extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container) {
    const { value = false } = this.state;
    const d = this.def;
    const lbl = html.take(container).label.className('flex items-center gap-2 cursor-pointer').getContext();
    const inp = html.take(lbl).input.type('checkbox').className('core3-token-form-check w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500').getContext();
    inp.checked = Boolean(value);
    inp.addEventListener('click', () => this.setState({ value: inp.checked }, false));
    if (d.label) html.take(lbl).span.className('core3-token-form-label text-sm font-medium text-gray-700').text(d.label);
  }
}

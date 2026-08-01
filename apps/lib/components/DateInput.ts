import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';

export class DateInput extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container) {
    const { value = '' } = this.state;
    const d = this.def;
    const wrap = html.take(container).div.className('flex flex-col gap-1').getContext();

    if (d.label) html.take(wrap).label.className('core3-token-form-label text-sm font-medium text-gray-700').text(d.label);

    const inp = html.take(wrap)
      .input.type('date')
      .className('core3-token-form-control w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white')
      .value(String(value))
      .getContext();

    if (d.min) inp.setAttribute('min', d.min);
    if (d.max) inp.setAttribute('max', d.max);
    inp.addEventListener('change', e => this.setState({ value: e.target.value }, false));
  }
}

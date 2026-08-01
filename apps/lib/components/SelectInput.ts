import { html } from '../html.ts';
import { BaseComponent } from './BaseComponent.ts';

export class SelectInput extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container) {
    const { value = '', options = [] } = this.state;
    const d = this.def;
    const wrap = html.take(container).div.className('flex flex-col gap-1').getContext();

    if (d.label) {
      const lbl = html.take(wrap).label.className('core3-token-form-label text-sm font-medium text-gray-700').getContext();
      html.take(lbl).text(d.label);
      if (d.required) html.take(lbl).span.className('text-red-500').text(' *');
    }

    const sel = html.take(wrap)
      .select.className('core3-token-form-control w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white')
      .getContext();

    html.take(sel).option.value('').text('— Select —');
    for (const o of options) {
      const opt = html.take(sel).option.value(String(o)).text(String(o)).getContext();
      if (o === value) opt.setAttribute('selected', '');
    }

    sel.addEventListener('change', e => this.setState({ value: e.target.value }, false));
  }
}

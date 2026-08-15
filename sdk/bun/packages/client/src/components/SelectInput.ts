import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { i18n } from '@core3/client/i18n';

export class SelectInput extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container) {
    const { value = '', options = [] } = this.state;
    const d = this.def;
    const wrap = html.take(container).div.className('flex flex-col gap-1').ele();

    if (d.label) {
      const lbl = html.take(wrap).label.className('token-form-label text-sm font-medium text-gray-700').ele();
      html.take(lbl).text(d.label);
      if (d.required) html.take(lbl).span.className('text-red-500').text(' *');
    }

    const sel = html.take(wrap)
      .select.className('token-form-control w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white')
      .ele();

    html.take(sel).option.value('').text(`— ${i18n.tKey('labels.select', {}, 'Select')} —`);
    for (const o of options) {
      const opt = html.take(sel).option.value(String(o)).text(String(o)).ele();
      if (o === value) html.take(opt).attr('selected', '');
    }

    html.take(sel).event('change', e => this.setState({ value: e.target.value }, false));
  }
}

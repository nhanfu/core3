import { html } from '../html.ts';
import { BaseComponent } from './BaseComponent.ts';

export class TextareaInput extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container) {
    const { value = '' } = this.state;
    const d = this.def;
    const wrap = html.take(container).div.className('flex flex-col gap-1').getContext();

    if (d.label) html.take(wrap).label.className('core3-token-form-label text-sm font-medium text-gray-700').text(d.label);

    const ta = html.take(wrap)
      .textArea
      .className('core3-token-form-control w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-y')
      .attr('rows', String(d.rows || 3))
      .getContext();

    if (d.placeholder) ta.setAttribute('placeholder', d.placeholder);
    ta.value = String(value);
    ta.addEventListener('input', e => this.setState({ value: e.target.value }, false));
  }
}

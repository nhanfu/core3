import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon } from '@core3/client/components/Icon';

export class SearchEntry extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container) {
    const { value = '', placeholder = '' } = this.state;
    const wrap = html.take(container).div.className('relative flex items-center').ele();

    const searchIcon = html.take(wrap).span.className('absolute left-2.5 text-gray-400 text-sm pointer-events-none select-none').ele();
    appendIcon(searchIcon, 'search');

    const inp = html.take(wrap)
      .input.type('text')
      .className('token-form-control w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500')
      .value(String(value))
      .ele();

    if (placeholder) html.take(inp).attr('placeholder', placeholder);

    html.take(inp).event('input', e => this.setState({ value: e.target.value }, false)).event('keydown', e => {
      if (e.key === 'Enter') this.submit('search', { value: this.state.value });
    });

    if (value) {
      const clr = html.take(wrap).button
        .className('absolute right-2 text-gray-400 hover:text-gray-600 text-sm leading-none')
        .ele();
      appendIcon(clr, 'x');
      html.take(clr).event('click', () => this.setState({ value: '' }));
    }
  }
}

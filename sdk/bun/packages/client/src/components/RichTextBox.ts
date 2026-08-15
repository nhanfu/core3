import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export class RichTextBox extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container) {
    const { value = '', placeholder = '' } = this.state;
    const d = this.def;
    const rows = d.rows || 6;
    const wrap = html.take(container).div.className('flex flex-col gap-1').getContext();

    if (d.label) {
      html.take(wrap).label.className('token-form-label text-sm font-medium text-gray-700').text(d.label);
    }

    const toolbar = html.take(wrap).div.className('token-form-toolbar flex gap-1 px-2 py-1 border border-b-0 border-gray-300 rounded-t-md bg-gray-50').getContext();

    const boldBtn = html.take(toolbar).button
      .className('px-2 py-0.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded')
      .text('B')
      .getContext();

    const italicBtn = html.take(toolbar).button
      .className('px-2 py-0.5 text-sm italic text-gray-600 hover:bg-gray-200 rounded')
      .text('I')
      .getContext();

    const editor = html.take(wrap).div
      .className('token-form-control w-full px-3 py-2 text-sm border border-gray-300 rounded-b-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 overflow-y-auto')
      .attr('contenteditable', 'true')
      .style(`min-height: ${rows * 1.5}rem;`)
      .getContext();

    if (value) {
      html.take(editor).innerHTML(value);
    } else if (placeholder) {
      html.take(editor).attr('data-placeholder', placeholder);
    }

    html.take(editor).event('input', () => {
      this.setState({ value: editor.innerHTML }, false);
    });

    html.take(boldBtn).event('mousedown', e => {
      e.preventDefault();
      html.take(editor).command('bold');
      html.take(editor).focus();
    });

    html.take(italicBtn).event('mousedown', e => {
      e.preventDefault();
      html.take(editor).command('italic');
      html.take(editor).focus();
    });
  }
}

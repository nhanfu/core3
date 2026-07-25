import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';

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
      html.take(wrap).label.className('text-sm font-medium text-gray-700').text(d.label);
    }

    const toolbar = html.take(wrap).div.className('flex gap-1 px-2 py-1 border border-b-0 border-gray-300 rounded-t-md bg-gray-50').getContext();

    const boldBtn = html.take(toolbar).button
      .className('px-2 py-0.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded')
      .text('B')
      .getContext();

    const italicBtn = html.take(toolbar).button
      .className('px-2 py-0.5 text-sm italic text-gray-600 hover:bg-gray-200 rounded')
      .text('I')
      .getContext();

    const editor = html.take(wrap).div
      .className('w-full px-3 py-2 text-sm border border-gray-300 rounded-b-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 overflow-y-auto')
      .attr('contenteditable', 'true')
      .style(`min-height: ${rows * 1.5}rem;`)
      .getContext();

    if (value) {
      editor.innerHTML = value;
    } else if (placeholder) {
      editor.setAttribute('data-placeholder', placeholder);
    }

    editor.addEventListener('input', () => {
      this.setState({ value: editor.innerHTML }, false);
    });

    boldBtn.addEventListener('mousedown', e => {
      e.preventDefault();
      document.execCommand('bold');
      editor.focus();
    });

    italicBtn.addEventListener('mousedown', e => {
      e.preventDefault();
      document.execCommand('italic');
      editor.focus();
    });
  }
}

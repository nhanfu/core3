import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';

export class CodeEditor extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state || { value: '', language: 'javascript' });
    this.def = def;
  }

  draw(container) {
    const { value = '', language = 'javascript' } = this.state;
    const { label = '', rows = 12, readonly = false } = this.def;

    const wrap = html.take(container).div.className('flex flex-col gap-1').getContext();

    if (label) {
      html.take(wrap).label.className('text-sm font-medium text-gray-700').text(label);
    }

    const editorWrap = html.take(wrap).div
      .className('relative rounded-md overflow-hidden border border-gray-700')
      .getContext();

    html.take(editorWrap).div
      .className('absolute top-2 right-2 z-10 text-xs bg-gray-700 text-gray-300 rounded px-2 py-0.5 select-none pointer-events-none')
      .text(language);

    const ta = html.take(editorWrap).textArea
      .className('w-full bg-gray-900 text-gray-100 font-mono text-sm px-4 py-3 resize-none focus:outline-none leading-relaxed')
      .attr('rows', String(rows))
      .attr('spellcheck', 'false')
      .attr('autocorrect', 'off')
      .attr('autocapitalize', 'off')
      .value(value)
      .getContext();

    if (readonly) ta.setAttribute('readonly', '');

    ta.addEventListener('input', e => {
      this.setState({ value: e.target.value }, false);
    });

    ta.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        ta.value = ta.value.slice(0, start) + '  ' + ta.value.slice(end);
        ta.selectionStart = ta.selectionEnd = start + 2;
        this.setState({ value: ta.value }, false);
      }
    });
  }
}

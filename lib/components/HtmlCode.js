import { html } from '../html.js';
import { BaseComponent } from '../runtime.js';

export class HtmlCode extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state || { html: '', showSource: false });
    this.def = def;
  }

  draw(container) {
    const { html: htmlStr = '', showSource = false } = this.state;
    const { label = '', allowToggle = true } = this.def;

    const wrap = html.take(container).div
      .className('flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden')
      .getContext();

    const header = html.take(wrap).div
      .className('flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50')
      .getContext();

    html.take(header).span
      .className('text-sm font-medium text-gray-700')
      .text(label || (showSource ? 'Source' : 'Preview'));

    if (allowToggle) {
      const toggleBtn = html.take(header).button
        .className('text-xs px-3 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 transition-colors')
        .text(showSource ? 'View Preview' : 'View Source')
        .getContext();
      toggleBtn.addEventListener('click', () => {
        this.setState({ showSource: !this.state.showSource });
      });
    }

    if (showSource) {
      const pre = html.take(wrap).add('pre')
        .className('p-4 text-xs text-gray-700 font-mono overflow-auto bg-gray-50 m-0')
        .getContext();
      pre.textContent = htmlStr;
    } else {
      const preview = html.take(wrap).div.className('p-4').getContext();
      preview.innerHTML = htmlStr;
    }
  }
}

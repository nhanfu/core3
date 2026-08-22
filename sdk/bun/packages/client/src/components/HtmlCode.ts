import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { i18n } from '@core3/client/i18n';

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
      .ele();

    const header = html.take(wrap).div
      .className('flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50')
      .ele();

    html.take(header).span
      .className('text-sm font-medium text-gray-700')
      .text(label || (showSource ? i18n.tKey('code.source', {}, 'Source') : i18n.tKey('files.preview', {}, 'Preview')));

    if (allowToggle) {
      const toggleBtn = html.take(header).button
        .className('text-xs px-3 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 transition-colors')
        .text(showSource ? i18n.tKey('code.view_preview', {}, 'View preview') : i18n.tKey('code.view_source', {}, 'View source'))
        .ele();
      html.take(toggleBtn).event('click', () => {
        this.setState({ showSource: !this.state.showSource });
      });
    }

    if (showSource) {
      const pre = html.take(wrap).add('pre')
        .className('p-4 text-xs text-gray-700 font-mono overflow-auto bg-gray-50 m-0')
        .ele();
      html.take(pre).replaceText(htmlStr);
    } else {
      const preview = html.take(wrap).div.className('p-4').ele();
      html.take(preview).innerHTML(htmlStr);
    }
  }
}

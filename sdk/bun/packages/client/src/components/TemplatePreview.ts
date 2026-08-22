import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { i18n } from '@core3/client/i18n';
import { appendIcon } from '@core3/client/components/Icon';

type TemplatePreviewState = {
  template?: Record<string, unknown>;
  blocks?: Array<Record<string, unknown>>;
};

/**
 * Safe, declarative print-template preview. Block content is rendered as text
 * so template authors cannot inject markup into the authenticated application.
 */
export class TemplatePreview extends BaseComponent {
  declare state: TemplatePreviewState;

  constructor(id: string, state: TemplatePreviewState = {}) {
    super(id, state);
  }

  draw(container: HTMLElement) {
    const template = this.state.template || {};
    const blocks = Array.isArray(this.state.blocks) ? this.state.blocks : [];
    const root = html.take(container).section
      .className('template-preview rounded-lg border border-gray-200 bg-white p-5')
      .ele();

    const header = html.take(root).div.className('flex items-center justify-between gap-3 border-b border-gray-100 pb-4').ele();
    const heading = html.take(header).div.ele();
    html.take(heading).h2.className('text-base font-semibold text-gray-900').text(String(template.name || 'Mẫu in'));
    html.take(heading).p.className('mt-1 text-xs text-gray-500').text(String(template.code || ''));
    const printButton = html.take(header).button
      .className('inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50')
      .attr('type', 'button')
      .attr('aria-label', i18n.tKey('template.print', {}, 'Print template'))
      .ele();
    appendIcon(printButton, 'printer');
    html.take(printButton).span.text(i18n.tKey('template.print', {}, 'Print template'));
    html.take(printButton).event('click', () => window.print());

    const paper = html.take(root).div
      .className('template-preview-paper mt-4 min-h-[180px] rounded-md border border-dashed border-gray-300 bg-gray-50 p-6')
      .attr('aria-label', i18n.tKey('template.preview', {}, 'Print template preview'))
      .ele();
    if (!blocks.length) {
      html.take(paper).p.className('text-sm text-gray-500').text(i18n.tKey('template.empty', {}, 'No content blocks yet.'));
      return;
    }
    for (const block of blocks) {
      const blockType = String(block.block_type || 'text');
      const blockEl = html.take(paper).div.className(`template-preview-block template-preview-${blockType}`).ele();
      if (blockType === 'spacer') {
        html.take(blockEl).css('height', '24px').attr('aria-label', String(block.label || 'Khoảng cách'));
        continue;
      }
      if (block.label) {
        html.take(blockEl).div.className('text-xs font-semibold uppercase tracking-wide text-gray-500').text(String(block.label));
      }
      const value = blockType === 'token'
        ? `{{${String(block.token_key || 'token')}}}`
        : blockType === 'table' ? '[Bảng dữ liệu]' : String(block.content || '');
      html.take(blockEl).div.className('mt-1 whitespace-pre-wrap text-sm text-gray-800').text(value);
    }
  }
}

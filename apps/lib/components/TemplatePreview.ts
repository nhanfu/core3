import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';
import { appendIcon } from './Icon.ts';

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
      .className('core3-template-preview rounded-lg border border-gray-200 bg-white p-5')
      .getContext();

    const header = html.take(root).div.className('flex items-center justify-between gap-3 border-b border-gray-100 pb-4').getContext();
    const heading = html.take(header).div.getContext();
    html.take(heading).h2.className('text-base font-semibold text-gray-900').text(String(template.name || 'Mẫu in'));
    html.take(heading).p.className('mt-1 text-xs text-gray-500').text(String(template.code || ''));
    const printButton = html.take(header).button
      .className('inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50')
      .attr('type', 'button')
      .attr('aria-label', 'In mẫu')
      .getContext();
    appendIcon(printButton, 'printer');
    html.take(printButton).span.text('In mẫu');
    printButton.addEventListener('click', () => window.print());

    const paper = html.take(root).div
      .className('core3-template-preview-paper mt-4 min-h-[180px] rounded-md border border-dashed border-gray-300 bg-gray-50 p-6')
      .attr('aria-label', 'Bản xem trước mẫu in')
      .getContext();
    if (!blocks.length) {
      html.take(paper).p.className('text-sm text-gray-500').text('Chưa có khối nội dung.');
      return;
    }
    for (const block of blocks) {
      const blockType = String(block.block_type || 'text');
      const blockEl = html.take(paper).div.className(`core3-template-preview-block core3-template-preview-${blockType}`).getContext();
      if (blockType === 'spacer') {
        blockEl.style.height = '24px';
        blockEl.setAttribute('aria-label', String(block.label || 'Khoảng cách'));
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

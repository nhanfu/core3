import { html } from '../html.ts';
import { BaseComponent } from './BaseComponent.ts';

export class DocumentSummary extends BaseComponent {
  def: any;

  constructor(id: string, state: any = {}, def: any = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container: HTMLElement) {
    const record = this.state.record || {};
    const root = html.take(container).section
      .className('rounded-lg border border-gray-200 bg-white p-5')
      .getContext();
    const heading = html.take(root).div
      .className('flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4')
      .getContext();
    const copy = html.take(heading).div.getContext();
    html.take(copy).h2
      .className('text-lg font-semibold text-gray-900')
      .text(String(record[this.def.title_field] || '—'));
    if (this.def.subtitle_field && record[this.def.subtitle_field]) {
      html.take(copy).p
        .className('mt-1 text-sm text-gray-500')
        .text(String(record[this.def.subtitle_field]));
    }

    if (this.def.status_field) {
      const status = String(record[this.def.status_field] || '—');
      const tone = this.def.status_colors?.[status] || 'neutral';
      html.take(heading).span
        .className(`data-grid-status data-grid-status-${tone}`)
        .text(status);
    }

    const grid = html.take(root).div
      .className('mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4')
      .getContext();
    for (const field of this.def.columns || []) {
      const item = html.take(grid).div.getContext();
      html.take(item).div
        .className('text-xs font-semibold uppercase tracking-wide text-gray-400')
        .text(String(field.label || ''));
      html.take(item).div
        .className('mt-1 text-sm font-medium text-gray-800')
        .text(record[field.field] == null || record[field.field] === ''
          ? '—'
          : String(record[field.field]));
    }
  }
}

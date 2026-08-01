import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';

export class MoneySummary extends BaseComponent {
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
    if (this.def.title) {
      html.take(root).h3
        .className('mb-4 text-sm font-semibold text-gray-900')
        .text(String(this.def.title));
    }
    const grid = html.take(root).div
      .className('grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4')
      .getContext();
    for (const stat of this.def.stats || []) {
      const tone = stat.color || 'slate';
      const card = html.take(grid).div
        .className(`rounded-md border border-${tone}-100 bg-${tone}-50 px-4 py-3`)
        .getContext();
      html.take(card).div
        .className('text-xs font-medium text-gray-500')
        .text(String(stat.label || ''));
      html.take(card).div
        .className('mt-1 text-lg font-semibold text-gray-900')
        .text(record[stat.field] == null || record[stat.field] === ''
          ? '0'
          : String(record[stat.field]));
    }
  }
}

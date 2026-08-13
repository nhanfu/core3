import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export class MoneySummary extends BaseComponent {
  def: any;

  constructor(id: string, state: any = {}, def: any = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container: HTMLElement) {
    const record = this.state.record || {};
    const root = html.take(container).section
      .className('o-document-totals')
      .getContext();
    if (this.def.title) {
      html.take(root).h3
        .className('o-document-totals-title')
        .text(String(this.def.title));
    }
    const grid = html.take(root).div
      .className('o-document-totals-list')
      .getContext();
    for (const stat of this.def.stats || []) {
      const card = html.take(grid).div
        .className('o-document-total')
        .getContext();
      html.take(card).div
        .className('o-document-total-label')
        .text(String(stat.label || ''));
      html.take(card).div
        .className('o-document-total-value')
        .text(record[stat.field] == null || record[stat.field] === ''
          ? '0'
          : String(record[stat.field]));
    }
  }
}

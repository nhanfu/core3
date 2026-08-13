import { html } from '@core3/client/html';
import { BaseComponent } from './BaseComponent.ts';

export class CompareGridView extends BaseComponent {
  constructor(id, state, fields = []) {
    super(id, state);
    this.fields = fields;
  }

  draw(container) {
    const { left = {}, right = {}, leftLabel = 'Before', rightLabel = 'After' } = this.state;

    const outerDiv = html.take(container).div.className('overflow-x-auto rounded-lg border border-gray-200').getContext();
    const table    = html.take(outerDiv).table.className('min-w-full divide-y divide-gray-200').getContext();
    const theadRow = html.take(table).thead.className('bg-gray-50').trow.getContext();

    html.take(theadRow).th.className('px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap').text('Field');
    html.take(theadRow).th.className('px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap').text(leftLabel);
    html.take(theadRow).th.className('px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap').text(rightLabel);

    const tbody = html.take(table).tbody.className('bg-white divide-y divide-gray-100').getContext();

    for (const f of this.fields) {
      const lv      = left[f.field];
      const rv      = right[f.field];
      const differs = String(lv ?? '') !== String(rv ?? '');
      const tr      = html.take(tbody).trow.className(differs ? 'bg-amber-50' : '').getContext();

      html.take(tr).tdata.className('px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap').text(f.label || f.field);
      html.take(tr).tdata.className('px-4 py-3 text-sm text-gray-900').text(String(lv ?? '—'));

      const rightTd = html.take(tr).tdata.className('px-4 py-3 text-sm').getContext();
      if (differs) {
        html.take(rightTd).span.className('font-medium text-amber-700').text(String(rv ?? '—'));
      } else {
        html.take(rightTd).span.className('text-gray-900').text(String(rv ?? '—'));
      }
    }
  }
}

import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { i18n } from '@core3/client/i18n';
import { CellComponentFactory } from '@core3/client/components/CellComponentFactory';

export class GroupGridView extends BaseComponent {
  constructor(id, state, defs = []) {
    super(id, state);
    this.defs = defs;
  }

  _cellState(def, row) {
    return CellComponentFactory.state(def, row);
  }

  draw(container) {
    this.disposeChildren();
    const { rows = [], loading = false, groupBy = '' } = this.state;

    const outerDiv = html.take(container).div.className('overflow-x-auto rounded-lg border border-gray-200').ele();
    const table    = html.take(outerDiv).table.className('min-w-full divide-y divide-gray-200').ele();
    const theadRow = html.take(table).thead.className('bg-gray-50').trow.ele();

    for (const d of this.defs) {
      const align = d.align === 'right' ? 'text-right' : d.align === 'center' ? 'text-center' : 'text-left';
      html.take(theadRow)
        .th.className(`px-4 py-3 ${align} text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap`)
        .text(d.label || '');
    }

    const tbody = html.take(table).tbody.className('bg-white divide-y divide-gray-100').ele();

    if (loading) {
      for (let i = 0; i < 5; i++) {
        const tr = html.take(tbody).trow.ele();
        for (let column = 0; column < this.defs.length; column += 1) {
          html.take(tr).tdata.className('px-4 py-3').div.className('h-4 bg-gray-100 rounded animate-pulse skeleton');
        }
      }
    } else if (!rows.length) {
      html.take(tbody).trow
        .tdata.attr('colspan', String(this.defs.length))
          .className('px-4 py-10 text-center text-sm text-gray-400')
          .text(i18n.tKey('list.no_records', {}, 'No records found'));
    } else {
      const groups = new Map();
      for (const row of rows) {
        const key = groupBy ? String(row[groupBy] ?? '—') : '—';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
      }

      for (const [groupKey, groupRows] of groups) {
        html.take(tbody).trow.className('bg-gray-100')
          .tdata.attr('colspan', String(this.defs.length))
            .className('px-4 py-2 text-xs font-bold text-gray-600 uppercase tracking-wider')
            .text(groupKey);

        for (const row of groupRows) {
          const tr = html.take(tbody).trow.className('hover:bg-gray-50 transition-colors').ele();
          for (const d of this.defs) {
            const cellAttr = `${this.id}-${String(row.id ?? '')}-${d.id}`;
            html.take(tr).tdata.className('px-4 py-3').dataAttr('cell', cellAttr);
          }
        }
      }
    }

    if (!loading && rows.length) {
      for (const row of rows) {
        for (const def of this.defs) {
          const cellAttr = `${this.id}-${String(row.id ?? '')}-${def.id}`;
          const td = container.querySelector(`[data-cell="${cellAttr}"]`);
          if (!td) continue;
          const cell = CellComponentFactory.create(cellAttr, def, row);
          cell.parent = this;
          this.children.push(cell);
          cell.draw(td);
        }
      }
    }
  }
}

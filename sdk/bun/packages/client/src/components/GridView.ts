import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { i18n } from '@core3/client/i18n';
import { TextCell } from '@core3/client/components/TextCell';
import { BadgeCell } from '@core3/client/components/BadgeCell';
import { CurrencyCell } from '@core3/client/components/CurrencyCell';
import { NumberCell } from '@core3/client/components/NumberCell';
import { DateCell } from '@core3/client/components/DateCell';
import { BooleanCell } from '@core3/client/components/BooleanCell';
import { ActionCell } from '@core3/client/components/ActionCell';
import { AvatarCell } from '@core3/client/components/AvatarCell';
import { PercentCell } from '@core3/client/components/PercentCell';
import { appendIcon } from '@core3/client/components/Icon';

const CELL_MAP = { TextCell, BadgeCell, CurrencyCell, NumberCell, DateCell, BooleanCell, ActionCell, AvatarCell, PercentCell };

export type GridViewOptions = {
  onSort?: (sort: { field: string; direction: 'asc' | 'desc' }) => void;
  emptyState?: { title?: string; description?: string };
  labels?: { summaryOf?: string; previousPage?: string; nextPage?: string };
};

export class GridView extends BaseComponent {
  options: GridViewOptions;

  constructor(id, state, defs = [], options: GridViewOptions = {}) {
    super(id, state);
    this.defs = defs;
    this.options = options;
  }

  private setSort(field: string) {
    const previous = this.state.sort as { field?: string; direction?: 'asc' | 'desc' } | undefined;
    const direction = previous?.field === field && previous.direction === 'asc' ? 'desc' : 'asc';
    const sort = { field, direction } as const;
    this.setState({ sort });
    this.options.onSort?.(sort);
  }

  _cellState(def, row) {
    const value = row[def.field];
    switch (def.type) {
      case 'BadgeCell':    return { value, color: def.colorField ? row[def.colorField] : null };
      case 'CurrencyCell': return { value, currency: def.currency || 'USD' };
      case 'NumberCell':   return { value, format: def.format || 'number' };
      case 'DateCell':     return { value, format: def.format || 'short', overdue: def.overdueField ? !!row[def.overdueField] : false };
      case 'BooleanCell':  return { value: !!value };
      case 'ActionCell':   return { actions: def.actions || [], row };
      case 'AvatarCell':   return { name: row[def.field], src: def.srcField ? row[def.srcField] : null, size: def.size || 'sm' };
      case 'PercentCell':  return { value };
      default:             return { value, secondary: def.secondary ? row[def.secondary] : null };
    }
  }

  draw(container) {
    this.children = [];
    const { rows = [], meta = {}, loading = false } = this.state;
    const labels = { summaryOf: 'of', previousPage: '← Prev', nextPage: 'Next →', ...this.options.labels };

    const outerDiv = html.take(container).div.className('overflow-x-auto rounded-lg border border-gray-200').ele();
    const table    = html.take(outerDiv).table.className('min-w-full divide-y divide-gray-200').ele();
    const theadRow = html.take(table).thead.className('bg-gray-50').trow.ele();

    const sort = this.state.sort as { field?: string; direction?: 'asc' | 'desc' } | undefined;
    for (const d of this.defs) {
      const align = d.align === 'right' ? 'text-right' : d.align === 'center' ? 'text-center' : 'text-left';
      const th = html.take(theadRow)
        .th.className(`px-4 py-3 ${align} text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap`)
        .ele();
      const sortable = d.sortable !== false && d.type !== 'ActionCell' && d.field && d.field !== 'actions';
      if (!sortable) {
        html.take(th).replaceText(d.label || '');
        continue;
      }
      const active = sort?.field === d.field;
      const button = html.take(th).button.type('button').className('sort-button inline-flex items-center gap-1 hover:text-gray-900')
        .dataAttr('sort-field', d.field)
        .attr('aria-sort', active ? (sort?.direction === 'desc' ? 'descending' : 'ascending') : 'none')
        .text(d.label || '').ele() as HTMLButtonElement;
      const indicator = html.take(button).span.className('sort-indicator text-gray-400').ele() as HTMLSpanElement;
      appendIcon(indicator, active ? (sort?.direction === 'desc' ? 'sort-descending' : 'sort-ascending') : 'sort');
      html.take(button).event('click', () => this.setSort(d.field));
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
      const empty = this.options.emptyState || {};
      const emptyCell = html.take(tbody).trow
        .tdata.attr('colspan', String(this.defs.length))
          .className('px-4 py-10 text-center text-sm text-gray-400')
          .ele();
      html.take(emptyCell).div.text(empty.title || i18n.tKey('list.no_records', {}, 'No records found'));
      if (empty.description) {
        html.take(emptyCell).div.className('mt-1').text(empty.description);
      }
    } else {
      for (const row of rows) {
        const tr = html.take(tbody).trow.className('hover:bg-gray-50 transition-colors').ele();
        for (const d of this.defs) {
          const cellAttr = `${this.id}-${String(row.id ?? '')}-${d.id}`;
          html.take(tr).tdata.className('px-4 py-3').dataAttr('cell', cellAttr);
        }
      }
    }

    if (meta != null && meta.total != null) {
      const { total = 0, page = 1, pageSize = 25 } = meta;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const startN = total === 0 ? 0 : (page - 1) * pageSize + 1;
      const endN   = Math.min(page * pageSize, total);

      const pagDiv  = html.take(outerDiv).div.className('flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white rounded-b-lg').ele();
      html.take(pagDiv).span.className('text-sm text-gray-600').text(`${startN}–${endN} ${labels.summaryOf} ${total}`);
      const ctrlDiv = html.take(pagDiv).div.className('flex items-center gap-2').ele();

      const prevBtn = html.take(ctrlDiv).button.className('px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed').text(labels.previousPage).ele();
      if (page <= 1) html.take(prevBtn).attr('disabled', '');

      html.take(ctrlDiv).span.className('text-sm text-gray-500 px-1').text(`${page} / ${totalPages}`);

      const nextBtn = html.take(ctrlDiv).button.className('px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed').text(labels.nextPage).ele();
      if (page >= totalPages) html.take(nextBtn).attr('disabled', '');

      html.take(prevBtn).event('click', () => {
        const { page = 1 } = this.state.meta || {};
        if (page > 1) this.setState({ meta: { ...this.state.meta, page: page - 1 } });
      });
      html.take(nextBtn).event('click', () => {
        const { page = 1, total = 0, pageSize = 25 } = this.state.meta || {};
        const totalPages = Math.ceil(total / pageSize);
        if (page < totalPages) this.setState({ meta: { ...this.state.meta, page: page + 1 } });
      });
    }

    if (!loading && rows.length) {
      for (const row of rows) {
        for (const def of this.defs) {
          const cellAttr = `${this.id}-${String(row.id ?? '')}-${def.id}`;
          const td = container.querySelector(`[data-cell="${cellAttr}"]`);
          if (!td) continue;
          const Cls = CELL_MAP[def.type] || TextCell;
          const cell = new Cls(cellAttr, this._cellState(def, row));
          cell.parent = this;
          this.children.push(cell);
          cell.draw(td);
        }
      }
    }
  }
}

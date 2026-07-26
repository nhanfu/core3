import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';

type DataGridRow = Record<string, unknown>;
type SortDirection = 'asc' | 'desc';

export interface DataGridColumn {
  /** Stable identifier. Falls back to `field` when omitted. */
  id?: string;
  field: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  /** Formats a value without giving the formatter direct DOM access. */
  format?: (value: unknown, row: DataGridRow) => string;
  /** Renders a semantic cell while preserving DataGrid ownership of the row. */
  render?: (container: HTMLElement, value: unknown, row: DataGridRow) => void;
  rowActions?: DataGridRowAction[];
}

export interface DataGridRowAction {
  id: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  visible?: (row: DataGridRow) => boolean;
}

export interface DataGridAction {
  id: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  params?: Record<string, unknown>;
  onClick?: (context: { selectedIds: string[]; action: DataGridAction }) => void;
}

export interface DataGridOptions {
  rowKey?: string;
  selectable?: boolean;
  emptyState?: { title?: string; description?: string };
  onSort?: (sort: { field: string; direction: SortDirection }) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  /** The renderer owns fetching; DataGrid only requests a different page. */
  onPageChange?: (page: number) => void;
}

/**
 * General-purpose, state-owned data grid.
 *
 * Keep server fetching outside this component: callers can observe `onSort` and
 * `onSelectionChange`, then replace `rows` / `meta` through `setState`.
 */
export class DataGrid extends BaseComponent {
  columns: DataGridColumn[];
  options: DataGridOptions;

  constructor(id: string, state: Record<string, unknown> = {}, columns: DataGridColumn[] = [], options: DataGridOptions = {}) {
    super(id, state);
    this.columns = columns;
    this.options = options;
  }

  private rowId(row: DataGridRow, index: number): string {
    const key = this.options.rowKey || 'id';
    return String(row[key] ?? index);
  }

  private selectedIds(): string[] {
    return Array.isArray(this.state.selectedIds) ? this.state.selectedIds.map(String) : [];
  }

  private sortedRows(rows: DataGridRow[]): DataGridRow[] {
    const sort = this.state.sort as { field?: string; direction?: SortDirection } | undefined;
    if (!sort?.field) return rows;

    const direction = sort.direction === 'desc' ? -1 : 1;
    return [...rows].sort((left, right) => {
      const a = left[sort.field!];
      const b = right[sort.field!];
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      if (typeof a === 'number' && typeof b === 'number') return (a - b) * direction;
      return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }) * direction;
    });
  }

  private setSort(field: string) {
    const previous = this.state.sort as { field?: string; direction?: SortDirection } | undefined;
    const direction: SortDirection = previous?.field === field && previous.direction === 'asc' ? 'desc' : 'asc';
    const sort = { field, direction };
    this.setState({ sort });
    this.options.onSort?.(sort);
    if (typeof this.state.onSort === 'function') this.state.onSort(sort);
  }

  private setSelectedIds(selectedIds: string[]) {
    this.setState({ selectedIds });
    this.options.onSelectionChange?.(selectedIds);
    if (typeof this.state.onSelectionChange === 'function') this.state.onSelectionChange(selectedIds);
  }

  private setPage(page: number) {
    this.options.onPageChange?.(page);
    if (typeof this.state.onPageChange === 'function') this.state.onPageChange(page);
  }

  private actionClass(variant?: DataGridAction['variant']) {
    return {
      primary: 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700',
      danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700',
      ghost: 'bg-transparent text-gray-600 border-transparent hover:bg-gray-100',
      secondary: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
    }[variant || 'secondary'];
  }

  draw(container: HTMLElement) {
    this.children = [];
    const rows = this.sortedRows((this.state.rows as DataGridRow[] | undefined) || []);
    const meta = (this.state.meta as Record<string, unknown> | undefined) || {};
    const actions = (this.state.actions as DataGridAction[] | undefined) || [];
    const selectable = this.options.selectable || this.state.selectable === true;
    const selectedIds = this.selectedIds();
    const selected = new Set(selectedIds);

    const root = html.take(container).div.className('rounded-lg border border-gray-200 bg-white').getContext();
    const title = meta.title || this.state.title;
    const description = meta.description || this.state.description;
    if (title || description || actions.length) {
      const toolbar = html.take(root).div.className('flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 px-4 py-3').getContext();
      if (title || description) {
        const copy = html.take(toolbar).div.getContext();
        if (title) html.take(copy).h3.className('text-sm font-semibold text-gray-900').text(String(title));
        if (description) html.take(copy).p.className('mt-1 text-sm text-gray-500').text(String(description));
      }
      if (actions.length) {
        const actionBar = html.take(toolbar).div.className('flex flex-wrap items-center gap-2').getContext();
        for (const action of actions) {
          const button = html.take(actionBar).button
            .className(`inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${this.actionClass(action.variant)}`)
            .dataAttr('grid-action', action.id)
            .text(action.label)
            .getContext();
          if (action.disabled) button.setAttribute('disabled', '');
          else button.addEventListener('click', () => {
            const context = { selectedIds: this.selectedIds(), action };
            if (typeof action.onClick === 'function') action.onClick(context);
            else this.submit(action.id, { ...action.params, selectedIds: context.selectedIds });
          });
        }
      }
    }

    const scroll = html.take(root).div.className('overflow-x-auto').getContext();
    const table = html.take(scroll).table.className('min-w-full divide-y divide-gray-200').getContext();
    const headerRow = html.take(table).thead.className('bg-gray-50').trow.getContext();

    if (selectable) {
      const checkbox = html.take(headerRow).th.className('w-10 px-4 py-3').input.attr('type', 'checkbox').getContext() as HTMLInputElement;
      checkbox.setAttribute('aria-label', 'Select all rows');
      checkbox.checked = rows.length > 0 && rows.every((row, index) => selected.has(this.rowId(row, index)));
      checkbox.indeterminate = selected.size > 0 && !checkbox.checked;
      checkbox.addEventListener('change', () => this.setSelectedIds(checkbox.checked ? rows.map((row, index) => this.rowId(row, index)) : []));
    }

    const sort = this.state.sort as { field?: string; direction?: SortDirection } | undefined;
    for (const column of this.columns) {
      const align = column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left';
      const th = html.take(headerRow).th.className(`px-4 py-3 ${align} text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap`).getContext();
      const sortable = column.sortable === true;
      if (sortable) {
        const active = sort?.field === column.field;
        const button = html.take(th).button.className('inline-flex items-center gap-1 hover:text-gray-900').dataAttr('sort-field', column.field).text(column.label).getContext();
        button.style.cssText = 'appearance:none;border:0;background:transparent;padding:0;font:inherit;color:inherit;';
        button.setAttribute('aria-sort', active ? (sort?.direction === 'desc' ? 'descending' : 'ascending') : 'none');
        html.take(button).span.className('text-gray-400').text(active ? (sort?.direction === 'desc' ? '↓' : '↑') : '↕');
        button.addEventListener('click', () => this.setSort(column.field));
      } else {
        html.take(th).text(column.label);
      }
    }

    const tbody = html.take(table).tbody.className('divide-y divide-gray-100 bg-white').getContext();
    if (!rows.length) {
      const empty = this.options.emptyState || (this.state.emptyState as DataGridOptions['emptyState']) || {};
      const cell = html.take(tbody).trow.tdata.attr('colspan', String(this.columns.length + (selectable ? 1 : 0))).className('px-4 py-12 text-center').getContext();
      html.take(cell).p.className('text-sm font-medium text-gray-900').text(empty.title || 'No records found');
      if (empty.description) html.take(cell).p.className('mt-1 text-sm text-gray-500').text(empty.description);
    } else {
      rows.forEach((row, index) => {
        const id = this.rowId(row, index);
        const tr = html.take(tbody).trow.className('transition-colors hover:bg-gray-50').getContext();
        if (selectable) {
          const checkbox = html.take(tr).tdata.className('w-10 px-4 py-3').input.attr('type', 'checkbox').getContext() as HTMLInputElement;
          checkbox.setAttribute('aria-label', `Select row ${id}`);
          checkbox.checked = selected.has(id);
          checkbox.addEventListener('change', () => {
            const next = new Set(this.selectedIds());
            checkbox.checked ? next.add(id) : next.delete(id);
            this.setSelectedIds([...next]);
          });
        }
        for (const column of this.columns) {
          const align = column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left';
          const value = row[column.field];
          const cell = html.take(tr).tdata.className(`px-4 py-3 text-sm text-gray-700 ${align}`).getContext();
          if (column.rowActions?.length) {
            const actionBar = html.take(cell).div.className('flex items-center justify-end gap-1').getContext();
            for (const action of column.rowActions) {
              if (action.visible && !action.visible(row)) continue;
              const button = html.take(actionBar).button
                .className(`rounded px-2 py-1 text-xs font-medium ${this.actionClass(action.variant)}`)
                .dataAttr('grid-row-action', `${action.id}:${id}`)
                .text(action.label)
                .getContext();
              button.addEventListener('click', () => this.submit(action.id, { row }));
            }
          } else if (column.render) {
            column.render(cell, value, row);
          } else {
            const text = column.format ? column.format(value, row) : value == null || value === '' ? '—' : String(value);
            cell.textContent = text;
          }
        }
      });
    }

    if (meta.total != null) {
      const summary = html.take(root).div.className('flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-500').getContext();
      const total = Number(meta.total);
      const page = Number(meta.page || 1);
      const pageSize = Number(meta.pageSize || rows.length || 1);
      const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
      const end = Math.min(page * pageSize, total);
      html.take(summary).span.text(`${start}–${end} of ${total}`);

      const pages = Math.max(1, Math.ceil(total / pageSize));
      if (pages > 1) {
        const controls = html.take(summary).div.className('inline-flex items-center gap-1').getContext();
        const addButton = (label: string, targetPage: number, disabled: boolean, ariaLabel: string) => {
          const button = html.take(controls).button
            .className('rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50')
            .text(label)
            .getContext() as HTMLButtonElement;
          button.setAttribute('aria-label', ariaLabel);
          button.disabled = disabled;
          if (!disabled) button.addEventListener('click', () => this.setPage(targetPage));
        };
        addButton('‹', page - 1, page <= 1, 'Previous page');
        html.take(controls).span.className('px-2 text-xs text-gray-500').text(`${page} / ${pages}`);
        addButton('›', page + 1, page >= pages, 'Next page');
      }
    }
  }
}

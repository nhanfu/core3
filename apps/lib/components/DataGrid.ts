import { html } from '../html.ts';
import { BaseComponent } from './BaseComponent.ts';
import { appendIcon, hasIcon } from './Icon.ts';

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
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  visible?: (row: DataGridRow) => boolean;
}

export interface DataGridAction {
  id: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  params?: Record<string, unknown>;
  onClick?: (context: { selectedIds: string[]; action: DataGridAction }) => void;
}

export interface DataGridOptions {
  labels?: {
    rowNumber?: string;
    selectAll?: string;
    selectRow?: (id: string) => string;
    expandRow?: string;
    collapseRow?: string;
    summaryOf?: string;
    previousPage?: string;
    nextPage?: string;
  };
  rowKey?: string;
  rowNumbers?: boolean;
  selectable?: boolean;
  columnChooser?: boolean;
  emptyState?: { title?: string; description?: string };
  onSort?: (sort: { field: string; direction: SortDirection }) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  /** The renderer owns fetching; DataGrid only requests a different page. */
  onPageChange?: (page: number) => void;
  /** Optional server-backed page-size choices shown in the footer. */
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  /** Optional drag-and-drop row ordering hook. */
  onRowReorder?: (fromRow: DataGridRow, toRow: DataGridRow) => void | Promise<void>;
  /** Optional parent/child navigation for master-data trees. */
  tree?: { parentField?: string };
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
    const allRows = this.sortedRows((this.state.rows as DataGridRow[] | undefined) || []);
    const treeParentField = this.options.tree?.parentField || 'parent_id';
    const collapsed = new Set(Array.isArray(this.state.collapsedTreeIds) ? this.state.collapsedTreeIds.map(String) : []);
    const hiddenByCollapsedAncestor = (row: DataGridRow) => {
      if (!this.options.tree) return false;
      let parentId = row[treeParentField] == null ? '' : String(row[treeParentField]);
      const seen = new Set<string>();
      while (parentId && !seen.has(parentId)) {
        seen.add(parentId);
        if (collapsed.has(parentId)) return true;
        const parent = allRows.find(candidate => this.rowId(candidate, 0) === parentId);
        parentId = parent?.[treeParentField] == null ? '' : String(parent[treeParentField]);
      }
      return false;
    };
    const rows = allRows.filter(row => !hiddenByCollapsedAncestor(row));
    const meta = (this.state.meta as Record<string, unknown> | undefined) || {};
    const actions = (this.state.actions as DataGridAction[] | undefined) || [];
    const selectable = this.options.selectable || this.state.selectable === true;
    const rowNumbers = this.options.rowNumbers === true || this.state.rowNumbers === true;
    const visibleColumnIds = new Set(
      Array.isArray(this.state.visibleColumns)
        ? this.state.visibleColumns.map(String)
        : this.columns.map(column => column.id || column.field),
    );
    const visibleColumns = this.columns.filter(column => visibleColumnIds.has(column.id || column.field));
    const selectedIds = this.selectedIds();
    const selected = new Set(selectedIds);
    const labels = {
      rowNumber: 'Row number',
      selectAll: 'Chọn tất cả dòng',
      selectRow: (id: string) => `Select row ${id}`,
      expandRow: 'Expand row',
      collapseRow: 'Collapse row',
      summaryOf: 'of',
      previousPage: 'Previous page',
      nextPage: 'Next page',
      ...this.options.labels,
    };
    const rowReorder = this.options.onRowReorder;
    let draggedRow: DataGridRow | null = null;

    const x2many = this.state.variant === 'odoo_x2many';
    const root = html.take(container).div.className(`core3-token-panel rounded-lg border border-gray-200 bg-white${x2many ? ' o-x2many-grid' : ''}`).getContext();
    const title = meta.title || this.state.title;
    const description = meta.description || this.state.description;
    if (title || description || (!x2many && actions.length) || this.options.columnChooser) {
      const toolbar = html.take(root).div.className('core3-token-toolbar flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 px-4 py-3').getContext();
      if (title || description) {
        const copy = html.take(toolbar).div.getContext();
        if (title) html.take(copy).h3.className('core3-token-heading text-sm font-semibold text-gray-900').text(String(title));
        if (description) html.take(copy).p.className('core3-token-muted mt-1 text-sm text-gray-500').text(String(description));
      }
      if (actions.length) {
        const actionBar = html.take(toolbar).div.className('flex flex-wrap items-center gap-2').getContext();
        for (const action of actions) {
          const button = html.take(actionBar).button
            .className(`inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${this.actionClass(action.variant)}`)
            .dataAttr('grid-action', action.id)
            .getContext();
          if (action.icon) {
            const icon = document.createElement('span');
            icon.setAttribute('aria-hidden', 'true');
            if (hasIcon(action.icon)) appendIcon(icon, action.icon);
            else icon.textContent = action.icon;
            button.appendChild(icon);
          }
          button.appendChild(document.createTextNode(action.label));
          if (action.disabled) button.setAttribute('disabled', '');
          else button.addEventListener('click', () => {
            const context = { selectedIds: this.selectedIds(), action };
            if (typeof action.onClick === 'function') action.onClick(context);
            else this.submit(action.id, { ...action.params, selectedIds: context.selectedIds });
          });
        }
      }
      if (this.options.columnChooser) {
        const chooser = html.take(toolbar).details.className('relative').getContext();
        html.take(chooser).summary.className('core3-token-control cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700').text('Cột');
        const menu = html.take(chooser).div.className('core3-token-menu absolute right-0 z-10 mt-2 min-w-[180px] rounded-md border border-gray-200 bg-white p-2 shadow-lg').getContext();
        for (const column of this.columns) {
          const label = html.take(menu).label.className('core3-token-label flex items-center gap-2 px-2 py-1 text-sm text-gray-700').getContext();
          const checkbox = html.take(label).input.attr('type', 'checkbox').getContext() as HTMLInputElement;
          checkbox.checked = visibleColumnIds.has(column.id || column.field);
          checkbox.setAttribute('aria-label', `Hiển thị ${column.label}`);
          checkbox.addEventListener('change', () => {
            const next = new Set(visibleColumnIds);
            checkbox.checked ? next.add(column.id || column.field) : next.delete(column.id || column.field);
            if (next.size === 0) {
              checkbox.checked = true;
              return;
            }
            this.setState({ visibleColumns: [...next] });
          });
          label.append(document.createTextNode(column.label));
        }
      }
    }

    const scroll = html.take(root).div.className('overflow-x-auto').getContext();
    const table = html.take(scroll).table.className('core3-token-table min-w-full divide-y divide-gray-200').getContext();
    const headerRow = html.take(table).thead.className('core3-token-header bg-gray-50').trow.getContext();

    if (selectable) {
      const checkbox = html.take(headerRow).th.className('w-10 px-4 py-3').input.attr('type', 'checkbox').getContext() as HTMLInputElement;
      checkbox.setAttribute('aria-label', 'Chọn tất cả dòng');
      checkbox.checked = rows.length > 0 && rows.every((row, index) => selected.has(this.rowId(row, index)));
      checkbox.indeterminate = selected.size > 0 && !checkbox.checked;
      checkbox.addEventListener('change', () => this.setSelectedIds(checkbox.checked ? rows.map((row, index) => this.rowId(row, index)) : []));
    }

    if (rowNumbers) {
      html.take(headerRow).th
        .className('w-12 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500')
        .attr('aria-label', labels.rowNumber);
    }

    const sort = this.state.sort as { field?: string; direction?: SortDirection } | undefined;
    for (const column of visibleColumns) {
      const align = column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left';
      const th = html.take(headerRow).th.className(`px-4 py-3 ${align} text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap`).getContext();
      th.dataset.column = column.id || column.field;
      const sortable = column.sortable === true;
      if (sortable) {
        const active = sort?.field === column.field;
        const button = html.take(th).button.className('core3-sort-button inline-flex items-center gap-1 hover:text-gray-900').dataAttr('sort-field', column.field).text(column.label).getContext();
        button.setAttribute('aria-sort', active ? (sort?.direction === 'desc' ? 'descending' : 'ascending') : 'none');
        const indicator = document.createElement('span');
        indicator.className = 'core3-sort-indicator text-gray-400';
        appendIcon(indicator, active ? (sort?.direction === 'desc' ? 'sort-descending' : 'sort-ascending') : 'sort');
        button.append(indicator);
        button.addEventListener('click', () => this.setSort(column.field));
      } else {
        html.take(th).text(column.label);
      }
    }

    const tbody = html.take(table).tbody.className('core3-token-body divide-y divide-gray-100 bg-white').getContext();
    if (!rows.length) {
      const empty = this.options.emptyState || (this.state.emptyState as DataGridOptions['emptyState']) || {};
      const cell = html.take(tbody).trow.tdata.attr('colspan', String(visibleColumns.length + (selectable ? 1 : 0) + (rowNumbers ? 1 : 0))).className('px-4 py-12 text-center').getContext();
      html.take(cell).p.className('text-sm font-medium text-gray-900').text(empty.title || 'No records found');
      if (empty.description) html.take(cell).p.className('mt-1 text-sm text-gray-500').text(empty.description);
    } else {
      rows.forEach((row, index) => {
        const id = this.rowId(row, index);
        const tr = html.take(tbody).trow.className('core3-token-row transition-colors hover:bg-gray-50').getContext();
        if (rowReorder) {
          tr.draggable = true;
          tr.dataset.reorderRow = id;
          tr.classList.add('cursor-grab', 'active:cursor-grabbing');
          tr.addEventListener('dragstart', event => {
            draggedRow = row;
            tr.setAttribute('aria-grabbed', 'true');
            const transfer = (event as DragEvent).dataTransfer;
            if (transfer) {
              transfer.effectAllowed = 'move';
              transfer.setData('text/plain', id);
            }
          });
          tr.addEventListener('dragend', () => {
            draggedRow = null;
            tr.setAttribute('aria-grabbed', 'false');
          });
          tr.addEventListener('dragover', event => event.preventDefault());
          tr.addEventListener('drop', event => {
            event.preventDefault();
            if (draggedRow && this.rowId(draggedRow, index) !== id) {
              void rowReorder(draggedRow, row);
            }
          });
        }
        if (selectable) {
          const checkbox = html.take(tr).tdata.className('w-10 px-4 py-3').input.attr('type', 'checkbox').getContext() as HTMLInputElement;
          checkbox.setAttribute('aria-label', labels.selectRow(id));
          checkbox.checked = selected.has(id);
          checkbox.addEventListener('change', () => {
            const next = new Set(this.selectedIds());
            checkbox.checked ? next.add(id) : next.delete(id);
            this.setSelectedIds([...next]);
          });
        }
        if (rowNumbers) {
          const page = Number(meta.page || 1);
          const pageSize = Number(meta.pageSize || rows.length || 1);
          html.take(tr).tdata
            .className('w-12 px-3 py-3 text-center text-sm text-slate-500')
            .text(String((page - 1) * pageSize + index + 1));
        }
        for (const column of visibleColumns) {
          const align = column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left';
          const value = row[column.field];
          const cell = html.take(tr).tdata.className(`core3-token-cell core3-grid-cell max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap px-4 py-3 text-sm text-gray-700 ${align}`).getContext();
          cell.dataset.column = column.id || column.field;
          if (column.rowActions?.length) {
            const actionBar = html.take(cell).div.className('flex items-center justify-end gap-1').getContext();
            for (const action of column.rowActions) {
              if (action.visible && !action.visible(row)) continue;
              const button = html.take(actionBar).button
                .className(`rounded px-2 py-1 text-xs font-medium ${this.actionClass(action.variant)}`)
                .dataAttr('grid-row-action', `${action.id}:${id}`)
                .getContext();
              if (action.icon) {
                const icon = document.createElement('span');
                icon.setAttribute('aria-hidden', 'true');
                if (hasIcon(action.icon)) appendIcon(icon, action.icon);
                else icon.textContent = action.icon;
                button.appendChild(icon);
              }
              button.appendChild(document.createTextNode(action.label));
              button.addEventListener('click', () => this.submit(action.id, { row }));
            }
          } else if (column.render) {
            column.render(cell, value, row);
          } else {
            const text = column.format ? column.format(value, row) : value == null || value === '' ? '—' : String(value);
            cell.textContent = text;
          }
          if (this.options.tree && column === visibleColumns[0]) {
            const id = this.rowId(row, index);
            const hasChildren = allRows.some(candidate => String(candidate[treeParentField] ?? '') === id);
            if (hasChildren) {
              const toggle = document.createElement('button');
              const isCollapsed = collapsed.has(id);
              toggle.type = 'button';
              toggle.className = 'mr-1 inline-flex h-5 w-5 items-center justify-center rounded text-xs text-gray-500 hover:bg-gray-100';
              toggle.setAttribute('aria-label', isCollapsed ? labels.expandRow : labels.collapseRow);
              toggle.setAttribute('aria-expanded', String(!isCollapsed));
              toggle.textContent = isCollapsed ? '+' : '-';
              toggle.addEventListener('click', () => {
                const next = new Set(collapsed);
                isCollapsed ? next.delete(id) : next.add(id);
                this.setState({ collapsedTreeIds: [...next] });
              });
              cell.prepend(toggle);
            }
          }
        }
      });
    }

    if (x2many && actions.length) {
      const controls = html.take(root).div.className('o-x2many-controls').getContext();
      for (const action of actions) {
        const button = html.take(controls).button.className('o-x2many-create').attr('type', 'button').dataAttr('grid-action', action.id).getContext() as HTMLButtonElement;
        button.textContent = action.label;
        button.disabled = action.disabled === true;
        if (!button.disabled) button.addEventListener('click', () => {
          const context = { selectedIds: this.selectedIds(), action };
          if (typeof action.onClick === 'function') action.onClick(context);
          else this.submit(action.id, { ...action.params, selectedIds: context.selectedIds });
        });
      }
    }

    const totalRows = Number(meta.total || 0);
    const effectivePageSize = Number(meta.pageSize || rows.length || 1);
    if (meta.total != null && (!x2many || totalRows > effectivePageSize)) {
      const summary = html.take(root).div.className('core3-token-summary flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-500').getContext();
      const total = Number(meta.total);
      const page = Number(meta.page || 1);
      const pageSize = Number(meta.pageSize || rows.length || 1);
      const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
      const end = Math.min(page * pageSize, total);
      html.take(summary).span.text(`${start}–${end} ${labels.summaryOf} ${total}`);

      const pages = Math.max(1, Math.ceil(total / pageSize));
      const controls = html.take(summary).div.className('inline-flex items-center gap-2').getContext();
      if (this.options.pageSizeOptions?.length) {
        html.take(controls).span.className('text-xs text-gray-500').text('Số dòng');
        const select = html.take(controls).select
          .className('rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700')
          .attr('aria-label', 'Số dòng')
          .getContext() as HTMLSelectElement;
        for (const optionValue of this.options.pageSizeOptions) {
          const option = document.createElement('option');
          option.value = String(optionValue);
          option.textContent = String(optionValue);
          option.selected = optionValue === pageSize;
          select.append(option);
        }
        select.value = String(pageSize);
        select.addEventListener('change', () => {
          const next = Number(select.value);
          if (Number.isFinite(next) && next > 0) this.options.onPageSizeChange?.(next);
        });
      }
      if (pages > 1) {
        const addButton = (label: string, targetPage: number, disabled: boolean, ariaLabel: string) => {
          const button = html.take(controls).button
            .className('rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50')
            .text(label)
            .getContext() as HTMLButtonElement;
          button.setAttribute('aria-label', ariaLabel);
          button.disabled = disabled;
          if (!disabled) button.addEventListener('click', () => this.setPage(targetPage));
        };
        addButton('‹', page - 1, page <= 1, labels.previousPage);
        html.take(controls).span.className('px-2 text-xs text-gray-500').text(`${page} / ${pages}`);
        addButton('›', page + 1, page >= pages, labels.nextPage);
      }
    }

    const footerStats = Array.isArray(this.state.footerStats) ? this.state.footerStats : [];
    const footerRecord = this.state.footerRecord || {};
    if (footerStats.length) {
      const footer = html.take(root).section.className('o-document-totals').getContext();
      const list = html.take(footer).div.className('o-document-totals-list').getContext();
      for (const stat of footerStats) {
        const item = html.take(list).div.className('o-document-total').getContext();
        html.take(item).div.className('o-document-total-label').text(String(stat.label || 'Total'));
        html.take(item).div.className('o-document-total-value').text(footerRecord[stat.field] == null || footerRecord[stat.field] === ''
          ? '0'
          : String(footerRecord[stat.field]));
      }
    }
  }
}

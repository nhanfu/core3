import { html } from '../html.ts';
import { BaseComponent } from './BaseComponent.ts';
import { appendBadge } from './helpers.ts';
import { appendIcon } from './Icon.ts';
import { resolveDatePreset, type DateRangePreset } from './ListToolbar.ts';

type ListRow = Record<string, unknown>;
type SortDirection = 'asc' | 'desc';

export type ListViewColumn = {
  id?: string;
  field: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  optional?: 'show' | 'hide';
  render?: (container: HTMLElement, value: unknown, row: ListRow) => void;
  rowActions?: ListViewRowAction[];
};

export type ListViewRowAction = {
  id: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  visible?: (row: ListRow) => boolean;
};

export type ListViewFilter = {
  field: string;
  label: string;
  placeholder?: string;
  options?: Array<string | { id: string; label: string }>;
};

export type ListViewAction = {
  id: string;
  label?: string;
  icon?: string;
  title?: string;
  disabled?: boolean;
  params?: Record<string, unknown>;
};

export type ListViewMode = {
  id: 'list' | 'kanban';
  label: string;
  icon?: string;
  groupBy?: string;
  groups?: Array<{ value: string; label: string; color?: string }>;
  card?: { title: string; subtitle?: string; fields?: Array<{ field: string; label?: string }> };
};

export type ListViewOptions = {
  variant?: 'cards' | 'odoo';
  breadcrumbs?: string[];
  createAction?: { id: string; label: string };
  search?: false | { label?: string; placeholder?: string };
  filters?: ListViewFilter[];
  dateRange?: {
    fromField?: string;
    toField?: string;
    fromLabel?: string;
    toLabel?: string;
    label?: string;
    presets?: DateRangePreset[];
    presetLabels?: Partial<Record<DateRangePreset, string>>;
  };
  actions?: ListViewAction[];
  rowKey?: string;
  selectable?: boolean;
  columnChooser?: boolean;
  openAction?: string;
  rowActions?: 'buttons' | 'menu';
  views?: ListViewMode[];
  emptyState?: { title?: string; description?: string };
  labels?: {
    new?: string;
    filters?: string;
    columns?: string;
    selected?: string;
    clearSelection?: string;
    removeFilter?: string;
    previousPage?: string;
    nextPage?: string;
    selectAll?: string;
    selectRow?: (id: string) => string;
    searchFacet?: string;
    apply?: string;
    moreActions?: string;
  };
  onFilterChange?: (filters: Record<string, unknown>) => void;
  onSort?: (sort: { field: string; direction: SortDirection }) => void;
  onPageChange?: (page: number) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
};

/**
 * Generic list view. The original card list remains the default; the explicit
 * `odoo` variant provides the dense control-panel/list behavior used by
 * declarative back-office resource pages.
 */
export class ListView extends BaseComponent {
  defs: ListViewColumn[];
  options: ListViewOptions;

  constructor(id: string, state: Record<string, unknown> = {}, defs: ListViewColumn[] = [], options: ListViewOptions = {}) {
    super(id, state);
    this.defs = defs;
    this.options = options;
  }

  draw(container: HTMLElement) {
    this.children = [];
    if (this.options.variant !== 'odoo') {
      this.drawCards(container);
      return;
    }
    this.drawOdoo(container);
  }

  private drawCards(container: HTMLElement) {
    const { items = [], loading = false } = this.state as { items?: ListRow[]; loading?: boolean };

    if (loading) {
      for (let i = 0; i < 3; i++) {
        const card = html.take(container).div.className('bg-white rounded-lg border border-gray-200 p-4 space-y-2 animate-pulse').getContext();
        html.take(card).div.className('h-4 bg-gray-100 rounded w-1/3');
        html.take(card).div.className('h-3 bg-gray-100 rounded w-2/3');
      }
      return;
    }

    if (!items?.length) {
      html.take(container).div.className('py-8 text-center text-sm text-gray-400').text('No items');
      return;
    }

    const primaryDef = this.defs[0];
    const secondaryDef = this.defs.find(def => (def as any).secondary);
    const badgeDef = this.defs.find(def => (def as any).type === 'BadgeCell');
    const list = html.take(container).div.className('flex flex-col gap-2').getContext();

    for (const item of items) {
      const row = html.take(list).div.className('bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-300 transition-colors cursor-pointer').div.className('flex items-start justify-between gap-3').getContext();
      const textCol = html.take(row).div.getContext();
      if (primaryDef) html.take(textCol).p.className('text-sm font-medium text-gray-900').text(String(item[primaryDef.field] ?? ''));
      if (secondaryDef) html.take(textCol).p.className('text-xs text-gray-500 mt-0.5').text(String(item[secondaryDef.field] ?? ''));
      if (badgeDef) appendBadge(row, item[badgeDef.field], null);
    }
  }

  private drawOdoo(container: HTMLElement) {
    const rows = Array.isArray(this.state.rows) ? this.state.rows as ListRow[] : [];
    const meta = (this.state.meta as Record<string, unknown> | undefined) || {};
    const filters = (this.state.filters as Record<string, unknown> | undefined) || {};
    const selectedIds: string[] = Array.isArray(this.state.selectedIds) ? this.state.selectedIds.map(String) : [];
    const selected = new Set<string>(selectedIds);
    const suppliedLabels = Object.fromEntries(
      Object.entries(this.options.labels || {}).filter(([, value]) => value !== undefined),
    );
    const labels = {
      new: 'New',
      filters: 'Filters',
      columns: 'Columns',
      selected: 'selected',
      clearSelection: 'Clear selection',
      removeFilter: 'Remove filter',
      previousPage: 'Previous page',
      nextPage: 'Next page',
      selectAll: 'Select all rows',
      selectRow: (id: string) => `Select row ${id}`,
      searchFacet: 'Search',
      apply: 'Apply',
      moreActions: 'More actions',
      ...suppliedLabels,
    };
    const visibleColumnIds = new Set<string>(
      Array.isArray(this.state.visibleColumns)
        ? this.state.visibleColumns.map(String)
        : this.defs.filter(column => column.optional !== 'hide').map(column => column.id || column.field),
    );
    const visibleColumns = this.defs.filter(column => visibleColumnIds.has(column.id || column.field));
    const root = html.take(container).section.className('o-list-view').getContext();

    const controlPanel = html.take(root).div.className('o-list-control-panel').getContext();
    const main = html.take(controlPanel).div.className('o-list-control-main').getContext();
    this.drawPrimaryControls(main, labels);
    this.drawSearch(main, filters, selectedIds, labels);
    this.drawNavigation(main, meta, visibleColumnIds, labels);
    this.drawFacets(controlPanel, filters, labels);

    if (this.activeView().id === 'kanban') {
      this.drawKanban(root, rows);
      return;
    }

    const viewport = html.take(root).div.className('o-list-table-viewport').getContext();
    const table = html.take(viewport).table.className('o-list-table').getContext();
    const headRow = html.take(table).thead.trow.getContext();

    if (this.options.selectable) {
      const cell = html.take(headRow).th.className('o-list-selector').getContext();
      const checkbox = html.take(cell).input.attr('type', 'checkbox').getContext() as HTMLInputElement;
      checkbox.setAttribute('aria-label', labels.selectAll);
      checkbox.checked = rows.length > 0 && rows.every((row, index) => selected.has(this.rowId(row, index)));
      checkbox.indeterminate = selected.size > 0 && !checkbox.checked;
      checkbox.addEventListener('change', () => this.setSelectedIds(checkbox.checked ? rows.map((row, index) => this.rowId(row, index)) : []));
    }

    const sort = this.state.sort as { field?: string; direction?: SortDirection } | undefined;
    for (const column of visibleColumns) {
      const align = column.align === 'right' ? 'is-right' : column.align === 'center' ? 'is-center' : '';
      const th = html.take(headRow).th.className(`o-list-column ${align}`).getContext();
      th.dataset.column = column.id || column.field;
      if (column.sortable === false || column.rowActions?.length) {
        th.textContent = column.label;
        continue;
      }
      const active = sort?.field === column.field;
      const button = html.take(th).button.className('o-list-sort').dataAttr('sort-field', column.field).getContext();
      button.append(document.createTextNode(column.label));
      if (active) {
        const icon = document.createElement('span');
        appendIcon(icon, sort?.direction === 'desc' ? 'sort-descending' : 'sort-ascending');
        button.append(icon);
      }
      button.setAttribute('aria-sort', active ? (sort?.direction === 'desc' ? 'descending' : 'ascending') : 'none');
      button.addEventListener('click', () => this.setSort(column.field));
    }

    const body = html.take(table).tbody.getContext();
    if (!rows.length) {
      const empty = this.options.emptyState || {};
      const cell = html.take(body).trow.tdata
        .attr('colspan', String(visibleColumns.length + (this.options.selectable ? 1 : 0)))
        .className('o-list-empty')
        .getContext();
      html.take(cell).h3.text(empty.title || 'No records found');
      if (empty.description) html.take(cell).p.text(empty.description);
    } else {
      rows.forEach((row, index) => this.drawRow(body, row, index, visibleColumns, selected, labels));
    }
  }

  private drawPrimaryControls(container: HTMLElement, labels: Required<NonNullable<ListViewOptions['labels']>>) {
    const primary = html.take(container).div.className('o-list-primary-controls').getContext();
    if (this.options.createAction) {
      const button = html.take(primary).button.className('o-list-create').dataAttr('list-create', this.options.createAction.id).text(this.options.createAction.label || labels.new).getContext();
      button.addEventListener('click', () => void this.submit(this.options.createAction!.id));
    }
    if (this.options.breadcrumbs?.length) {
      const breadcrumbs = html.take(primary).nav.className('o-list-breadcrumbs').attr('aria-label', 'Breadcrumb').getContext();
      this.options.breadcrumbs.forEach((item, index) => {
        html.take(breadcrumbs).span.className(index === this.options.breadcrumbs!.length - 1 ? 'is-current' : '').text(item);
        if (index < this.options.breadcrumbs!.length - 1) html.take(breadcrumbs).span.className('o-list-breadcrumb-separator').text(' / ');
      });
    }
  }

  private drawSearch(container: HTMLElement, filters: Record<string, unknown>, selectedIds: string[], labels: Required<NonNullable<ListViewOptions['labels']>>) {
    const center = html.take(container).div.className('o-list-center').getContext();
    if (selectedIds.length) {
      const selection = html.take(center).div.className('o-list-selection').getContext();
      html.take(selection).span.className('o-list-selection-count').text(String(selectedIds.length));
      html.take(selection).span.text(labels.selected);
      const clear = html.take(selection).button.text(labels.clearSelection).getContext();
      clear.addEventListener('click', () => this.setSelectedIds([]));
      return;
    }

    if (this.options.search === false) return;
    const search = html.take(center).div.className('o-list-search').getContext();
    const searchIcon = html.take(search).span.className('o-list-search-icon').getContext();
    appendIcon(searchIcon, 'search');
    const input = html.take(search).input.attr('type', 'search').dataAttr('list-search', 'true').getContext() as HTMLInputElement;
    input.value = String(this.state.searchDraft || '');
    input.placeholder = this.options.search?.placeholder || 'Search...';
    input.setAttribute('aria-label', this.options.search?.label || input.placeholder);
    input.addEventListener('input', () => this.setState({ searchDraft: input.value }, false));
    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      const query = input.value.trim();
      if (!query) return;
      this.setState({ searchDraft: '' }, false);
      this.setFilters({ ...filters, q: query });
    });
    this.drawFilterMenu(search, filters, labels);
  }

  private drawFilterMenu(container: HTMLElement, filters: Record<string, unknown>, labels: Required<NonNullable<ListViewOptions['labels']>>) {
    if (!this.options.filters?.length && !this.options.dateRange) return;
    const details = html.take(container).details.className('o-list-dropdown o-list-filter-menu').getContext() as HTMLDetailsElement;
    const summary = html.take(details).summary.className('o-list-filter-toggle').attr('aria-label', labels.filters).attr('title', labels.filters).getContext();
    appendIcon(summary, 'chevron-down');
    const menu = html.take(details).div.className('o-list-dropdown-menu').getContext();

    for (const filter of this.options.filters || []) {
      const group = html.take(menu).section.className('o-list-filter-group').getContext();
      html.take(group).h4.text(filter.label);
      const clear = html.take(group).button.className(!filters[filter.field] ? 'is-active' : '').text(filter.placeholder || `All ${filter.label.toLowerCase()}`).getContext();
      clear.addEventListener('click', () => this.setFilters({ ...filters, [filter.field]: null }));
      for (const option of filter.options || []) {
        const id = typeof option === 'string' ? option : option.id;
        const label = typeof option === 'string' ? option : option.label;
        const button = html.take(group).button.className(String(filters[filter.field] ?? '') === id ? 'is-active' : '').text(label).getContext();
        button.dataset.filterField = filter.field;
        button.dataset.filterValue = id;
        button.addEventListener('click', () => this.setFilters({ ...filters, [filter.field]: id }));
      }
    }

    if (this.options.dateRange) {
      const range = this.options.dateRange;
      const fromField = range.fromField || 'from_date';
      const toField = range.toField || 'to_date';
      const group = html.take(menu).section.className('o-list-filter-group').getContext();
      html.take(group).h4.text(range.label || 'Date');
      for (const preset of range.presets || []) {
        const button = html.take(group).button.dataAttr('date-preset', preset).text(range.presetLabels?.[preset] || this.datePresetLabel(preset)).getContext();
        button.addEventListener('click', () => {
          const dates = resolveDatePreset(preset);
          this.setFilters({ ...filters, [fromField]: dates.from || null, [toField]: dates.to || null });
        });
      }
      const custom = html.take(group).div.className('o-list-date-custom').getContext();
      const from = html.take(custom).input.attr('type', 'date').getContext() as HTMLInputElement;
      const to = html.take(custom).input.attr('type', 'date').getContext() as HTMLInputElement;
      from.setAttribute('aria-label', range.fromLabel || 'From date');
      to.setAttribute('aria-label', range.toLabel || 'To date');
      from.value = String(filters[fromField] || '');
      to.value = String(filters[toField] || '');
      const apply = html.take(custom).button.className('o-list-date-apply').text(labels.apply).getContext();
      apply.addEventListener('click', () => this.setFilters({ ...filters, [fromField]: from.value || null, [toField]: to.value || null }));
    }
    this.dismissDetails(details);
  }

  private drawNavigation(container: HTMLElement, meta: Record<string, unknown>, visibleColumnIds: Set<string>, labels: Required<NonNullable<ListViewOptions['labels']>>) {
    const navigation = html.take(container).div.className('o-list-navigation').getContext();
    const total = Number(meta.total || 0);
    const page = Math.max(1, Number(meta.page || 1));
    const pageSize = Math.max(1, Number(meta.pageSize || this.state.pageSize || 1));
    const start = total ? (page - 1) * pageSize + 1 : 0;
    const end = Math.min(page * pageSize, total);
    const pager = html.take(navigation).div.className('o-list-pager').getContext();
    html.take(pager).span.className('o-list-pager-range').text(`${start}-${end} / ${total}`);
    const previous = html.take(pager).button.text('‹').getContext() as HTMLButtonElement;
    previous.setAttribute('aria-label', labels.previousPage);
    previous.disabled = page <= 1;
    if (!previous.disabled) previous.addEventListener('click', () => this.options.onPageChange?.(page - 1));
    const next = html.take(pager).button.text('›').getContext() as HTMLButtonElement;
    next.setAttribute('aria-label', labels.nextPage);
    next.disabled = end >= total;
    if (!next.disabled) next.addEventListener('click', () => this.options.onPageChange?.(page + 1));

    const views = this.options.views || [];
    if (views.length > 1) {
      const switcher = html.take(navigation).div.className('o-list-view-switcher').attr('role', 'group').attr('aria-label', 'View').getContext();
      const activeView = this.activeView();
      for (const view of views) {
        const button = html.take(switcher).button
          .className(view.id === activeView.id ? 'is-active' : '')
          .dataAttr('list-view', view.id)
          .attr('aria-label', view.label)
          .attr('title', view.label)
          .getContext();
        appendIcon(button, view.icon || (view.id === 'kanban' ? 'dashboard' : 'table'));
        button.setAttribute('aria-pressed', String(view.id === activeView.id));
        button.addEventListener('click', () => this.setState({ activeView: view.id }));
      }
    }

    if (!this.options.columnChooser && !this.options.actions?.length) return;
    const details = html.take(navigation).details.className('o-list-dropdown o-list-cog-menu').getContext() as HTMLDetailsElement;
    const summary = html.take(details).summary.attr('aria-label', labels.columns).attr('title', labels.columns).getContext();
    appendIcon(summary, 'settings');
    const menu = html.take(details).div.className('o-list-dropdown-menu').getContext();
    if (this.options.columnChooser) {
      const group = html.take(menu).section.className('o-list-column-menu').getContext();
      html.take(group).h4.text(labels.columns);
      for (const column of this.defs.filter(candidate => !candidate.rowActions?.length)) {
        const label = html.take(group).label.getContext();
        const checkbox = html.take(label).input.attr('type', 'checkbox').getContext() as HTMLInputElement;
        checkbox.checked = visibleColumnIds.has(column.id || column.field);
        checkbox.setAttribute('aria-label', `${labels.columns}: ${column.label}`);
        checkbox.addEventListener('change', () => {
          const nextVisible = new Set(visibleColumnIds);
          checkbox.checked ? nextVisible.add(column.id || column.field) : nextVisible.delete(column.id || column.field);
          if (!nextVisible.size) {
            checkbox.checked = true;
            return;
          }
          this.setState({ visibleColumns: [...nextVisible] });
        });
        label.append(document.createTextNode(column.label));
      }
    }
    if (this.options.actions?.length) {
      const group = html.take(menu).section.className('o-list-utility-menu').getContext();
      for (const action of this.options.actions) {
        const button = html.take(group).button.dataAttr('list-action', action.id).getContext() as HTMLButtonElement;
        if (action.icon) {
          const icon = document.createElement('span');
          appendIcon(icon, action.icon);
          button.append(icon);
        }
        button.append(document.createTextNode(action.label || action.title || action.id));
        button.disabled = Boolean(action.disabled);
        if (!button.disabled) button.addEventListener('click', () => void this.submit(action.id, action.params || {}));
      }
    }
    this.dismissDetails(details);
  }

  private drawFacets(container: HTMLElement, filters: Record<string, unknown>, labels: Required<NonNullable<ListViewOptions['labels']>>) {
    const facets: Array<{ key: string; label: string; clear: () => void }> = [];
    if (filters.q) {
      facets.push({ key: 'q', label: `${labels.searchFacet}: ${filters.q}`, clear: () => this.setFilters({ ...filters, q: null }) });
    }
    for (const filter of this.options.filters || []) {
      const value = filters[filter.field];
      if (value == null || value === '') continue;
      const option = filter.options?.find(candidate => String(typeof candidate === 'string' ? candidate : candidate.id) === String(value));
      const optionLabel = typeof option === 'string' ? option : option?.label || String(value);
      facets.push({ key: filter.field, label: `${filter.label}: ${optionLabel}`, clear: () => this.setFilters({ ...filters, [filter.field]: null }) });
    }
    if (this.options.dateRange) {
      const fromField = this.options.dateRange.fromField || 'from_date';
      const toField = this.options.dateRange.toField || 'to_date';
      if (filters[fromField] || filters[toField]) {
        const value = [filters[fromField] || '...', filters[toField] || '...'].join(' - ');
        facets.push({
          key: 'date-range',
          label: `${this.options.dateRange.label || 'Date'}: ${value}`,
          clear: () => this.setFilters({ ...filters, [fromField]: null, [toField]: null }),
        });
      }
    }
    if (!facets.length) return;
    const bar = html.take(container).div.className('o-list-facets').getContext();
    for (const facet of facets) {
      const item = html.take(bar).div.className('o-list-facet').dataAttr('filter-facet', facet.key).getContext();
      html.take(item).span.text(facet.label);
      const remove = html.take(item).button.attr('aria-label', `${labels.removeFilter}: ${facet.label}`).getContext();
      appendIcon(remove, 'x');
      remove.addEventListener('click', facet.clear);
    }
  }

  private drawKanban(container: HTMLElement, rows: ListRow[]) {
    const view = this.activeView();
    const groupBy = view.groupBy || 'status';
    const configuredGroups = view.groups || [];
    const groups = configuredGroups.map(group => ({ ...group, rows: [] as ListRow[] }));
    const byValue = new Map(groups.map(group => [String(group.value), group]));
    for (const row of rows) {
      const value = String(row[groupBy] ?? '');
      let group = byValue.get(value);
      if (!group) {
        group = { value, label: value || 'Undefined', rows: [] };
        groups.push(group);
        byValue.set(value, group);
      }
      group.rows.push(row);
    }

    const board = html.take(container).div.className('o-kanban-board').getContext();
    for (const group of groups) {
      const column = html.take(board).section.className('o-kanban-column').dataAttr('kanban-group', group.value).getContext();
      const header = html.take(column).header.className('o-kanban-column-header').getContext();
      const heading = html.take(header).div.className('o-kanban-column-title').getContext();
      if (group.color) heading.classList.add(`is-${group.color}`);
      html.take(heading).span.text(group.label);
      html.take(header).span.className('o-kanban-count').text(String(group.rows.length));
      const cards = html.take(column).div.className('o-kanban-cards').getContext();
      for (const [index, row] of group.rows.entries()) this.drawKanbanCard(cards, row, index, view);
    }
  }

  private drawKanbanCard(container: HTMLElement, row: ListRow, index: number, view: ListViewMode) {
    const card = html.take(container).div.className('o-kanban-card').dataAttr('row-id', this.rowId(row, index)).getContext();
    if (this.options.openAction) {
      card.tabIndex = 0;
      card.setAttribute('role', 'link');
      card.addEventListener('click', () => void this.submit(this.options.openAction!, { row }));
      card.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          void this.submit(this.options.openAction!, { row });
        }
      });
    }
    const title = row[view.card?.title || 'name'];
    html.take(card).h3.className('o-kanban-card-title').text(title == null || title === '' ? '—' : String(title));
    if (view.card?.subtitle) {
      const subtitle = row[view.card.subtitle];
      if (subtitle != null && subtitle !== '') html.take(card).p.className('o-kanban-card-subtitle').text(String(subtitle));
    }
    const fields = view.card?.fields || [];
    if (!fields.length) return;
    const details = html.take(card).div.className('o-kanban-card-fields').getContext();
    for (const field of fields) {
      const value = row[field.field];
      if (value == null || value === '') continue;
      const line = html.take(details).div.getContext();
      if (field.label) html.take(line).span.className('o-kanban-card-field-label').text(field.label);
      html.take(line).span.className('o-kanban-card-field-value').text(String(value));
    }
  }

  private drawRow(container: HTMLElement, row: ListRow, index: number, columns: ListViewColumn[], selected: Set<string>, labels: Required<NonNullable<ListViewOptions['labels']>>) {
    const id = this.rowId(row, index);
    const tr = html.take(container).trow.className('o-list-data-row').dataAttr('row-id', id).getContext();
    tr.addEventListener('click', (event: MouseEvent) => {
      if (!this.options.openAction || (event.target as Element | null)?.closest('button,input,a,summary,details,select')) return;
      void this.submit(this.options.openAction, { row });
    });
    if (this.options.selectable) {
      const cell = html.take(tr).tdata.className('o-list-selector').getContext();
      const checkbox = html.take(cell).input.attr('type', 'checkbox').getContext() as HTMLInputElement;
      checkbox.checked = selected.has(id);
      checkbox.setAttribute('aria-label', labels.selectRow(id));
      checkbox.addEventListener('change', () => {
        const next = new Set<string>(this.selectedIds());
        checkbox.checked ? next.add(id) : next.delete(id);
        this.setSelectedIds([...next]);
      });
    }
    columns.forEach((column, columnIndex) => {
      const align = column.align === 'right' ? 'is-right' : column.align === 'center' ? 'is-center' : '';
      const cell = html.take(tr).tdata.className(`o-list-cell ${align}`).getContext();
      cell.dataset.column = column.id || column.field;
      if (columnIndex === 0 && this.options.openAction) {
        cell.classList.add('o-list-open-cell');
        cell.tabIndex = 0;
        cell.setAttribute('role', 'link');
        cell.addEventListener('keydown', (event: KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            void this.submit(this.options.openAction!, { row });
          }
        });
      }
      if (column.rowActions?.length) {
        this.drawRowActions(cell, row, id, column.rowActions, labels);
      } else if (column.render) {
        column.render(cell, row[column.field], row);
      } else {
        const value = row[column.field];
        cell.textContent = value == null || value === '' ? '—' : String(value);
      }
    });
  }

  private drawRowActions(container: HTMLElement, row: ListRow, rowId: string, actions: ListViewRowAction[], labels: Required<NonNullable<ListViewOptions['labels']>>) {
    const visibleActions = actions.filter(action => !action.visible || action.visible(row));
    if (!visibleActions.length) return;
    if (this.options.rowActions !== 'menu') {
      for (const action of visibleActions) {
        const button = html.take(container).button.dataAttr('list-row-action', `${action.id}:${rowId}`).text(action.label).getContext();
        button.addEventListener('click', (event: MouseEvent) => {
          event.stopPropagation();
          void this.submit(action.id, { row });
        });
      }
      return;
    }
    const details = html.take(container).details.className('o-list-dropdown o-list-row-menu').attr('name', `${this.id}-row-actions`).getContext() as HTMLDetailsElement;
    const summary = html.take(details).summary.attr('aria-label', labels.moreActions).attr('title', labels.moreActions).getContext();
    appendIcon(summary, 'more-vertical');
    const menu = html.take(details).div.className('o-list-dropdown-menu').getContext();
    for (const action of visibleActions) {
      const button = html.take(menu).button.className(action.variant === 'danger' ? 'is-danger' : '').dataAttr('list-row-action', `${action.id}:${rowId}`).getContext();
      if (action.icon) {
        const icon = document.createElement('span');
        appendIcon(icon, action.icon);
        button.append(icon);
      }
      button.append(document.createTextNode(action.label));
      button.addEventListener('click', (event: MouseEvent) => {
        event.stopPropagation();
        details.open = false;
        void this.submit(action.id, { row });
      });
    }
    this.dismissDetails(details);
  }

  private dismissDetails(details: HTMLDetailsElement) {
    details.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        details.open = false;
        (details.querySelector('summary') as HTMLElement | null)?.focus();
      }
    });
    details.addEventListener('focusout', (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (next && !details.contains(next)) details.open = false;
    });
  }

  private rowId(row: ListRow, index: number) {
    return String(row[this.options.rowKey || 'id'] ?? index);
  }

  private activeView(): ListViewMode {
    const views = this.options.views || [];
    return views.find(view => view.id === this.state.activeView) || views[0] || { id: 'list', label: 'List' };
  }

  private selectedIds(): string[] {
    return Array.isArray(this.state.selectedIds) ? this.state.selectedIds.map(String) : [];
  }

  private setSelectedIds(selectedIds: string[]) {
    this.setState({ selectedIds });
    this.options.onSelectionChange?.(selectedIds);
  }

  private setFilters(filters: Record<string, unknown>) {
    this.setState({ filters });
    this.options.onFilterChange?.(filters);
  }

  private setSort(field: string) {
    const previous = this.state.sort as { field?: string; direction?: SortDirection } | undefined;
    const direction: SortDirection = previous?.field === field && previous.direction === 'asc' ? 'desc' : 'asc';
    const sort = { field, direction };
    this.setState({ sort });
    this.options.onSort?.(sort);
  }

  private datePresetLabel(preset: DateRangePreset) {
    return ({
      today: 'Today',
      previous_month: 'Previous month',
      week: 'This week',
      month: 'This month',
      quarter: 'This quarter',
      year: 'This year',
      last_12_months: 'Last 12 months',
      all: 'All dates',
    } as Record<DateRangePreset, string>)[preset];
  }
}

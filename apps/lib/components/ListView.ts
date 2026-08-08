import { html } from '../html.ts';
import { BaseComponent } from './BaseComponent.ts';
import { appendBadge } from './helpers.ts';
import { appendIcon } from './Icon.ts';
import { KanbanView, type KanbanViewDefinition } from './KanbanView.ts';
import { CalendarView, type CalendarViewDefinition } from './CalendarView.ts';
import { CardView, type CardViewDefinition } from './CardView.ts';
import { PivotView, type PivotViewDefinition } from './PivotView.ts';
import { GraphView, type GraphViewDefinition } from './GraphView.ts';
import { MapView, type MapViewDefinition } from './MapView.ts';
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

export type ListViewGroupBy = { field: string; label: string };

export type ListViewAction = {
  id: string;
  label?: string;
  icon?: string;
  title?: string;
  disabled?: boolean;
  params?: Record<string, unknown>;
};
export type ListViewGroup = ListViewGroupBy;
export type ListViewFavorite = { id: string; label: string; filters?: Record<string, unknown>; groupBy?: string };

export type ListViewDefinition = {
  id: 'list';
  label: string;
  icon?: string;
};
export type FormViewDefinition = {
  id: 'form';
  label: string;
  icon?: string;
};
export type AnalyticsViewMode = PivotViewDefinition | GraphViewDefinition | MapViewDefinition;
export type ListViewMode = ListViewDefinition | KanbanViewDefinition | CalendarViewDefinition | CardViewDefinition | FormViewDefinition | AnalyticsViewMode;

export type ListViewOptions = {
  variant?: 'cards' | 'odoo';
  breadcrumbs?: string[];
  createAction?: { id: string; label: string };
  search?: false | { label?: string; placeholder?: string };
  filters?: ListViewFilter[];
  groupBy?: ListViewGroupBy[];
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
  favorites?: ListViewFavorite[];
  bulkActions?: ListViewAction[];
  rowKey?: string;
  tree?: { parentField?: string };
  selectable?: boolean;
  columnChooser?: boolean;
  openAction?: string;
  doubleClickAction?: string;
  formView?: { page: string; sidePanel?: boolean };
  renderForm?: (row: ListRow, container: HTMLElement) => Promise<void> | void;
  rowActions?: 'buttons' | 'menu';
  views?: ListViewMode[];
  viewNavigation?: 'icons' | 'tabs';
  onKanbanMove?: (row: ListRow, status: string) => Promise<void> | void;
  onKanbanAddStatus?: (label: string) => Promise<void> | void;
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
  onViewChange?: (view: string) => void;
  onPivotChange?: (request: { rows: string[]; columns: string[]; measures: Array<{ field?: string; aggregate: string; label?: string }>; ranges?: Record<string, string> }) => void;
  onGroupByChange?: (field: string | null) => void;
  onFavoriteChange?: (favorite: ListViewFavorite) => void;
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
    for (const child of this.children) child.dispose();
    this.children = [];
    if (this.options.variant !== 'odoo') {
      this.drawCards(container);
      return;
    }
    void this.drawOdoo(container);
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

  private async drawOdoo(container: HTMLElement) {
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

    if (this.options.viewNavigation === 'tabs') this.drawViewTabs(root);

    const controlPanel = html.take(root).div.className('o-list-control-panel').getContext();
    const main = html.take(controlPanel).div.className('o-list-control-main').getContext();
    const activeView = this.activeView();
    this.drawPrimaryControls(main, labels);
    this.drawSearch(main, filters, selectedIds, labels);
    this.drawNavigation(main, meta, visibleColumnIds, labels, activeView.id !== 'pivot');
    this.drawFacets(controlPanel, filters, labels);

    const listEnabled = this.isViewEnabled('list');
    const hasFormMode = (this.options.views || []).some(view => view.id === 'form');
    const formEnabled = !this.isSmallScreen()
      && Boolean(this.options.formView)
      && (!hasFormMode || this.isViewEnabled('form'));
    if (['list', 'form'].includes(activeView.id) && hasFormMode && !listEnabled && formEnabled) {
      const content = html.take(root).div.className('o-list-content is-form-only').getContext();
      await this.drawFormPanel(content, rows, true);
      return;
    }
    if (activeView.id === 'card') {
      const card = new CardView(
        `card-view-${this.id}`,
        { rows },
        {
          view: activeView,
          rowKey: this.options.rowKey,
          openAction: this.options.openAction || this.options.doubleClickAction,
        },
      );
      card.parent = this;
      card._transport = this._transport;
      this.children.push(card);
      const content = html.take(root).div.className('o-list-content').getContext();
      const cardHost = html.take(content).div.className('o-list-card-host').getContext();
      card.mount(cardHost);
      return;
    }
    if (activeView.id === 'kanban') {
      const mobileNavigation = this.isSmallScreen();
      const kanban = new KanbanView(
        `kanban-view-${this.id}`,
        { rows },
        {
          view: activeView,
          rowKey: this.options.rowKey,
          openAction: this.options.openAction || this.options.doubleClickAction,
          doubleClickAction: mobileNavigation ? undefined : this.options.doubleClickAction,
          onSelect: !mobileNavigation && this.options.formView ? row => this.selectFormRow(row) : undefined,
          onMove: this.options.onKanbanMove,
          onAddStatus: this.options.onKanbanAddStatus,
        },
      );
      kanban.parent = this;
      kanban._transport = this._transport;
      this.children.push(kanban);
      const content = html.take(root).div.className('o-list-content').getContext();
      const kanbanHost = html.take(content).div.className('o-list-kanban-host').getContext();
      kanban.mount(kanbanHost);
      if (formEnabled && this.options.formView?.sidePanel && (this.formRow(rows) || this.state.formRowId === '__new__') && this.state.formPanelClosed !== true) {
        await this.drawFormPanel(content, rows, false);
      }
      return;
    }
    if (activeView.id === 'calendar') {
      const mobileNavigation = this.isSmallScreen();
      const calendar = new CalendarView(
        `calendar-view-${this.id}`,
        { rows },
        {
          view: activeView,
          rowKey: this.options.rowKey,
          openAction: this.options.openAction || this.options.doubleClickAction,
          doubleClickAction: mobileNavigation ? undefined : this.options.doubleClickAction,
          onSelect: !mobileNavigation && this.options.formView ? row => this.selectFormRow(row) : undefined,
        },
      );
      calendar.parent = this;
      calendar._transport = this._transport;
      this.children.push(calendar);
      const content = html.take(root).div.className('o-list-content').getContext();
      const calendarHost = html.take(content).div.className('o-list-calendar-host').getContext();
      calendar.mount(calendarHost);
      if (formEnabled && this.options.formView?.sidePanel && (this.formRow(rows) || this.state.formRowId === '__new__') && this.state.formPanelClosed !== true) {
        await this.drawFormPanel(content, rows, false);
      }
      return;
    }
    if (activeView.id === 'pivot' || activeView.id === 'graph' || activeView.id === 'map') {
      const content = html.take(root).div.className('o-list-content').getContext();
      const host = html.take(content).div.className(`o-list-${activeView.id}-host`).getContext();
      const options = {
        view: activeView as AnalyticsViewMode,
        openAction: this.options.openAction,
        rowKey: this.options.rowKey,
        ...(activeView.id === 'pivot' ? { pivotColumns: (this.state.meta as any)?.pivotColumns } : {}),
      };
      const View = activeView.id === 'pivot' ? PivotView : activeView.id === 'graph' ? GraphView : MapView;
      const child = new View(`${activeView.id}-view-${this.id}`, { rows }, {
        ...options,
        ...(activeView.id === 'pivot' ? { onChange: this.options.onPivotChange } : {}),
      } as any);
      child.parent = this; child._transport = this._transport; this.children.push(child); child.mount(host);
      return;
    }

    const content = html.take(root).div.className('o-list-content').getContext();
    const viewport = html.take(content).div.className('o-list-table-viewport').getContext();
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
    const groupBy = typeof this.state.groupBy === 'string' ? this.state.groupBy : '';
    if (!rows.length) {
      const empty = this.options.emptyState || {};
      const cell = html.take(body).trow.tdata
        .attr('colspan', String(visibleColumns.length + (this.options.selectable ? 1 : 0)))
        .className('o-list-empty')
        .getContext();
      html.take(cell).h3.text(empty.title || 'No records found');
      if (empty.description) html.take(cell).p.text(empty.description);
    } else if (groupBy) {
      const groups = new Map<string, ListRow[]>();
      for (const row of rows) {
        const value = String(row[groupBy] ?? '—');
        const group = groups.get(value) || [];
        group.push(row);
        groups.set(value, group);
      }
      const groupLabel = this.options.groupBy?.find(group => group.field === groupBy)?.label || groupBy;
      for (const [value, groupRows] of groups) {
        const groupRow = html.take(body).trow.className('o-list-group-header o-list-group-row').dataAttr('list-group', value).getContext();
        const groupCell = html.take(groupRow).tdata.attr('colspan', String(visibleColumns.length + (this.options.selectable ? 1 : 0))).getContext();
        groupCell.dataset.groupBy = groupBy;
        const heading = document.createElement('strong');
        heading.textContent = `${groupLabel}: ${value}`;
        groupCell.append(heading);
        html.take(groupCell).span.className('o-list-group-count').text(` (${groupRows.length})`);
        groupRows.forEach((row, index) => this.drawRow(body, row, index, visibleColumns, selected, labels));
      }
    } else {
      const rowItems = this.treeRows(rows);
      const groupBy = String(this.state.groupBy || '');
      if (!groupBy) {
        for (const item of rowItems) this.drawRow(body, item.row, item.index, visibleColumns, selected, labels, item.depth, item.hasChildren);
      } else {
        const groups = new Map<string, typeof rowItems>();
        for (const item of rowItems) {
          const value = String(item.row[groupBy] ?? '—');
          if (!groups.has(value)) groups.set(value, []);
          groups.get(value)!.push(item);
        }
        for (const [value, items] of groups) {
          const groupRow = html.take(body).trow.className('o-list-group-row').dataAttr('list-group', value).getContext();
          const groupCell = html.take(groupRow).tdata.attr('colspan', String(visibleColumns.length + (this.options.selectable ? 1 : 0))).getContext();
          groupCell.textContent = `${value} (${items.length})`;
          for (const item of items) this.drawRow(body, item.row, item.index, visibleColumns, selected, labels, item.depth, item.hasChildren);
        }
      }
    }
    if (formEnabled && this.options.formView?.sidePanel && (rows.length || this.state.formRowId === '__new__') && this.state.formPanelClosed !== true) {
      await this.drawFormPanel(content, rows, false);
    }
  }

  private async drawFormPanel(content: HTMLElement, rows: ListRow[], formOnly: boolean) {
    const selectedRow = this.state.formRowId === '__new__'
      ? { id: '', __new_record: true }
      : this.formRow(rows) || (rows.length ? rows[0] : undefined);
    if (!selectedRow || !this.options.renderForm) return;
    const panel = html.take(content).aside.className('o-list-form-side-panel is-loading').getContext();
    const width = Number(this.state.formPanelWidth);
    if (Number.isFinite(width) && width > 0) panel.style.width = `${Math.min(75, Math.max(25, width))}%`;
    const handle = html.take(panel).div.className('o-list-form-resize-handle').attr('role', 'separator').attr('aria-label', 'Resize form panel').getContext();
    const collapseButton = html.take(panel).button.className('o-list-form-collapse').attr('type', 'button').getContext();
    collapseButton.setAttribute('aria-label', 'Close form');
    collapseButton.setAttribute('title', 'Close form');
    appendIcon(collapseButton, 'x');
    let dragging = false;
    let draggedWidth: number | undefined;
    const updateWidth = (event: PointerEvent) => {
      if (!dragging) return;
      const bounds = content.getBoundingClientRect();
      if (!bounds.width) return;
      const next = Math.min(75, Math.max(25, ((bounds.right - event.clientX) / bounds.width) * 100));
      draggedWidth = next;
      panel.style.width = `${next}%`;
    };
    handle.addEventListener('pointerdown', (event: PointerEvent) => {
      dragging = true;
      draggedWidth = undefined;
      panel.classList.add('is-resizing');
      handle.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    handle.addEventListener('pointermove', updateWidth);
    handle.addEventListener('pointerup', (event: PointerEvent) => {
      dragging = false;
      panel.classList.remove('is-resizing');
      if (draggedWidth !== undefined) this.setState({ formPanelWidth: draggedWidth }, false);
      handle.releasePointerCapture?.(event.pointerId);
    });
    const body = html.take(panel).div.className('o-list-form-panel-body').getContext();
    collapseButton.addEventListener('click', () => {
      this.setState({ formPanelClosed: true });
    });
    await this.options.renderForm(selectedRow, body);
    if (panel.isConnected) panel.classList.remove('is-loading');
  }

  private drawPrimaryControls(container: HTMLElement, labels: Required<NonNullable<ListViewOptions['labels']>>) {
    const primary = html.take(container).div.className('o-list-primary-controls').getContext();
    if (this.options.createAction) {
      const button = html.take(primary).button.className('o-list-create').dataAttr('list-create', this.options.createAction.id).text(this.options.createAction.label || labels.new).getContext();
      button.addEventListener('click', () => {
        if (this.options.formView?.sidePanel) {
          this.setState({ formRowId: '__new__', formPanelClosed: false });
          return;
        }
        void this.submit(this.options.createAction!.id);
      });
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
      for (const action of this.options.bulkActions || []) {
        const button = html.take(selection).button.className('o-list-bulk-action').dataAttr('list-bulk-action', action.id).text(action.label || action.id).getContext();
        button.addEventListener('click', () => void this.submit(action.id, { ...(action.params || {}), selectedIds }));
      }
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
    if (!this.options.filters?.length && !this.options.dateRange && !this.options.groupBy?.length) return;
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
    if (this.options.groupBy?.length) {
      const group = html.take(menu).section.className('o-list-filter-group').getContext();
      html.take(group).h4.text('Group By');
      const clear = html.take(group).button.className(!this.state.groupBy ? 'is-active' : '').text('No grouping').getContext();
      clear.dataset.groupBy = '';
      clear.addEventListener('click', () => this.setGroupBy(null));
      for (const option of this.options.groupBy) {
        const button = html.take(group).button.className(this.state.groupBy === option.field ? 'is-active' : '').text(option.label).getContext();
        button.dataset.groupBy = option.field;
        button.dataset.groupField = option.field;
        button.addEventListener('click', () => this.setGroupBy(option.field));
      }
    }
    this.dismissDetails(details);
  }

  private drawNavigation(container: HTMLElement, meta: Record<string, unknown>, visibleColumnIds: Set<string>, labels: Required<NonNullable<ListViewOptions['labels']>>, showPager = true) {
    const navigation = html.take(container).div.className('o-list-navigation').getContext();
    if (showPager) {
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
    }

    const views = this.options.views || [];
    if (views.length > 1 && this.options.viewNavigation !== 'tabs') {
      const switcher = html.take(navigation).div.className('o-list-view-switcher').attr('role', 'group').attr('aria-label', 'View').getContext();
      const activeView = this.activeView();
      for (const view of views) {
        const mobileCardView = views.some(candidate => candidate.id === 'card');
        const button = html.take(switcher).button
          .className(`${this.isViewEnabled(view.id) ? 'is-active ' : ''}${view.id === 'card' ? 'o-list-view-mobile-only' : ''}${view.id === 'form' ? 'o-list-view-form-only' : ''}${view.id === 'list' && mobileCardView ? 'o-list-view-desktop-only' : ''}`)
          .dataAttr('list-view', view.id)
          .attr('aria-label', view.label)
          .attr('title', view.label)
          .getContext();
        appendIcon(button, view.icon || (view.id === 'kanban' ? 'dashboard' : view.id === 'calendar' ? 'calendar' : 'table'));
        button.setAttribute('aria-pressed', String(this.isViewEnabled(view.id)));
        button.addEventListener('click', () => this.selectView(view.id));
      }
    }

    if (!this.options.columnChooser && !this.options.actions?.length && !this.options.favorites?.length) return;
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
    if (this.options.favorites?.length) {
      const group = html.take(menu).section.className('o-list-favorites-menu').getContext();
      html.take(group).h4.text('Favorites');
      for (const favorite of this.options.favorites) {
        const button = html.take(group).button.dataAttr('list-favorite', favorite.id).text(favorite.label).getContext();
        button.addEventListener('click', () => {
          this.setState({ filters: { ...(favorite.filters || {}) }, groupBy: favorite.groupBy || '' });
          this.options.onFilterChange?.({ ...(favorite.filters || {}) });
          this.options.onFavoriteChange?.(favorite);
        });
      }
    }
    this.dismissDetails(details);
  }

  private drawViewTabs(container: HTMLElement) {
    // FormView is an inline/detail presentation, not a collection view tab.
    const views = (this.options.views || []).filter(view => view.id !== 'form');
    if (views.length <= 1) return;
    const tabList = html.take(container).nav.className('o-list-view-tabs').attr('role', 'tablist').attr('aria-label', 'View').getContext();
    for (const view of views) {
      const tab = html.take(tabList).button
        .className(this.isViewEnabled(view.id) ? 'is-active' : '')
        .attr('type', 'button')
        .attr('role', 'tab')
        .attr('aria-label', view.label)
        .attr('aria-selected', String(this.isViewEnabled(view.id)))
        .dataAttr('list-view', view.id)
        .text(view.label)
        .getContext();
      tab.addEventListener('click', () => this.selectView(view.id));
    }
  }

  private selectView(viewId: string) {
    if (viewId === 'form' && this.options.formView) {
      this.setState({ formPanelClosed: this.state.formPanelClosed !== true });
      return;
    }
    const activeView = this.activeView();
    if (viewId === 'form' || (viewId === 'list' && this.options.formView && (activeView.id === 'list' || activeView.id === 'form'))) {
      const key = viewId === 'list' ? 'listViewEnabled' : 'formViewEnabled';
      const enabled = this.isViewEnabled(viewId);
      const other = viewId === 'list' ? 'form' : 'list';
      if (enabled && this.isViewEnabled(other)) this.setState({ [key]: false });
      else if (!enabled) this.setState({ [key]: true });
      return;
    }
    this.setState({ activeView: viewId });
    this.options.onViewChange?.(viewId as 'list' | 'kanban' | 'calendar' | 'card');
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
    if (this.state.groupBy) {
      const group = this.options.groupBy?.find(option => option.field === this.state.groupBy);
      if (group) facets.push({ key: 'groupBy', label: `Group By: ${group.label}`, clear: () => this.setGroupBy(null) });
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

  private drawRow(container: HTMLElement, row: ListRow, index: number, columns: ListViewColumn[], selected: Set<string>, labels: Required<NonNullable<ListViewOptions['labels']>>, depth = 0, hasChildren = false) {
    const id = this.rowId(row, index);
    const tr = html.take(container).trow.className('o-list-data-row').dataAttr('row-id', id).getContext();
    let openClickTimer: ReturnType<typeof setTimeout> | undefined;
    const openRow = (action: string) => void this.submit(action, { row });
    tr.addEventListener('click', (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest('button,input,a,summary,details,select')) return;
      if (this.options.formView) {
        if (openClickTimer) clearTimeout(openClickTimer);
        openClickTimer = setTimeout(() => {
          openClickTimer = undefined;
          this.setState({ formRowId: id }, false);
          if (this.options.formView?.sidePanel) this.redraw();
        }, 250);
        return;
      }
      if (!this.options.openAction) return;
      if (!this.options.doubleClickAction) {
        openRow(this.options.openAction);
        return;
      }
      if (openClickTimer) clearTimeout(openClickTimer);
      openClickTimer = setTimeout(() => {
        openClickTimer = undefined;
        openRow(this.options.openAction!);
      }, 250);
    });
    tr.addEventListener('dblclick', (event: MouseEvent) => {
      if (!this.options.doubleClickAction || (event.target as Element | null)?.closest('button,input,a,summary,details,select')) return;
      if (openClickTimer) clearTimeout(openClickTimer);
      openClickTimer = undefined;
      openRow(this.options.doubleClickAction);
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
      if (columnIndex === 0 && this.options.formView) {
        cell.classList.add('o-list-open-cell');
        cell.tabIndex = 0;
        cell.setAttribute('role', 'button');
        cell.addEventListener('keydown', (event: KeyboardEvent) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          this.setState({ formRowId: id }, false);
          if (this.options.formView?.sidePanel) this.redraw();
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
      if (this.options.tree && columnIndex === 0) {
        cell.style.paddingLeft = `${16 + depth * 20}px`;
        cell.dataset.treeDepth = String(depth);
        if (hasChildren) {
          const collapsed = this.collapsedTreeIds().has(id);
          const toggle = document.createElement('button');
          toggle.type = 'button';
          toggle.className = 'o-list-tree-toggle';
          toggle.textContent = collapsed ? '▸' : '▾';
          toggle.setAttribute('aria-label', collapsed ? 'Expand row' : 'Collapse row');
          toggle.addEventListener('click', event => {
            event.stopPropagation();
            const next = this.collapsedTreeIds();
            collapsed ? next.delete(id) : next.add(id);
            this.setState({ collapsedTreeIds: [...next] });
          });
          cell.prepend(toggle);
        }
      }
    });

  }

  private treeRows(rows: ListRow[]) {
    if (!this.options.tree) return rows.map((row, index) => ({ row, index, depth: 0, hasChildren: false }));
    const parentField = this.options.tree.parentField || 'parent_id';
    const ids = new Set(rows.map((row, index) => this.rowId(row, index)));
    const children = new Map<string, string[]>();
    rows.forEach((row, index) => {
      const parent = String(row[parentField] ?? '');
      if (!children.has(parent)) children.set(parent, []);
      children.get(parent)!.push(this.rowId(row, index));
    });
    const collapsed = this.collapsedTreeIds();
    const result: Array<{ row: ListRow; index: number; depth: number; hasChildren: boolean }> = [];
    const visit = (row: ListRow, index: number, depth: number) => {
      const id = this.rowId(row, index);
      const childIds = (children.get(id) || []).filter(childId => ids.has(childId));
      result.push({ row, index, depth, hasChildren: childIds.length > 0 });
      if (collapsed.has(id)) return;
      for (const childId of childIds) {
        const childIndex = rows.findIndex((candidate, candidateIndex) => this.rowId(candidate, candidateIndex) === childId);
        if (childIndex >= 0) visit(rows[childIndex], childIndex, depth + 1);
      }
    };
    rows.forEach((row, index) => {
      const parent = String(row[parentField] ?? '');
      if (!parent || !ids.has(parent)) visit(row, index, 0);
    });
    return result;
  }

  private collapsedTreeIds() {
    return new Set<string>(Array.isArray(this.state.collapsedTreeIds) ? this.state.collapsedTreeIds.map(String) : []);
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
    if (this.isSmallScreen()) {
      const cardView = views.find(view => view.id === 'card');
      if (this.state.activeView === undefined || this.state.activeView === 'form') {
        if (cardView) return cardView;
        const nonFormView = views.find(view => view.id !== 'form');
        if (nonFormView) return nonFormView;
      }
    }
    return views.find(view => view.id === this.state.activeView) || views[0] || { id: 'list', label: 'List' };
  }

  private isSmallScreen() {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 768px)').matches;
  }

  private formRow(rows: ListRow[]) {
    const selectedId = String(this.state.formRowId || '');
    return rows.find((row, index) => this.rowId(row, index) === selectedId);
  }

  private isViewEnabled(viewId: string) {
    const hasFormMode = (this.options.views || []).some(view => view.id === 'form');
    if (viewId === 'form') return hasFormMode
      && Boolean(this.options.formView)
      && this.activeView().id !== 'card'
      && this.state.formViewEnabled !== false
      && this.state.formPanelClosed !== true;
    if (viewId === 'list') {
      if (hasFormMode && this.options.formView && ['list', 'form'].includes(this.activeView().id)) {
        return this.state.listViewEnabled !== false;
      }
      return this.activeView().id === viewId;
    }
    return this.activeView().id === viewId;
  }


  private selectedIds(): string[] {
    return Array.isArray(this.state.selectedIds) ? this.state.selectedIds.map(String) : [];
  }

  private setSelectedIds(selectedIds: string[]) {
    this.setState({ selectedIds });
    this.options.onSelectionChange?.(selectedIds);
  }

  private selectFormRow(row: ListRow) {
    const rows = Array.isArray(this.state.rows) ? this.state.rows as ListRow[] : [];
    this.setState({ formRowId: this.rowId(row, Math.max(0, rows.indexOf(row))), formPanelClosed: false }, false);
    if (this.options.formView?.sidePanel) this.redraw();
  }

  private setFilters(filters: Record<string, unknown>) {
    this.setState({ filters });
    this.options.onFilterChange?.(filters);
  }

  private setGroupBy(field: string | null) {
    this.setState({ groupBy: field || undefined });
    this.options.onGroupByChange?.(field);
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

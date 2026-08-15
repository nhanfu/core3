import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendBadge } from '@core3/client/components/helpers';
import { appendIcon } from '@core3/client/components/Icon';
import { KanbanView, type KanbanViewDefinition } from '@core3/client/components/KanbanView';
import { CalendarView, type CalendarViewDefinition } from '@core3/client/components/CalendarView';
import { CardView, type CardViewDefinition } from '@core3/client/components/CardView';
import { PivotView, type PivotViewDefinition } from '@core3/client/components/PivotView';
import { GraphView, type GraphViewDefinition } from '@core3/client/components/GraphView';
import { MapView, type MapViewDefinition } from '@core3/client/components/MapView';
import { DateRangeFilterTag } from '@core3/client/components/DateRangeFilterTag';

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
  scroll?: 'list' | 'body';
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
    maxYears?: number;
    denyUnbounded?: boolean;
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
  onFormStateChange?: (state: { mode: 'right' | 'hidden'; rowId?: string }) => void;
  rowActions?: 'buttons' | 'menu';
  views?: ListViewMode[];
  viewNavigation?: 'icons' | 'tabs';
  onKanbanMove?: (row: ListRow, status: string) => Promise<void> | void;
  onKanbanAddStatus?: (label: string, fromStates: string[], toStates: string[]) => Promise<void> | void;
  onKanbanEditStatus?: (stateId: string, label: string, fromStates: string[], toStates: string[]) => Promise<void> | void;
  onKanbanDeleteStatus?: (stateId: string, replacementState: string) => Promise<void> | void;
  kanbanTransitions?: Array<{ from: string | string[]; to: string }>;
  kanbanStateEditor?: Record<string, any>;
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
  private dismissCleanup: Array<() => void> = [];
  private drawVersion = 0;

  constructor(id: string, state: Record<string, unknown> = {}, defs: ListViewColumn[] = [], options: ListViewOptions = {}) {
    super(id, state);
    this.defs = defs;
    this.options = options;
  }

  draw(container: HTMLElement) {
    for (const cleanup of this.dismissCleanup) cleanup();
    this.dismissCleanup = [];
    for (const child of this.children) child.dispose();
    this.children = [];
    if (this.options.variant !== 'odoo') {
      this.drawCards(container);
      return;
    }
    const version = ++this.drawVersion;
    void this.drawOdoo(container, version);
  }

  private drawCards(container: HTMLElement) {
    const { items = [], loading = false } = this.state as { items?: ListRow[]; loading?: boolean };

    if (loading) {
      for (let i = 0; i < 3; i++) {
        const card = html.take(container).div.className('bg-white rounded-lg border border-gray-200 p-4 space-y-2 animate-pulse').ele();
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
    const list = html.take(container).div.className('flex flex-col gap-2').ele();

    for (const item of items) {
      const row = html.take(list).div.className('bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-300 transition-colors cursor-pointer').div.className('flex items-start justify-between gap-3').ele();
      const textCol = html.take(row).div.ele();
      if (primaryDef) html.take(textCol).p.className('text-sm font-medium text-gray-900').text(String(item[primaryDef.field] ?? ''));
      if (secondaryDef) html.take(textCol).p.className('text-xs text-gray-500 mt-0.5').text(String(item[secondaryDef.field] ?? ''));
      if (badgeDef) appendBadge(row, item[badgeDef.field], null);
    }
  }

  private async drawOdoo(container: HTMLElement, version: number) {
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
    const root = html.take(container).section.className(`o-list-view${this.options.scroll === 'body' ? ' o-list-view-body-scroll' : ''}`).ele();

    if (this.options.viewNavigation === 'tabs') this.drawViewTabs(root);

    const controlPanel = html.take(root).div.className('o-list-control-panel').ele();
    const main = html.take(controlPanel).div.className('o-list-control-main').ele();
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
      const content = html.take(root).div.className('o-list-content is-form-only').ele();
      await this.drawFormPanel(content, rows, true);
      if (version !== this.drawVersion) return;
      return;
    }
    if (activeView.id === 'card') {
      const card = new CardView(
        `card-view-${this.id}`,
        { rows, groupBy: typeof this.state.groupBy === 'string' ? this.state.groupBy : undefined },
        {
          view: activeView,
          rowKey: this.options.rowKey,
          openAction: this.options.openAction || this.options.doubleClickAction,
        },
      );
      card.parent = this;
      card._transport = this._transport;
      this.children.push(card);
      const content = html.take(root).div.className('o-list-content').ele();
      const cardHost = html.take(content).div.className('o-list-card-host').ele();
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
          onEditStatus: this.options.onKanbanEditStatus,
          onDeleteStatus: this.options.onKanbanDeleteStatus,
          transitions: this.options.kanbanTransitions,
          stateEditor: this.options.kanbanStateEditor,
        },
      );
      kanban.parent = this;
      kanban._transport = this._transport;
      this.children.push(kanban);
      const content = html.take(root).div.className('o-list-content').ele();
      const kanbanHost = html.take(content).div.className('o-list-kanban-host').ele();
      kanban.mount(kanbanHost);
      if (formEnabled && this.options.formView?.sidePanel && this.formPanelMode() !== 'hidden' && (this.formRow(rows) || this.state.formRowId === '__new__')) {
        await this.drawFormPanel(content, rows, false);
        if (version !== this.drawVersion) return;
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
      const content = html.take(root).div.className('o-list-content').ele();
      const calendarHost = html.take(content).div.className('o-list-calendar-host').ele();
      calendar.mount(calendarHost);
      if (formEnabled && this.options.formView?.sidePanel && this.formPanelMode() !== 'hidden' && (this.formRow(rows) || this.state.formRowId === '__new__')) {
        await this.drawFormPanel(content, rows, false);
        if (version !== this.drawVersion) return;
      }
      return;
    }
    if (activeView.id === 'pivot' || activeView.id === 'graph' || activeView.id === 'map') {
      const content = html.take(root).div.className('o-list-content').ele();
      const host = html.take(content).div.className(`o-list-${activeView.id}-host`).ele();
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

    const content = html.take(root).div.className('o-list-content').ele();
    const viewport = html.take(content).div.className('o-list-table-viewport').ele();
    const table = html.take(viewport).table.className('o-list-table').ele();
    const headRow = html.take(table).thead.trow.ele();

    if (this.options.selectable) {
      const cell = html.take(headRow).th.className('o-list-selector').ele();
      const checkbox = html.take(cell).input.attr('type', 'checkbox').ele() as HTMLInputElement;
      html.take(checkbox).attr('aria-label', labels.selectAll).prop('checked', rows.length > 0 && rows.every((row, index) => selected.has(this.rowId(row, index)))).prop('indeterminate', selected.size > 0 && !checkbox.checked).event('change', () => this.setSelectedIds(checkbox.checked ? rows.map((row, index) => this.rowId(row, index)) : []));
    }

    const sort = this.state.sort as { field?: string; direction?: SortDirection } | undefined;
    for (const column of visibleColumns) {
      const align = column.align === 'right' ? 'is-right' : column.align === 'center' ? 'is-center' : '';
      const th = html.take(headRow).th.className(`o-list-column ${align}`).ele();
      th.dataset.column = column.id || column.field;
      if (column.sortable === false || column.rowActions?.length) {
        html.take(th).replaceText(column.label);
        continue;
      }
      const active = sort?.field === column.field;
      const button = html.take(th).button.className('o-list-sort').dataAttr('sort-field', column.field).ele();
      html.take(button).text(column.label);
      const indicator = html.take(button).span.className('o-list-sort-indicator').ele();
      const ascending = html.take(indicator).span.className(`o-list-sort-ascending${active && sort?.direction === 'asc' ? ' is-active' : ''}`).ele();
      appendIcon(ascending, 'sort-ascending');
      const descending = html.take(indicator).span.className(`o-list-sort-descending${active && sort?.direction === 'desc' ? ' is-active' : ''}`).ele();
      appendIcon(descending, 'sort-descending');
      html.take(button).attr('aria-sort', active ? (sort?.direction === 'desc' ? 'descending' : 'ascending') : 'none').event('click', () => this.setSort(column.field));
    }

    const body = html.take(table).tbody.ele();
    const groupBy = typeof this.state.groupBy === 'string' ? this.state.groupBy : '';
    if (!rows.length) {
      const empty = this.options.emptyState || {};
      const cell = html.take(body).trow.tdata
        .attr('colspan', String(visibleColumns.length + (this.options.selectable ? 1 : 0)))
        .className('o-list-empty')
        .ele();
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
        const groupRow = html.take(body).trow.className('o-list-group-header o-list-group-row').dataAttr('list-group', value).ele();
        const groupCell = html.take(groupRow).tdata.attr('colspan', String(visibleColumns.length + (this.options.selectable ? 1 : 0))).ele();
        groupCell.dataset.groupBy = groupBy;
        html.take(groupCell).strong.replaceText(`${groupLabel}: ${value}`);
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
          const groupRow = html.take(body).trow.className('o-list-group-row').dataAttr('list-group', value).ele();
          const groupCell = html.take(groupRow).tdata.attr('colspan', String(visibleColumns.length + (this.options.selectable ? 1 : 0))).ele();
          html.take(groupCell).replaceText(`${value} (${items.length})`);
          for (const item of items) this.drawRow(body, item.row, item.index, visibleColumns, selected, labels, item.depth, item.hasChildren);
        }
      }
    }
    if (formEnabled && this.options.formView?.sidePanel && this.formPanelMode() !== 'hidden' && (rows.length || this.state.formRowId === '__new__')) {
      await this.drawFormPanel(content, rows, false);
      if (version !== this.drawVersion) return;
    }
  }

  private async drawFormPanel(content: HTMLElement, rows: ListRow[], formOnly: boolean) {
    const selectedRow = this.state.formRowId === '__new__'
      ? { id: '', __new_record: true }
      : this.formRow(rows) || (rows.length ? rows[0] : undefined);
    if (!selectedRow || !this.options.renderForm) return;
    const mode = this.formPanelMode();
    const panel = html.take(content).aside.className(`o-list-form-side-panel is-${mode} is-loading`).ele();
    const width = Number(this.state.formPanelWidth);
    if (Number.isFinite(width) && width > 0) html.take(panel).css('width', `${Math.min(75, Math.max(25, width))}%`);
    const handle = html.take(panel).div.className('o-list-form-resize-handle').attr('role', 'separator').attr('aria-label', 'Resize form panel').ele();
    let dragging = false;
    let draggedWidth: number | undefined;
    const updateWidth = (event: PointerEvent) => {
      if (!dragging) return;
      const bounds = content.getBoundingClientRect();
      if (!bounds.width) return;
      const next = Math.min(75, Math.max(25, ((bounds.right - event.clientX) / bounds.width) * 100));
      draggedWidth = next;
      html.take(panel).css('width', `${next}%`);
    };
    html.take(handle).event('pointerdown', (event: PointerEvent) => {
      dragging = true;
      draggedWidth = undefined;
      html.take(panel).toggleClass('is-resizing', true);
      handle.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    html.take(handle).event('pointermove', updateWidth).event('pointerup', (event: PointerEvent) => {
      dragging = false;
      html.take(panel).toggleClass('is-resizing', false);
      if (draggedWidth !== undefined) this.setState({ formPanelWidth: draggedWidth }, false);
      handle.releasePointerCapture?.(event.pointerId);
    });
    const body = html.take(panel).div.className('o-list-form-panel-body').ele();
    await this.options.renderForm(selectedRow, body);
    if (panel.isConnected) html.take(panel).toggleClass('is-loading', false);
  }

  private drawPrimaryControls(container: HTMLElement, labels: Required<NonNullable<ListViewOptions['labels']>>) {
    const primary = html.take(container).div.className('o-list-primary-controls').ele();
    if (this.options.createAction) {
      const button = html.take(primary).button.className('o-list-create').dataAttr('list-create', this.options.createAction.id).text(this.options.createAction.label || labels.new).ele();
      html.take(button).event('click', () => {
        if (this.options.formView?.sidePanel) {
          this.setFormPanelMode('right');
          this.setState({ formRowId: '__new__', formPanelClosed: false });
          this.options.onFormStateChange?.({ mode: 'right', rowId: '__new__' });
          return;
        }
        void this.submit(this.options.createAction!.id);
      });
    }
    if (this.options.breadcrumbs?.length) {
      const breadcrumbs = html.take(primary).nav.className('o-list-breadcrumbs').attr('aria-label', 'Breadcrumb').ele();
      this.options.breadcrumbs.forEach((item, index) => {
        html.take(breadcrumbs).span.className(index === this.options.breadcrumbs!.length - 1 ? 'is-current' : '').text(item);
        if (index < this.options.breadcrumbs!.length - 1) html.take(breadcrumbs).span.className('o-list-breadcrumb-separator').text(' / ');
      });
    }
  }

  private drawSearch(container: HTMLElement, filters: Record<string, unknown>, selectedIds: string[], labels: Required<NonNullable<ListViewOptions['labels']>>) {
    const center = html.take(container).div.className('o-list-center').ele();
    if (selectedIds.length) {
      const selection = html.take(center).div.className('o-list-selection').ele();
      html.take(selection).span.className('o-list-selection-count').text(String(selectedIds.length));
      html.take(selection).span.text(labels.selected);
      const clear = html.take(selection).button.text(labels.clearSelection).ele();
      html.take(clear).event('click', () => this.setSelectedIds([]));
      for (const action of this.options.bulkActions || []) {
        const button = html.take(selection).button.className('o-list-bulk-action').dataAttr('list-bulk-action', action.id).text(action.label || action.id).ele();
        html.take(button).event('click', () => void this.submit(action.id, { ...(action.params || {}), selectedIds }));
      }
      return;
    }

    if (this.options.search === false) return;
    const search = html.take(center).div.className('o-list-search').ele();
    const searchIcon = html.take(search).span.className('o-list-search-icon').ele();
    appendIcon(searchIcon, 'search');
    const input = html.take(search).input.attr('type', 'search').dataAttr('list-search', 'true').ele() as HTMLInputElement;
    html.take(input).prop('value', String(this.state.searchDraft || '')).prop('placeholder', this.options.search?.placeholder || 'Search...').attr('aria-label', this.options.search?.label || input.placeholder).event('input', () => this.setState({ searchDraft: input.value }, false)).event('keydown', event => {
      if (event.key !== 'Enter') return;
      const query = input.value.trim();
      if (!query) return;
      this.setState({ searchDraft: '' }, false);
      this.setFilters({ ...filters, q: query });
    });
    this.drawFilterMenu(search, filters, labels);
  }

  private drawFilterMenu(container: HTMLElement, filters: Record<string, unknown>, labels: Required<NonNullable<ListViewOptions['labels']>>) {
    if (!this.options.filters?.length && !this.options.groupBy?.length) return;
    const details = html.take(container).details.className('o-list-dropdown o-list-filter-menu').ele() as HTMLDetailsElement;
    const shortcutLabel = `${labels.filters} (Ctrl+Shift+F)`;
    const summary = html.take(details).summary.className('o-list-filter-toggle').attr('aria-label', labels.filters).attr('title', shortcutLabel).attr('aria-keyshortcuts', 'Control+Shift+F').ele();
    appendIcon(summary, 'chevron-down');
    const menu = html.take(details).div.className('o-list-dropdown-menu').ele();
    const positionFilterMenu = () => {
      if (!details.open) return;
      html.take(menu).css('top', '155px');
    };
    html.take(details).event('toggle', positionFilterMenu);
    html.take(window).event('resize', positionFilterMenu);
    const onFilterShortcut = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key.toLowerCase() !== 'f' || !event.shiftKey || !(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      html.take(details).prop('open', !details.open);
      if (details.open) {
        positionFilterMenu();
        const firstFilterControl = menu.querySelector<HTMLElement>('button, input');
        if (firstFilterControl) html.take(firstFilterControl).focus();
      }
    };
    html.take(window).event('keydown', onFilterShortcut);
    this.dismissCleanup.push(() => {
      html.take(window).off('resize', positionFilterMenu);
      html.take(window).off('keydown', onFilterShortcut);
    });

    for (const filter of this.options.filters || []) {
      const group = html.take(menu).section.className('o-list-filter-group').ele();
      html.take(group).h4.text(filter.label);
      const clear = html.take(group).button.className(!filters[filter.field] ? 'is-active' : '').text(filter.placeholder || `All ${filter.label.toLowerCase()}`).ele();
      html.take(clear).event('click', () => this.setFilters({ ...filters, [filter.field]: null }));
      for (const option of filter.options || []) {
        const id = typeof option === 'string' ? option : option.id;
        const label = typeof option === 'string' ? option : option.label;
        const button = html.take(group).button.className(String(filters[filter.field] ?? '') === id ? 'is-active' : '').text(label).ele();
        button.dataset.filterField = filter.field;
        button.dataset.filterValue = id;
        html.take(button).event('click', () => this.setFilters({ ...filters, [filter.field]: id }));
      }
    }

    if (this.options.groupBy?.length) {
      const group = html.take(menu).section.className('o-list-filter-group').ele();
      html.take(group).h4.text('Group By');
      const clear = html.take(group).button.className(!this.state.groupBy ? 'is-active' : '').text('No grouping').ele();
      clear.dataset.groupBy = '';
      html.take(clear).event('click', () => this.setGroupBy(null));
      for (const option of this.options.groupBy) {
        const button = html.take(group).button.className(this.state.groupBy === option.field ? 'is-active' : '').text(option.label).ele();
        button.dataset.groupBy = option.field;
        button.dataset.groupField = option.field;
        html.take(button).event('click', () => this.setGroupBy(option.field));
      }
    }
    this.dismissDetails(details);
  }

  private drawNavigation(container: HTMLElement, meta: Record<string, unknown>, visibleColumnIds: Set<string>, labels: Required<NonNullable<ListViewOptions['labels']>>, showPager = true) {
    const navigation = html.take(container).div.className('o-list-navigation').ele();
    if (showPager) {
      const total = Number(meta.total || 0);
      const page = Math.max(1, Number(meta.page || 1));
      const pageSize = Math.max(1, Number(meta.pageSize || this.state.pageSize || 1));
      const start = total ? (page - 1) * pageSize + 1 : 0;
      const end = Math.min(page * pageSize, total);
      const pager = html.take(navigation).div.className('o-list-pager').ele();
      html.take(pager).span.className('o-list-pager-range').text(`${start}-${end} / ${total}`);
      const previous = html.take(pager).button.text('‹').ele() as HTMLButtonElement;
      html.take(previous).attr('aria-label', labels.previousPage).prop('disabled', page <= 1);
      if (!previous.disabled) html.take(previous).event('click', () => this.options.onPageChange?.(page - 1));
      const next = html.take(pager).button.text('›').ele() as HTMLButtonElement;
      html.take(next).attr('aria-label', labels.nextPage).prop('disabled', end >= total);
      if (!next.disabled) html.take(next).event('click', () => this.options.onPageChange?.(page + 1));
    }

    if (this.options.formView?.sidePanel) {
      const mode = this.formPanelMode();
      const modeLabels = {
        right: 'Right FormView panel',
        hidden: 'Hidden FormView panel',
      } as const;
      const modeIcons = { right: 'panel', hidden: 'eye-off' } as const;
      const toggle = html.take(navigation).button
        .className(`o-list-form-mode-toggle is-${mode}`)
        .attr('type', 'button')
        .attr('aria-label', modeLabels[mode])
        .attr('title', `${modeLabels[mode]} (click to change)`)
        .dataAttr('form-panel-mode', mode)
        .ele() as HTMLButtonElement;
      appendIcon(toggle, modeIcons[mode]);
      html.take(toggle).event('click', () => this.cycleFormPanelMode());
    }

    const views = this.options.views || [];
    if (views.length > 1 && this.options.viewNavigation !== 'tabs') {
      const switcher = html.take(navigation).div.className('o-list-view-switcher').attr('role', 'group').attr('aria-label', 'View').ele();
      const activeView = this.activeView();
      for (const view of views) {
        const mobileCardView = views.some(candidate => candidate.id === 'card');
        const button = html.take(switcher).button
          .className(`${this.isViewEnabled(view.id) ? 'is-active ' : ''}${view.id === 'card' ? 'o-list-view-mobile-only' : ''}${view.id === 'form' ? 'o-list-view-form-only' : ''}${view.id === 'list' && mobileCardView ? 'o-list-view-desktop-only' : ''}`)
          .dataAttr('list-view', view.id)
          .attr('aria-label', view.label)
          .attr('title', view.label)
          .ele();
        appendIcon(button, view.icon || (view.id === 'kanban' ? 'dashboard' : view.id === 'calendar' ? 'calendar' : 'table'));
        html.take(button).attr('aria-pressed', String(this.isViewEnabled(view.id))).event('click', () => this.selectView(view.id));
      }
    }

    if (!this.options.columnChooser && !this.options.actions?.length && !this.options.favorites?.length) return;
    const details = html.take(navigation).details.className('o-list-dropdown o-list-cog-menu').ele() as HTMLDetailsElement;
    const summary = html.take(details).summary.attr('aria-label', labels.columns).attr('title', labels.columns).ele();
    appendIcon(summary, 'settings');
    const menu = html.take(details).div.className('o-list-dropdown-menu').ele();
    if (this.options.columnChooser) {
      const group = html.take(menu).section.className('o-list-column-menu').ele();
      html.take(group).h4.text(labels.columns);
      for (const column of this.defs.filter(candidate => !candidate.rowActions?.length)) {
        const label = html.take(group).label.ele();
        const checkbox = html.take(label).input.attr('type', 'checkbox').ele() as HTMLInputElement;
        html.take(checkbox).prop('checked', visibleColumnIds.has(column.id || column.field)).attr('aria-label', `${labels.columns}: ${column.label}`).event('change', () => {
          const nextVisible = new Set(visibleColumnIds);
          checkbox.checked ? nextVisible.add(column.id || column.field) : nextVisible.delete(column.id || column.field);
          if (!nextVisible.size) {
            html.take(checkbox).prop('checked', true);
            return;
          }
          this.setState({ visibleColumns: [...nextVisible] });
        });
        html.take(label).text(column.label);
      }
    }
    if (this.options.actions?.length) {
      const group = html.take(menu).section.className('o-list-utility-menu').ele();
      for (const action of this.options.actions) {
        const button = html.take(group).button.dataAttr('list-action', action.id).ele() as HTMLButtonElement;
        if (action.icon) {
          const icon = html.take(button).span.ele();
          appendIcon(icon, action.icon);
        }
        html.take(button).text(action.label || action.title || action.id).prop('disabled', Boolean(action.disabled));
        if (!button.disabled) html.take(button).event('click', () => void this.submit(action.id, action.params || {}));
      }
    }
    if (this.options.favorites?.length) {
      const group = html.take(menu).section.className('o-list-favorites-menu').ele();
      html.take(group).h4.text('Favorites');
      for (const favorite of this.options.favorites) {
        const button = html.take(group).button.dataAttr('list-favorite', favorite.id).text(favorite.label).ele();
        html.take(button).event('click', () => {
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
    const tabList = html.take(container).nav.className('o-list-view-tabs').attr('role', 'tablist').attr('aria-label', 'View').ele();
    for (const view of views) {
      const tab = html.take(tabList).button
        .className(this.isViewEnabled(view.id) ? 'is-active' : '')
        .attr('type', 'button')
        .attr('role', 'tab')
        .attr('aria-label', view.label)
        .attr('aria-selected', String(this.isViewEnabled(view.id)))
        .dataAttr('list-view', view.id)
        .text(view.label)
        .ele();
      html.take(tab).event('click', () => this.selectView(view.id));
    }
  }

  private selectView(viewId: string) {
    if (viewId === 'form' && this.options.formView) {
      this.setFormPanelMode(this.formPanelMode() === 'hidden' ? 'right' : 'hidden');
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
    if (!facets.length && !this.options.dateRange) return;
    const bar = html.take(container).div.className('o-list-facets').ele();
    if (this.options.dateRange) {
      new DateRangeFilterTag({
        values: filters,
        definition: this.options.dateRange,
        onChange: values => this.setFilters({ ...filters, ...values }),
      }).render(bar);
    }
    for (const facet of facets) {
      const item = html.take(bar).div.className('o-list-facet').dataAttr('filter-facet', facet.key).ele();
      html.take(item).span.text(facet.label);
      const remove = html.take(item).button.attr('aria-label', `${labels.removeFilter}: ${facet.label}`).ele();
      appendIcon(remove, 'x');
      html.take(remove).event('click', facet.clear);
    }
  }

  private drawRow(container: HTMLElement, row: ListRow, index: number, columns: ListViewColumn[], selected: Set<string>, labels: Required<NonNullable<ListViewOptions['labels']>>, depth = 0, hasChildren = false) {
    const id = this.rowId(row, index);
    const tr = html.take(container).trow.className('o-list-data-row').dataAttr('row-id', id).ele();
    let openClickTimer: ReturnType<typeof setTimeout> | undefined;
    const openRow = (action: string) => void this.submit(action, { row });
    html.take(tr).event('click', (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest('button,input,a,summary,details,select')) return;
      if (this.options.formView?.sidePanel && this.formPanelMode() !== 'hidden') {
        this.selectFormRow(row);
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
    html.take(tr).event('dblclick', (event: MouseEvent) => {
      if (!this.options.doubleClickAction || (event.target as Element | null)?.closest('button,input,a,summary,details,select')) return;
      if (openClickTimer) clearTimeout(openClickTimer);
      openClickTimer = undefined;
      openRow(this.options.doubleClickAction);
    });
    if (this.options.selectable) {
      const cell = html.take(tr).tdata.className('o-list-selector').ele();
      const checkbox = html.take(cell).input.attr('type', 'checkbox').ele() as HTMLInputElement;
      html.take(checkbox).prop('checked', selected.has(id)).attr('aria-label', labels.selectRow(id)).event('change', () => {
        const next = new Set<string>(this.selectedIds());
        checkbox.checked ? next.add(id) : next.delete(id);
        this.setSelectedIds([...next]);
      });
    }
    columns.forEach((column, columnIndex) => {
      const align = column.align === 'right' ? 'is-right' : column.align === 'center' ? 'is-center' : '';
      const cell = html.take(tr).tdata.className(`o-list-cell ${align}`).ele();
      cell.dataset.column = column.id || column.field;
      if (columnIndex === 0 && this.options.openAction) {
        html.take(cell).toggleClass('o-list-open-cell', true);
        html.take(cell).prop('tabIndex', 0).attr('role', 'link').event('keydown', (event: KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            void this.submit(this.options.openAction!, { row });
          }
        });
      }
      if (columnIndex === 0 && this.options.formView?.sidePanel && this.formPanelMode() !== 'hidden') {
        html.take(cell).toggleClass('o-list-open-cell', true);
        html.take(cell).prop('tabIndex', 0).attr('role', 'button').event('click', (event: MouseEvent) => {
          if ((event.target as Element | null)?.closest('button,input,a,summary,details,select')) return;
          event.stopPropagation();
          this.selectFormRow(row);
        });
        html.take(cell).event('keydown', (event: KeyboardEvent) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          this.selectFormRow(row);
        });
      }
      if (column.rowActions?.length) {
        this.drawRowActions(cell, row, id, column.rowActions, labels);
      } else if (column.render) {
        column.render(cell, row[column.field], row);
      } else {
        const value = row[column.field];
        html.take(cell).replaceText(value == null || value === '' ? '—' : String(value));
      }
      if (this.options.tree && columnIndex === 0) {
        html.take(cell).css('paddingLeft', `${16 + depth * 20}px`);
        cell.dataset.treeDepth = String(depth);
        if (hasChildren) {
          const collapsed = this.collapsedTreeIds().has(id);
          const toggle = html.take(cell).button.ele();
          html.take(toggle).type('button').className('o-list-tree-toggle').replaceText(collapsed ? '▸' : '▾').attr('aria-label', collapsed ? 'Expand row' : 'Collapse row').event('click', event => {
            event.stopPropagation();
            const next = this.collapsedTreeIds();
            collapsed ? next.delete(id) : next.add(id);
            this.setState({ collapsedTreeIds: [...next] });
          });
          html.take(cell).prepend(toggle);
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
        const button = html.take(container).button.dataAttr('list-row-action', `${action.id}:${rowId}`).text(action.label).ele();
        html.take(button).event('click', (event: MouseEvent) => {
          event.stopPropagation();
          void this.submit(action.id, { row });
        });
      }
      return;
    }
    const details = html.take(container).details.className('o-list-dropdown o-list-row-menu').attr('name', `${this.id}-row-actions`).ele() as HTMLDetailsElement;
    const summary = html.take(details).summary.attr('aria-label', labels.moreActions).attr('title', labels.moreActions).ele();
    appendIcon(summary, 'more-vertical');
    const menu = html.take(details).div.className('o-list-dropdown-menu').ele();
    for (const action of visibleActions) {
      const button = html.take(menu).button.className(action.variant === 'danger' ? 'is-danger' : '').dataAttr('list-row-action', `${action.id}:${rowId}`).ele();
      if (action.icon) {
        const icon = html.take(button).span.ele();
        appendIcon(icon, action.icon);
      }
      html.take(button).text(action.label).event('click', (event: MouseEvent) => {
        event.stopPropagation();
        html.take(details).prop('open', false);
        void this.submit(action.id, { row });
      });
    }
    this.dismissDetails(details);
  }

  private dismissDetails(details: HTMLDetailsElement) {
    html.take(details).event('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        html.take(details).prop('open', false);
        const summary = details.querySelector('summary') as HTMLElement | null;
        if (summary) html.take(summary).focus();
      }
    });
    html.take(details).event('focusout', (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (next && !details.contains(next)) html.take(details).prop('open', false);
    });
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (details.open && !details.contains(event.target as Node)) html.take(details).prop('open', false);
    };
    html.take(document).event('click', closeOnOutsideClick);
    this.dismissCleanup.push(() => html.take(document).off('click', closeOnOutsideClick));
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
      && this.formPanelMode() !== 'hidden';
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
    const rowId = this.rowId(row, Math.max(0, rows.indexOf(row)));
    const mode = this.formPanelMode() === 'hidden' ? 'right' : this.formPanelMode();
    this.setState({ formRowId: rowId, formPanelMode: mode, formPanelClosed: false }, false);
    this.options.onFormStateChange?.({ mode, rowId });
    if (this.options.formView?.sidePanel) this.redraw();
  }

  private formPanelMode(): 'right' | 'hidden' {
    const mode = this.state.formPanelMode;
    if (mode === 'hidden') return 'hidden';
    return 'right';
  }

  private setFormPanelMode(mode: 'right' | 'hidden') {
    this.setState({ formPanelMode: mode, formPanelClosed: mode === 'hidden' });
    this.options.onFormStateChange?.({ mode, rowId: String(this.state.formRowId || '') || undefined });
  }

  private cycleFormPanelMode() {
    const next = this.formPanelMode() === 'hidden' ? 'right' : 'hidden';
    this.setFormPanelMode(next);
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

}

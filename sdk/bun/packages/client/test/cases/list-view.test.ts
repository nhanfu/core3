import { describe, expect, it, vi } from 'vitest';
import { ListView } from '@core3/client/components/ListView';

const rows = [
  { id: 'o1', number: 'ORD-001', customer: 'Acme', status: 'Draft' },
  { id: 'o2', number: 'ORD-002', customer: 'Beta', status: 'Approved' },
];

const columns = [
  { field: 'number', label: 'Order', sortable: true },
  { field: 'customer', label: 'Customer' },
  { field: 'status', label: 'Status', optional: 'hide' as const },
  {
    field: 'actions',
    label: '',
    sortable: false,
    rowActions: [
      { id: 'edit', label: 'Edit', visible: (row: Record<string, unknown>) => row.status === 'Draft' },
      { id: 'delete', label: 'Delete', variant: 'danger' as const },
    ],
  },
];

function create(options: Record<string, unknown> = {}, state: Record<string, unknown> = {}) {
  return new ListView('orders', {
    rows,
    meta: { total: 12, page: 1, pageSize: 2 },
    filters: {},
    ...state,
  }, columns, {
    variant: 'odoo',
    breadcrumbs: ['Management', 'Orders'],
    createAction: { id: 'create', label: 'New' },
    search: { placeholder: 'Search orders...' },
    filters: [{ field: 'status', label: 'Status', placeholder: 'All statuses', options: ['Draft', 'Approved'] }],
    groupBy: [{ field: 'status', label: 'Status' }, { field: 'customer', label: 'Customer' }],
    dateRange: { fromField: 'from_date', toField: 'to_date', label: 'Order date', presets: ['today'] },
    actions: [{ id: 'orders.export', label: 'Export', icon: 'download' }],
    selectable: true,
    columnChooser: true,
    openAction: 'view',
    rowActions: 'menu',
    kanbanStateEditor: {
      labels: { add_status: 'Add status', edit_status: 'Edit status' },
      modals: {
        add: { title: 'Add status', input: { label: 'Status name', placeholder: 'Enter a status name' }, from_label: 'Can move from', to_label: 'Can move to', confirm_label: 'Add status', cancel_label: 'Cancel' },
      },
    },
    views: [
      { id: 'list', label: 'List', icon: 'table' },
      {
        id: 'kanban', label: 'Kanban', icon: 'dashboard', groupBy: 'status',
        groups: [{ value: 'Draft', label: 'Draft' }, { value: 'Approved', label: 'Approved' }],
        card: { title: 'number', subtitle: 'customer', fields: [{ field: 'status', label: 'Status' }] },
      },
      { id: 'calendar', label: 'Calendar', icon: 'calendar', dateField: 'order_date', card: { title: 'number' } },
    ],
    ...options,
  });
}

function mount(component: ListView) {
  const container = document.createElement('div');
  component.mount(container);
  return container;
}

describe('Odoo ListView', () => {
  it('renders an integrated control panel, range pager, and optional columns', () => {
    const container = mount(create());

    expect(container.querySelector('.o-list-control-panel')).not.toBeNull();
    expect(container.querySelector('[data-list-create="create"]')?.textContent).toBe('New');
    expect(container.querySelector('.o-list-breadcrumbs')?.textContent).toContain('Management / Orders');
    expect(container.querySelector('.o-list-pager-range')?.textContent).toBe('1-2 / 12');
    expect(container.querySelector('thead')?.textContent).not.toContain('Status');
    expect(container.querySelector('[data-list-action="orders.export"] svg')).not.toBeNull();
  });

  it('renders view navigation as labeled tabs above the control panel', () => {
    const container = mount(create({ viewNavigation: 'tabs' }));
    const tabs = [...container.querySelectorAll<HTMLButtonElement>('.o-list-view-tabs [role="tab"]')];

    expect(tabs.map(tab => tab.textContent)).toEqual(['List', 'Kanban', 'Calendar']);
    expect(container.querySelector('.o-list-view-tabs')?.nextElementSibling?.className).toBe('o-list-control-panel');
    expect(container.querySelector('.o-list-view-switcher')).toBeNull();
  });

  it('keeps FormView out of the tab navigation', () => {
    const container = mount(create({
      viewNavigation: 'tabs',
      formView: { page: 'order-detail.yaml', sidePanel: true },
      views: [
        { id: 'list', label: 'List' },
        { id: 'kanban', label: 'Kanban', groupBy: 'status', card: { title: 'number' } },
        { id: 'form', label: 'Form' },
      ],
    }));

    expect(container.querySelector('.o-list-view-tabs [data-list-view="form"]')).toBeNull();
    expect(container.querySelector('.o-list-view-tabs')?.textContent).not.toContain('Form');
  });

  it('commits search and option filters as removable facets', () => {
    const onFilterChange = vi.fn();
    const component = create({ onFilterChange });
    const container = mount(component);
    const search = container.querySelector<HTMLInputElement>('[data-list-search]')!;

    search.value = 'ORD-001';
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onFilterChange).toHaveBeenLastCalledWith({ q: 'ORD-001' });
    expect(container.querySelector('[data-filter-facet="q"]')?.textContent).toContain('Search: ORD-001');

    const approved = container.querySelector<HTMLButtonElement>('[data-filter-field="status"][data-filter-value="Approved"]')!;
    approved.click();
    expect(onFilterChange).toHaveBeenLastCalledWith({ q: 'ORD-001', status: 'Approved' });
    expect(container.querySelector('[data-filter-facet="status"]')?.textContent).toContain('Status: Approved');

    container.querySelector<HTMLButtonElement>('[data-filter-facet="q"] button')!.click();
    expect(onFilterChange).toHaveBeenLastCalledWith({ q: null, status: 'Approved' });
  });

  it('supports sorting, server pagination, selection mode, and column choice', () => {
    const onSort = vi.fn();
    const onPageChange = vi.fn();
    const onSelectionChange = vi.fn();
    const component = create({ onSort, onPageChange, onSelectionChange });
    const container = mount(component);

    container.querySelector<HTMLButtonElement>('[data-sort-field="number"]')!.click();
    expect(onSort).toHaveBeenCalledWith({ field: 'number', direction: 'asc' });

    container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')!.click();
    expect(onPageChange).toHaveBeenCalledWith(2);

    const rowCheckbox = container.querySelector<HTMLInputElement>('[aria-label="Select row o1"]')!;
    rowCheckbox.checked = true;
    rowCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(['o1']);
    expect(container.querySelector('.o-list-selection')?.textContent).toContain('1selected');

    container.querySelector<HTMLButtonElement>('.o-list-selection button')!.click();
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);

    const statusColumn = container.querySelector<HTMLInputElement>('[aria-label="Columns: Status"]')!;
    statusColumn.checked = true;
    statusColumn.dispatchEvent(new Event('change', { bubbles: true }));
    expect(container.querySelector('thead')?.textContent).toContain('Status');
  });

  it('always renders both sort directions and activates the selected direction', () => {
    const container = mount(create({}, { sort: { field: 'number', direction: 'asc' } }));
    const numberSort = container.querySelector('[data-sort-field="number"]')!;

    expect(numberSort.querySelector('.o-list-sort-ascending')).not.toBeNull();
    expect(numberSort.querySelector('.o-list-sort-descending')).not.toBeNull();
    expect(numberSort.querySelector('.o-list-sort-ascending')?.className).toContain('is-active');
    expect(numberSort.querySelector('.o-list-sort-descending')?.className).not.toContain('is-active');
  });

  it('groups list rows from the search bar and exposes a removable group facet', () => {
    const onGroupByChange = vi.fn();
    const container = mount(create({ onGroupByChange }));

    container.querySelector<HTMLButtonElement>('[data-group-by="status"]')!.click();
    expect(onGroupByChange).toHaveBeenCalledWith('status');
    expect(container.querySelectorAll('.o-list-group-header')).toHaveLength(2);
    expect(container.querySelector('[data-filter-facet="groupBy"]')?.textContent).toContain('Group By: Status');

    container.querySelector<HTMLButtonElement>('[data-filter-facet="groupBy"] button')!.click();
    expect(onGroupByChange).toHaveBeenLastCalledWith(null);
    expect(container.querySelectorAll('.o-list-group-header')).toHaveLength(0);
  });

  it('closes the filter and grouping menu when clicking outside it', () => {
    const container = mount(create());
    const menu = container.querySelector<HTMLDetailsElement>('.o-list-filter-menu')!;
    menu.querySelector('summary')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(menu.open).toBe(true);

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(menu.open).toBe(false);
  });

  it('opens the filter menu with Ctrl/Cmd+Shift+F', () => {
    const container = mount(create());
    const menu = container.querySelector<HTMLDetailsElement>('.o-list-filter-menu')!;

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, shiftKey: true, bubbles: true }));

    expect(menu.open).toBe(true);
    expect(menu.querySelector('summary')?.getAttribute('aria-keyshortcuts')).toBe('Control+Shift+F');
  });

  it('supports grouping, favorite filters, and bulk actions', async () => {
    const component = create({
      groupBy: [{ field: 'status', label: 'Status' }],
      favorites: [{ id: 'approved', label: 'Approved orders', filters: { status: 'Approved' }, groupBy: 'status' }],
      bulkActions: [{ id: 'archive', label: 'Archive' }],
    });
    const submit = vi.fn().mockResolvedValue(undefined);
    component._transport = { submit };
    const container = mount(component);

    container.querySelector<HTMLButtonElement>('[data-group-field="status"]')!.click();
    expect(container.querySelector('[data-list-group="Draft"]')).not.toBeNull();
    container.querySelector<HTMLButtonElement>('[data-list-favorite="approved"]')!.click();
    expect(container.querySelector('[data-filter-facet="status"]')?.textContent).toContain('Approved');

    const rowCheckbox = container.querySelector<HTMLInputElement>('[aria-label="Select row o1"]')!;
    rowCheckbox.checked = true;
    rowCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    container.querySelector<HTMLButtonElement>('[data-list-bulk-action="archive"]')!.click();
    await Promise.resolve();
    expect(submit).toHaveBeenCalledWith('archive', { selectedIds: ['o1'] });
  });

  it('renders hierarchical rows and collapses descendants', () => {
    const component = new ListView('accounts', {
      rows: [
        { id: 'root', name: 'Root' },
        { id: 'child', parent_id: 'root', name: 'Child' },
      ],
      meta: { total: 2, page: 1, pageSize: 20 },
    }, [{ field: 'name', label: 'Name' }], { variant: 'odoo', tree: { parentField: 'parent_id' } });
    const container = mount(component);

    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(container.querySelector('[data-row-id="child"] [data-tree-depth="1"]')).not.toBeNull();
    container.querySelector<HTMLButtonElement>('[data-row-id="root"] .o-list-tree-toggle')!.click();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('notifies when the active view changes', () => {
    const onViewChange = vi.fn();
    const container = mount(create({ onViewChange }));

    container.querySelector<HTMLButtonElement>('[data-list-view="kanban"]')!.click();
    expect(onViewChange).toHaveBeenCalledWith('kanban');
    expect(container.querySelector('[data-kanban-group="Draft"]')).not.toBeNull();
  });

  it('routes CardView cards without opening the FormView side panel', () => {
    const submit = vi.fn();
    const component = create({
      formView: { page: 'order-detail.yaml', sidePanel: true },
      renderForm: () => undefined,
      openAction: undefined,
      doubleClickAction: 'view_order',
      views: [{ id: 'list', label: 'List' }, {
        id: 'card', label: 'Cards', groupBy: 'status',
        card: { title: 'number', subtitle: 'customer' },
      }],
    }, { activeView: 'card', listViewEnabled: false });
    component._transport = { submit };
    const container = mount(component);

    expect(container.querySelector('.o-list-form-side-panel')).toBeNull();
    container.querySelector<HTMLElement>('.o-card-view-item')!.click();
    expect(submit).toHaveBeenCalledWith('view_order', { row: expect.objectContaining({ id: 'o1' }) });
  });

  it('keeps the active navigation icon aligned with CardView', () => {
    const component = create({
      formView: { page: 'order-detail.yaml', sidePanel: true },
      renderForm: () => undefined,
      views: [
        { id: 'list', label: 'List' },
        { id: 'card', label: 'Cards', card: { title: 'number' } },
        { id: 'form', label: 'Form' },
      ],
    }, { activeView: 'card' });
    const container = mount(component);

    expect(container.querySelector('[data-list-view="card"]')?.className).toContain('is-active');
    expect(container.querySelector('[data-list-view="list"]')?.className).not.toContain('is-active');
    expect(container.querySelector('[data-list-view="form"]')?.className).not.toContain('is-active');
  });

  it('defaults to CardView on small screens when no view is selected', () => {
    const originalMatchMedia = window.matchMedia;
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
      value: () => ({ matches: true, media: '(max-width: 768px)' }),
    });
    try {
      const component = create({
        views: [
          { id: 'list', label: 'List' },
          { id: 'card', label: 'Cards', card: { title: 'number' } },
        ],
      });
      const container = mount(component);

      expect(container.querySelector('.o-card-view')).not.toBeNull();
      expect(container.querySelector('.o-list-table')).toBeNull();
      expect(container.querySelector('[data-list-view="list"]')?.className).toContain('o-list-view-desktop-only');
    } finally {
      Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia });
    }
  });

  it('does not render FormView alongside ListView on small screens', () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: true, media: '(max-width: 768px)' }),
    });
    try {
      const component = create({
        formView: { page: 'order-detail.yaml', sidePanel: true },
        renderForm: () => undefined,
        views: [
          { id: 'list', label: 'List' },
          { id: 'kanban', label: 'Kanban', groupBy: 'status', card: { title: 'number' } },
          { id: 'form', label: 'Form' },
        ],
      });
      const container = mount(component);

      expect(container.querySelector('.o-list-table')).not.toBeNull();
      expect(container.querySelector('.o-list-form-side-panel')).toBeNull();
      expect(container.querySelector('[data-list-view="form"]')?.className).toContain('o-list-view-form-only');
    } finally {
      Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia });
    }
  });

  it('routes Kanban and Calendar items to detail on small screens', async () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: true, media: '(max-width: 768px)' }),
    });
    try {
      for (const activeView of ['kanban', 'calendar'] as const) {
        const submit = vi.fn();
        const component = create({
          formView: { page: 'order-detail.yaml', sidePanel: true },
          renderForm: () => undefined,
          openAction: 'view_order',
        }, {
          ...(activeView === 'calendar' ? { rows: [{ ...rows[0], order_date: '2026-08-12' }] } : {}),
          activeView,
        });
        component._transport = { submit };
        const container = mount(component);
        const item = container.querySelector<HTMLElement>('[data-row-id="o1"]')!;
        item.click();
        expect(submit).toHaveBeenCalledWith('view_order', { row: expect.objectContaining({ id: 'o1' }) });
      }
    } finally {
      Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia });
    }
  });

  it('keeps the control panel mounted when Calendar changes month', () => {
    const component = create({}, { rows: [{ ...rows[0], order_date: '2026-08-12' }], activeView: 'calendar' });
    const container = mount(component);

    expect(container.querySelector('.o-list-control-panel')).not.toBeNull();
    expect(container.querySelector('[data-list-search]')).not.toBeNull();
    expect(container.querySelector('[data-list-view="calendar"] svg')).not.toBeNull();
    expect(container.querySelector('[data-list-view="list"]')?.getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('[data-list-view="calendar"]')?.getAttribute('aria-pressed')).toBe('true');

    container.querySelector<HTMLButtonElement>('[aria-label="Previous month"]')!.click();

    expect(container.querySelector('.o-list-control-panel')).not.toBeNull();
    expect(container.querySelector('[data-list-search]')).not.toBeNull();
    expect(container.querySelector('[data-list-view="calendar"] svg')).not.toBeNull();
    expect(container.querySelector('.o-calendar-title')?.textContent).toContain('July');
  });

  it('does not open FormView automatically for Kanban or Calendar', () => {
    for (const activeView of ['kanban', 'calendar'] as const) {
      const component = create({
        formView: { page: 'order-detail.yaml', sidePanel: true },
        renderForm: () => undefined,
      }, {
        activeView,
        listViewEnabled: false,
        ...(activeView === 'calendar' ? { rows: [{ ...rows[0], order_date: '2026-08-12' }] } : {}),
      });
      const container = mount(component);
      expect(container.querySelector('.o-list-form-side-panel')).toBeNull();
    }
  });

  it('opens Calendar cards in the FormView and navigates on double click', async () => {
    vi.useFakeTimers();
    try {
      const renderForm = vi.fn((row: Record<string, unknown>, target: HTMLElement) => {
        target.textContent = String(row.number);
      });
      const component = create({
        formView: { page: 'order-detail.yaml', sidePanel: true },
        renderForm,
        doubleClickAction: 'view',
      }, { rows: [{ ...rows[0], order_date: '2026-08-12' }], activeView: 'calendar' });
      const submit = vi.fn().mockResolvedValue(undefined);
      component._transport = { submit };
      const container = mount(component);
      const card = container.querySelector<HTMLButtonElement>('[data-row-id="o1"]')!;

      card.click();
      await vi.advanceTimersByTimeAsync(250);
      expect(renderForm).toHaveBeenCalledWith(expect.objectContaining({ id: 'o1', number: 'ORD-001' }), expect.any(HTMLElement));
      expect(submit).not.toHaveBeenCalled();
      expect(container.querySelector('.o-list-form-side-panel')?.textContent).toBe('ORD-001');

      submit.mockClear();
      const secondCard = container.querySelector<HTMLButtonElement>('[data-row-id="o1"]')!;
      secondCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      secondCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      secondCard.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      await vi.runAllTimersAsync();
      expect(submit).toHaveBeenCalledWith('view', { row: expect.objectContaining({ id: 'o1', number: 'ORD-001' }) });
    } finally {
      vi.useRealTimers();
    }
  });

  it('switches from Calendar back to List when a FormView is configured', () => {
    const component = create({
      formView: { page: 'order-detail.yaml', sidePanel: true },
      renderForm: () => undefined,
    }, { activeView: 'calendar' });
    const onViewChange = vi.fn();
    component.options.onViewChange = onViewChange;
    const container = mount(component);

    container.querySelector<HTMLButtonElement>('[data-list-view="list"]')!.click();

    expect(onViewChange).toHaveBeenCalledWith('list');
    expect(container.querySelector('.o-list-table')).not.toBeNull();
    expect(container.querySelector('.o-calendar-view')).toBeNull();
  });

  it('toggles the right FormView panel and navigates rows when hidden', async () => {
    const renderForm = vi.fn((row: Record<string, unknown>, target: HTMLElement) => {
      target.textContent = String(row.number);
    });
    const component = create({
      formView: { page: 'order-detail.yaml', sidePanel: true },
      renderForm,
    });
    const submit = vi.fn().mockResolvedValue(undefined);
    component._transport = { submit };
    const container = mount(component);
    const toggle = () => container.querySelector<HTMLButtonElement>('.o-list-form-mode-toggle')!;

    expect(toggle().dataset.formPanelMode).toBe('right');
    toggle().click();
    expect(container.querySelector('.o-list-form-side-panel')).toBeNull();
    expect(toggle().dataset.formPanelMode).toBe('hidden');
    container.querySelector<HTMLElement>('[data-row-id="o1"] [data-column="number"]')!.click();
    expect(submit).toHaveBeenCalledWith('view', { row: rows[0] });

    toggle().click();
    expect(container.querySelector('.o-list-form-side-panel')?.classList.contains('is-right')).toBe(true);
    expect(renderForm).toHaveBeenCalledWith(rows[0], expect.any(HTMLElement));
  });

  it('opens Kanban cards in the FormView and navigates on double click', async () => {
    vi.useFakeTimers();
    try {
      const renderForm = vi.fn((row: Record<string, unknown>, target: HTMLElement) => {
        target.textContent = String(row.number);
      });
      const component = create({
        formView: { page: 'order-detail.yaml', sidePanel: true },
        renderForm,
        doubleClickAction: 'view',
      }, { activeView: 'kanban' });
      const submit = vi.fn().mockResolvedValue(undefined);
      component._transport = { submit };
      const container = mount(component);
      const card = container.querySelector<HTMLElement>('[data-kanban-group="Draft"] [data-row-id="o1"]')!;

      card.click();
      await vi.advanceTimersByTimeAsync(250);
      expect(renderForm).toHaveBeenCalledWith(rows[0], expect.any(HTMLElement));
      expect(submit).not.toHaveBeenCalled();
      expect(container.querySelector('.o-list-form-side-panel')?.textContent).toBe('ORD-001');

      submit.mockClear();
      const secondCard = container.querySelector<HTMLElement>('[data-kanban-group="Draft"] [data-row-id="o1"]')!;
      secondCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      secondCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      secondCard.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      await vi.runAllTimersAsync();
      expect(submit).toHaveBeenCalledWith('view', { row: rows[0] });
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens rows and keeps conditional commands in an overflow menu', async () => {
    const component = create();
    const submit = vi.fn().mockResolvedValue(undefined);
    component._transport = { submit };
    const container = mount(component);

    container.querySelector<HTMLElement>('[data-row-id="o1"] [data-column="number"]')!.click();
    await Promise.resolve();
    expect(submit).toHaveBeenCalledWith('view', { row: rows[0] });

    const firstRow = container.querySelector<HTMLElement>('[data-row-id="o1"]')!;
    expect(firstRow.querySelector('[data-list-row-action="edit:o1"]')).not.toBeNull();
    const secondRow = container.querySelector<HTMLElement>('[data-row-id="o2"]')!;
    expect(secondRow.querySelector('[data-list-row-action="edit:o2"]')).toBeNull();

    firstRow.querySelector<HTMLButtonElement>('[data-list-row-action="delete:o1"]')!.click();
    await Promise.resolve();
    expect(submit).toHaveBeenCalledWith('delete', { row: rows[0] });
    expect(firstRow.querySelector('.o-list-row-menu')?.hasAttribute('open')).toBe(false);
  });

  it('uses single click for the inline form and double click for the detail action', async () => {
    vi.useFakeTimers();
    try {
      const component = create({ openAction: 'edit', doubleClickAction: 'view' });
      const submit = vi.fn().mockResolvedValue(undefined);
      component._transport = { submit };
      const container = mount(component);
      const row = container.querySelector<HTMLElement>('[data-row-id="o1"] [data-column="number"]')!;

      row.click();
      expect(submit).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(250);
      expect(submit).toHaveBeenCalledWith('edit', { row: rows[0] });

      submit.mockClear();
      row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(250);
      expect(submit).toHaveBeenCalledTimes(1);
      expect(submit).toHaveBeenCalledWith('view', { row: rows[0] });
    } finally {
      vi.useRealTimers();
    }
  });

  it('selects a row for the Odoo form side panel without invoking the detail action', async () => {
    vi.useFakeTimers();
    try {
      const renderForm = vi.fn((row: Record<string, unknown>, target: HTMLElement) => {
        target.textContent = String(row.number);
      });
      const component = create({
        formView: { page: 'order-detail.yaml', sidePanel: true },
        renderForm,
        doubleClickAction: 'view',
        openAction: undefined,
      });
      const submit = vi.fn().mockResolvedValue(undefined);
      component._transport = { submit };
      const container = mount(component);

      container.querySelector<HTMLElement>('[data-row-id="o1"] [data-column="number"]')!.click();
      await vi.advanceTimersByTimeAsync(250);
      expect(submit).not.toHaveBeenCalled();
      expect(renderForm).toHaveBeenCalledWith(rows[0], expect.any(HTMLElement));
      const panel = container.querySelector<HTMLElement>('.o-list-form-side-panel')!;
      expect(panel.textContent).toContain('ORD-001');
      const content = container.querySelector<HTMLElement>('.o-list-content')!;
      vi.spyOn(content, 'getBoundingClientRect').mockReturnValue({ right: 1000, width: 1000 } as DOMRect);
      const handle = panel.querySelector<HTMLElement>('.o-list-form-resize-handle')!;
      handle.dispatchEvent(Object.assign(new Event('pointerdown', { bubbles: true }), { pointerId: 1, clientX: 500 }));
      handle.dispatchEvent(Object.assign(new Event('pointermove', { bubbles: true }), { pointerId: 1, clientX: 400 }));
      handle.dispatchEvent(Object.assign(new Event('pointerup', { bubbles: true }), { pointerId: 1, clientX: 400 }));
      expect(panel.style.width).toBe('60%');
      expect(panel.querySelector('.o-list-form-collapse')).toBeNull();
      container.querySelector<HTMLButtonElement>('.o-list-form-mode-toggle')!.click();
      await Promise.resolve();
      expect(container.querySelector('.o-list-form-side-panel')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('starts with the full grid and toggles list and form panes independently', async () => {
    const renderForm = vi.fn((row: Record<string, unknown>, target: HTMLElement) => {
      target.textContent = String(row.number);
    });
    const component = create({
      formView: { page: 'order-detail.yaml', sidePanel: true },
      renderForm,
      views: [
        { id: 'list', label: 'List', icon: 'table' },
        { id: 'form', label: 'Form', icon: 'form' },
      ],
    });
    const container = mount(component);

    expect(container.querySelector('.o-list-form-side-panel')).not.toBeNull();
    expect(container.querySelector<HTMLButtonElement>('[data-list-view="list"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector<HTMLButtonElement>('[data-list-view="form"]')?.getAttribute('aria-pressed')).toBe('true');

    expect(container.querySelector('.o-list-form-collapse')).toBeNull();
    container.querySelector<HTMLButtonElement>('.o-list-form-mode-toggle')!.click();
    await Promise.resolve();
    expect(container.querySelector('.o-list-form-side-panel')).toBeNull();
    container.querySelector<HTMLButtonElement>('[data-list-view="form"]')!.click();
    await Promise.resolve();
    expect(container.querySelector('.o-list-form-side-panel')).not.toBeNull();

    container.querySelector<HTMLButtonElement>('[data-list-view="list"]')!.click();
    await Promise.resolve();
    expect(container.querySelector('tbody')).toBeNull();
    expect(container.querySelector('.o-list-form-side-panel')?.textContent).toBe('ORD-001');
    expect(renderForm).toHaveBeenCalledWith(rows[0], expect.any(HTMLElement));
  });

  it('switches to a YAML-declared Kanban board and opens its cards', async () => {
    const onKanbanMove = vi.fn();
    const component = create({ onKanbanMove });
    const submit = vi.fn().mockResolvedValue(undefined);
    component._transport = { submit };
    const container = mount(component);

    container.querySelector<HTMLButtonElement>('[data-list-view="kanban"]')!.click();
    expect(container.querySelector('.o-list-table')).toBeNull();
    expect(container.querySelector('[data-kanban-group="Draft"]')?.textContent).toContain('ORD-001');
    expect(container.querySelector('[data-kanban-group="Approved"]')?.textContent).toContain('ORD-002');

    container.querySelector<HTMLElement>('[data-kanban-group="Draft"] [data-row-id="o1"]')!.click();
    await Promise.resolve();
    expect(submit).toHaveBeenCalledWith('view', { row: rows[0] });

    const approvedCards = container.querySelector<HTMLElement>('[data-kanban-group="Approved"] .o-kanban-cards')!;
    approvedCards.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    const drop = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(drop, 'dataTransfer', { value: { getData: () => 'o1' } });
    approvedCards.dispatchEvent(drop);
    expect(onKanbanMove).toHaveBeenCalledWith(rows[0], 'Approved');

    container.querySelector<HTMLButtonElement>('[data-list-view="list"]')!.click();
    expect(container.querySelector('.o-list-table')).not.toBeNull();
  });

  it('keeps the legacy card list as the default variant', () => {
    const container = mount(new ListView('legacy', { items: [{ name: 'Legacy item' }] }, [{ field: 'name', label: 'Name' }]));
    expect(container.textContent).toContain('Legacy item');
    expect(container.querySelector('.o-list-view')).toBeNull();
  });

  it('uses the shared dialog to add a Kanban status', () => {
    const onKanbanAddStatus = vi.fn();
    const component = create({ onKanbanAddStatus });
    const container = mount(component);

    container.querySelector<HTMLButtonElement>('[data-list-view="kanban"]')!.click();
    container.querySelector<HTMLButtonElement>('.o-kanban-add-status')!.click();

    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.querySelector('input')?.getAttribute('placeholder')).toBe('Enter a status name');
    const input = dialog.querySelector('input') as HTMLInputElement;
    input.value = 'In transit';
    dialog.querySelector<HTMLButtonElement>('.core3-dialog-confirm')!.click();
    expect(onKanbanAddStatus).toHaveBeenCalledWith('In transit', [], []);
  });
});

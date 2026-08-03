import { describe, expect, it, vi } from 'vitest';
import { ListView } from '../../components/ListView.ts';

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

function create(options: Record<string, unknown> = {}) {
  return new ListView('orders', {
    rows,
    meta: { total: 12, page: 1, pageSize: 2 },
    filters: {},
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
    views: [
      { id: 'list', label: 'List', icon: 'table' },
      {
        id: 'kanban', label: 'Kanban', icon: 'dashboard', groupBy: 'status',
        groups: [{ value: 'Draft', label: 'Draft' }, { value: 'Approved', label: 'Approved' }],
        card: { title: 'number', subtitle: 'customer', fields: [{ field: 'status', label: 'Status' }] },
      },
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
    expect(onKanbanAddStatus).toHaveBeenCalledWith('In transit');
  });
});

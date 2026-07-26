import { describe, expect, it, vi } from 'vitest';
import { DataGrid } from '@core3/frontend/components';

const columns = [
  { field: 'code', label: 'Code', sortable: true },
  { field: 'amount', label: 'Amount', sortable: true, align: 'right' as const },
];

const rows = [
  { id: 'b', code: 'B-200', amount: 200 },
  { id: 'a', code: 'A-100', amount: 100 },
];

function mount(grid: DataGrid) {
  const container = document.createElement('div');
  grid.mount(container);
  return container;
}

describe('DataGrid', () => {
  it('renders metadata, actions, and a formatted total', () => {
    const grid = new DataGrid('orders', {
      rows,
      meta: { title: 'Orders', description: 'Current orders', total: 12, page: 2, pageSize: 5 },
      actions: [{ id: 'create', label: 'Add order' }],
    }, columns);

    const container = mount(grid);

    expect(container.textContent).toContain('Orders');
    expect(container.textContent).toContain('Current orders');
    expect(container.querySelector('[data-grid-action="create"]')?.textContent).toBe('Add order');
    expect(container.textContent).toContain('6–10 of 12');
  });

  it('sorts rows when a sortable header is clicked and reports the new sort', () => {
    const onSort = vi.fn();
    const grid = new DataGrid('orders', { rows }, columns, { onSort });
    const container = mount(grid);
    const sortButton = container.querySelector<HTMLButtonElement>('[data-sort-field="code"]')!;

    sortButton.click();
    expect(grid.state.sort).toEqual({ field: 'code', direction: 'asc' });
    expect(onSort).toHaveBeenCalledWith({ field: 'code', direction: 'asc' });
    expect(container.querySelector('tbody tr td')?.textContent).toBe('A-100');

    container.querySelector<HTMLButtonElement>('[data-sort-field="code"]')!.click();
    expect(grid.state.sort).toEqual({ field: 'code', direction: 'desc' });
    expect(container.querySelector('tbody tr td')?.textContent).toBe('B-200');
  });

  it('selects rows individually and supports select all', () => {
    const onSelectionChange = vi.fn();
    const grid = new DataGrid('orders', { rows }, columns, { selectable: true, onSelectionChange });
    const container = mount(grid);
    const rowCheckbox = container.querySelector<HTMLInputElement>('input[aria-label="Select row b"]')!;
    rowCheckbox.checked = true;
    rowCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    expect(grid.state.selectedIds).toEqual(['b']);
    expect(onSelectionChange).toHaveBeenLastCalledWith(['b']);

    const selectAll = container.querySelector<HTMLInputElement>('input[aria-label="Select all rows"]')!;
    selectAll.checked = true;
    selectAll.dispatchEvent(new Event('change', { bubbles: true }));
    expect(grid.state.selectedIds).toEqual(['b', 'a']);
  });

  it('renders a configurable empty state across all columns', () => {
    const grid = new DataGrid('orders', { rows: [] }, columns, {
      selectable: true,
      emptyState: { title: 'No orders', description: 'Create an order to begin.' },
    });
    const container = mount(grid);

    const cell = container.querySelector('tbody td')!;
    expect(cell.getAttribute('colspan')).toBe('3');
    expect(cell.textContent).toContain('No orders');
    expect(cell.textContent).toContain('Create an order to begin.');
  });

  it('lets a semantic column renderer own its cell contents', () => {
    const grid = new DataGrid('vehicles', { rows: [{ id: 'v1', status: 'Ready' }] }, [
      {
        field: 'status',
        label: 'Status',
        render: (cell, value) => {
          const badge = document.createElement('span');
          badge.className = 'status-chip ready';
          badge.textContent = String(value);
          cell.appendChild(badge);
        },
      },
    ]);
    const container = mount(grid);
    expect(container.querySelector('.status-chip.ready')?.textContent).toBe('Ready');
  });

  it('passes the selected rows to default actions', async () => {
    const grid = new DataGrid('orders', {
      rows,
      selectedIds: ['a'],
      actions: [{ id: 'export', label: 'Export', params: { format: 'xlsx' } }],
    }, columns);
    const submit = vi.fn().mockResolvedValue({ ok: true });
    grid._transport = { submit };
    const container = mount(grid);

    container.querySelector<HTMLButtonElement>('[data-grid-action="export"]')!.click();
    await Promise.resolve();
    expect(submit).toHaveBeenCalledWith('export', { format: 'xlsx', selectedIds: ['a'] });
  });

  it('emits an individual row with a row action', async () => {
    const grid = new DataGrid('vehicles', { rows }, [
      { field: 'code', label: 'Code' },
      { field: 'actions', label: '', rowActions: [{ id: 'edit', label: 'Edit', variant: 'ghost' }] },
    ]);
    const submit = vi.fn().mockResolvedValue({ ok: true });
    grid._transport = { submit };
    const container = mount(grid);
    container.querySelector<HTMLButtonElement>('[data-grid-row-action="edit:b"]')!.click();
    await Promise.resolve();
    expect(submit).toHaveBeenCalledWith('edit', { row: rows[0] });
  });

  it('hides row actions that are unavailable for the row state', () => {
    const grid = new DataGrid('orders', {
      rows: [
        { id: 'draft', status: 'Draft' },
        { id: 'approved', status: 'Approved' },
      ],
    }, [
      { field: 'status', label: 'Status' },
      {
        field: 'actions',
        label: '',
        rowActions: [
          {
            id: 'approve',
            label: 'Approve',
            visible: row => row.status === 'Pending Approval',
          },
          {
            id: 'cancel',
            label: 'Cancel',
            visible: row => row.status !== 'Cancelled',
          },
        ],
      },
    ]);

    const container = mount(grid);
    expect(container.querySelectorAll('[data-grid-row-action^="approve:"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-grid-row-action^="cancel:"]')).toHaveLength(2);
  });

  it('requests the next server page without slicing client-side rows', () => {
    const onPageChange = vi.fn();
    const grid = new DataGrid('orders', {
      rows,
      meta: { total: 12, page: 1, pageSize: 2 },
    }, columns, { onPageChange });
    const container = mount(grid);

    container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')!.click();
    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(grid.state.rows).toEqual(rows);
  });

  it('supports declarative column visibility without losing the remaining columns', async () => {
    const grid = new DataGrid('orders', { rows }, columns, { columnChooser: true });
    const container = mount(grid);
    const amount = container.querySelector<HTMLInputElement>('input[aria-label="Show Amount"]')!;

    amount.checked = false;
    amount.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();

    expect(grid.state.visibleColumns).toEqual(['code']);
    expect(container.querySelector('thead')?.textContent).toContain('Code');
    expect(container.querySelector('thead')?.textContent).not.toContain('Amount');
    expect(container.querySelector('tbody tr')?.querySelectorAll('td')).toHaveLength(1);
  });
});

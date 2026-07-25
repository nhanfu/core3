/**
 * Test cases for GridView and cell components
 *
 * NOT YET RUNNABLE — requires @core3/frontend + vitest/jest setup.
 * Run: npx vitest run cases/grid-view.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GridView,
  TextCell,
  BadgeCell,
  CurrencyCell,
  NumberCell,
  DateCell,
  BooleanCell,
  ActionCell,
} from '@core3/frontend/components';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mount(comp: GridView) {
  const el = document.createElement('div');
  comp.mount(el);
  return el;
}

const SAMPLE_DEFS = [
  { type: 'TextCell',     id: 'plate',  field: 'plate',  label: 'Plate' },
  { type: 'BadgeCell',    id: 'status', field: 'status', label: 'Status' },
  { type: 'CurrencyCell', id: 'cost',   field: 'cost',   label: 'Cost' },
  { type: 'DateCell',     id: 'date',   field: 'date',   label: 'Date', format: 'short' },
  { type: 'ActionCell',   id: 'acts',   field: '',       label: '', actions: [{ id: 'view', label: 'View' }] },
];

const SAMPLE_ROWS = [
  { id: '1', plate: 'ABC-123', status: 'Active', cost: 1500, date: '2025-06-01' },
  { id: '2', plate: 'XYZ-456', status: 'Maintenance', cost: 3200, date: '2025-05-15' },
  { id: '3', plate: 'DEF-789', status: 'Out of Service', cost: 0,    date: '2025-04-20' },
];

// ─── Rendering ───────────────────────────────────────────────────────────────

describe('GridView rendering', () => {
  it('renders one row per item in state.rows', () => {
    const grid = new GridView('g1', {
      rows: SAMPLE_ROWS,
      meta: { total: 3, page: 1, pageSize: 25 },
    }, SAMPLE_DEFS);
    const el = mount(grid);
    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
  });

  it('renders one header cell per componentDef', () => {
    const grid = new GridView('g1', {
      rows: SAMPLE_ROWS,
      meta: { total: 3, page: 1, pageSize: 25 },
    }, SAMPLE_DEFS);
    const el = mount(grid);
    const headers = el.querySelectorAll('thead th');
    expect(headers.length).toBe(SAMPLE_DEFS.length);
    expect(headers[0].textContent).toBe('Plate');
    expect(headers[1].textContent).toBe('Status');
  });

  it('shows empty-state message when state.rows is empty', () => {
    const grid = new GridView('g1', {
      rows: [],
      meta: { total: 0, page: 1, pageSize: 25 },
    }, SAMPLE_DEFS);
    const el = mount(grid);
    expect(el.textContent).toMatch(/no records/i);
    expect(el.querySelectorAll('tbody tr').length).toBe(1); // empty row
  });

  it('renders a skeleton when state.loading is true', () => {
    const grid = new GridView('g1', {
      rows: [],
      meta: { total: 0, page: 1, pageSize: 25 },
      loading: true,
    }, SAMPLE_DEFS);
    const el = mount(grid);
    expect(el.querySelector('.skeleton, [data-loading]')).not.toBeNull();
  });
});

// ─── Pagination ───────────────────────────────────────────────────────────────

describe('GridView pagination', () => {
  it('shows total count from meta.total', () => {
    const grid = new GridView('g1', {
      rows: SAMPLE_ROWS,
      meta: { total: 42, page: 1, pageSize: 12 },
    }, SAMPLE_DEFS);
    const el = mount(grid);
    expect(el.textContent).toContain('42');
  });

  it('disables Prev button on page 1', () => {
    const grid = new GridView('g1', {
      rows: SAMPLE_ROWS,
      meta: { total: 100, page: 1, pageSize: 25 },
    }, SAMPLE_DEFS);
    const el = mount(grid);
    const prevBtn = el.querySelector('button[disabled]');
    expect(prevBtn?.textContent).toMatch(/prev/i);
  });

  it('disables Next button on last page', () => {
    const grid = new GridView('g1', {
      rows: SAMPLE_ROWS,
      meta: { total: 3, page: 1, pageSize: 25 }, // 3 total, 25 per page — last page
    }, SAMPLE_DEFS);
    const el = mount(grid);
    const buttons = el.querySelectorAll<HTMLButtonElement>('button');
    const nextBtn = Array.from(buttons).find(b => /next/i.test(b.textContent ?? ''));
    expect(nextBtn?.disabled).toBe(true);
  });
});

// ─── Child components ─────────────────────────────────────────────────────────

describe('GridView child component tree', () => {
  it('spawns cell components as children', () => {
    const grid = new GridView('g1', {
      rows: [SAMPLE_ROWS[0]],
      meta: { total: 1, page: 1, pageSize: 25 },
    }, SAMPLE_DEFS);
    mount(grid);
    // One set of cells per row
    expect(grid.children.length).toBe(SAMPLE_DEFS.length);
  });

  it('cell.parent points back to the grid', () => {
    const grid = new GridView('g1', {
      rows: [SAMPLE_ROWS[0]],
      meta: { total: 1, page: 1, pageSize: 25 },
    }, SAMPLE_DEFS.slice(0, 1));
    mount(grid);
    expect(grid.children[0].parent).toBe(grid);
  });

  it('grid.find() can locate a specific cell by id', () => {
    const grid = new GridView('g1', {
      rows: [SAMPLE_ROWS[0]],
      meta: { total: 1, page: 1, pageSize: 25 },
    }, SAMPLE_DEFS);
    mount(grid);
    // Cell id format: `${gridId}-${rowId}-${defId}`
    const statusCell = grid.find('g1-1-status');
    expect(statusCell).not.toBeNull();
  });
});

// ─── TextCell ─────────────────────────────────────────────────────────────────

describe('TextCell', () => {
  it('renders primary value', () => {
    const cell = new TextCell('c', { value: 'ABC-123', secondary: null });
    const el = document.createElement('td');
    cell.draw(el);
    expect(el.textContent).toContain('ABC-123');
  });

  it('renders secondary text when provided', () => {
    const cell = new TextCell('c', { value: 'John Smith', secondary: '+1-555-0100' });
    const el = document.createElement('td');
    cell.draw(el);
    expect(el.textContent).toContain('John Smith');
    expect(el.textContent).toContain('+1-555-0100');
  });

  it('renders em-dash when value is null', () => {
    const cell = new TextCell('c', { value: null });
    const el = document.createElement('td');
    cell.draw(el);
    expect(el.textContent).toContain('—');
  });
});

// ─── BadgeCell ───────────────────────────────────────────────────────────────

describe('BadgeCell', () => {
  it('renders status text', () => {
    const cell = new BadgeCell('c', { value: 'Active', color: null });
    const el = document.createElement('td');
    cell.draw(el);
    expect(el.textContent).toContain('Active');
  });

  it('applies a custom color class when provided', () => {
    const cell = new BadgeCell('c', { value: 'Custom', color: 'bg-purple-100 text-purple-800' });
    const el = document.createElement('td');
    cell.draw(el);
    expect(el.querySelector('.bg-purple-100')).not.toBeNull();
  });

  it('falls back to a default color from the status map for known values', () => {
    const cell = new BadgeCell('c', { value: 'Active', color: null });
    const el = document.createElement('td');
    cell.draw(el);
    // 'active' maps to green
    expect(el.querySelector('.bg-green-100, .text-green-800')).not.toBeNull();
  });
});

// ─── CurrencyCell ─────────────────────────────────────────────────────────────

describe('CurrencyCell', () => {
  it('formats a number as USD currency', () => {
    const cell = new CurrencyCell('c', { value: 1500, currency: 'USD' });
    const el = document.createElement('td');
    cell.draw(el);
    expect(el.textContent).toContain('$1,500.00');
  });

  it('renders em-dash when value is null', () => {
    const cell = new CurrencyCell('c', { value: null });
    const el = document.createElement('td');
    cell.draw(el);
    expect(el.textContent).toContain('—');
  });
});

// ─── DateCell ─────────────────────────────────────────────────────────────────

describe('DateCell', () => {
  it('renders a short date by default', () => {
    const cell = new DateCell('c', { value: '2025-06-01', format: 'short' });
    const el = document.createElement('td');
    cell.draw(el);
    expect(el.textContent).toMatch(/Jun|2025/);
  });

  it('renders relative date when format is "relative"', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const cell = new DateCell('c', { value: yesterday, format: 'relative' });
    const el = document.createElement('td');
    cell.draw(el);
    expect(el.textContent).toMatch(/yesterday|1 day ago/i);
  });

  it('applies red color when overdue=true', () => {
    const cell = new DateCell('c', { value: '2024-01-01', format: 'short', overdue: true });
    const el = document.createElement('td');
    cell.draw(el);
    expect(el.querySelector('.text-red-600, .text-red-500')).not.toBeNull();
  });
});

// ─── ActionCell ──────────────────────────────────────────────────────────────

describe('ActionCell', () => {
  it('renders one button per action', () => {
    const actions = [{ id: 'view', label: 'View' }, { id: 'delete', label: 'Delete', variant: 'danger' as const }];
    const cell = new ActionCell('c', { actions, row: { id: '1' }, loading: false });
    const el = document.createElement('td');
    cell.draw(el);
    expect(el.querySelectorAll('button').length).toBe(2);
  });

  it('calls onAction when a button is clicked', async () => {
    const onAction = vi.fn();
    const actions = [{ id: 'view', label: 'View' }];
    const cell = new ActionCell('c', { actions, row: { id: '99' }, loading: false, onAction });
    const el = document.createElement('td');
    cell.draw(el);
    el.querySelector<HTMLButtonElement>('button')!.click();
    expect(onAction).toHaveBeenCalledWith('view', { id: '99' });
  });
});

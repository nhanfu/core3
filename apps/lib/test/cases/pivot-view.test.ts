import { describe, expect, it, vi } from 'vitest';
import { PivotView } from '../../components/PivotView.ts';

describe('PivotView builder', () => {
  it('maps DuckDB generated pivot keys to configured field labels', () => {
    const host = document.createElement('div');
    const view = new PivotView('orders-pivot-labels', {
      rows: [{ status_label: 'Approved', '32600000___core3_partitioned_orders': 1 }],
    }, {
      view: {
        id: 'pivot', label: 'Pivot', fields: ['status_label', 'total_amount'],
        fieldLabels: { status_label: 'Status', total_amount: 'Total amount' },
        rowFields: ['status_label'], columnFields: ['total_amount'],
        measures: [{ aggregate: 'count', label: 'Orders' }],
      },
    });
    view.mount(host);

    expect(host.querySelector('.o-pivot-table thead')?.textContent).toContain('Total amount · 32.600.000');
  });

  it('renders null pivot cells as underscores', () => {
    const host = document.createElement('div');
    const view = new PivotView('orders-pivot-null', {
      rows: [{ status_label: null, Road_Orders: null }],
    }, {
      view: {
        id: 'pivot', label: 'Pivot', fields: ['status_label', 'transport_method'],
        fieldLabels: { status_label: 'Status' }, rowFields: ['status_label'], columnFields: ['transport_method'],
        measures: [{ aggregate: 'count', label: 'Orders' }],
      },
    });
    view.mount(host);

    expect(host.querySelector('.o-pivot-table tbody')?.textContent).toContain('__');
  });

  it('renders null pivot dimensions with a readable label', () => {
    const host = document.createElement('div');
    const view = new PivotView('orders-pivot-null-label', {
      rows: [{ status_label: 'Approved', NULL_Amount: 1 }],
    }, {
      view: {
        id: 'pivot', label: 'Pivot', fields: ['status_label', 'transport_method'],
        fieldLabels: { status_label: 'Status', transport_method: 'Transport method' },
        rowFields: ['status_label'], columnFields: ['transport_method'],
        measures: [{ aggregate: 'sum', field: 'total_amount', label: 'Amount' }],
      },
    });
    view.mount(host);

    expect(host.querySelector('.o-pivot-table thead')?.textContent).toContain('Not set · Amount');
  });

  it('emits selected dimensions and measures through Apply', () => {
    const host = document.createElement('div');
    const onChange = vi.fn();
    const view = new PivotView('orders-pivot', { rows: [] }, {
      view: {
        id: 'pivot', label: 'Pivot', fields: ['status_label', 'transport_method', 'total_amount'],
        rowFields: ['status_label'], columnFields: ['transport_method'],
        measures: [{ aggregate: 'count', label: 'Orders' }],
      },
      onChange,
    });
    view.mount(host);

    expect(host.querySelector('.o-pivot-builder')).toBeNull();
    (host.querySelector('.o-pivot-configure') as HTMLButtonElement).click();
    expect(host.querySelector('.o-pivot-builder')).not.toBeNull();
    (host.querySelector('.o-pivot-apply') as HTMLButtonElement).click();
    expect(onChange).toHaveBeenCalledWith({
      rows: ['status_label'],
      columns: ['transport_method'],
      measures: [{ aggregate: 'count', label: 'Orders' }],
    });
  });

  it('allows axes to be emptied and fields to be added back', () => {
    const host = document.createElement('div');
    const onChange = vi.fn();
    const view = new PivotView('orders-pivot-axis-editor', { rows: [] }, {
      view: {
        id: 'pivot', label: 'Pivot', fields: ['status_label', 'transport_method', 'total_amount'],
        fieldLabels: { status_label: 'Status', transport_method: 'Transport method', total_amount: 'Total amount' },
        rowFields: ['status_label'], columnFields: ['transport_method'],
        measures: [{ field: 'total_amount', aggregate: 'sum', label: 'Amount' }],
      },
      onChange,
    });
    view.mount(host);
    (host.querySelector('.o-pivot-configure') as HTMLButtonElement).click();
    (host.querySelector('[title="Remove status_label"]') as HTMLButtonElement).click();
    (host.querySelectorAll('.o-pivot-axis')[1].querySelector('[title="Add total_amount"]') as HTMLButtonElement).click();
    (host.querySelector('.o-pivot-apply') as HTMLButtonElement).click();
    expect(onChange).toHaveBeenCalledWith({
      rows: [], columns: ['transport_method', 'total_amount'],
      measures: [{ field: 'total_amount', aggregate: 'sum', label: 'Amount' }],
    });
  });
});

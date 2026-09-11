import { describe, expect, it } from 'vitest';
import { GraphView } from '@core3/client/components/GraphView';

describe('GraphView', () => {
  it('renders a connected line and filled area for line reports', () => {
    const container = document.createElement('div');
    new GraphView('purchase-analysis', {
      rows: [
        { date: '2026-08-01', amount: 10 },
        { date: '2026-08-02', amount: 20 },
      ],
    }, { view: { id: 'graph', label: 'Graph', categoryField: 'date', measureField: 'amount', type: 'line' } }).mount(container);

    expect(container.querySelector('.o-graph-line')?.getAttribute('points')).toContain(',');
    expect(container.querySelector('.o-graph-area')?.getAttribute('points')).toContain(' ');
    expect(container.querySelectorAll('.o-graph-mark')).toHaveLength(2);
  });

  it('renders an accessible measure legend and scale for grouped reports', () => {
    const host = document.createElement('div');
    const view = new GraphView('sales-customers-graph', {
      rows: [{ customer_name: 'Acme Corporation', quantity_ordered: 4 }],
    }, {
      view: {
        id: 'graph', label: 'Graph', categoryField: 'customer_name', measureField: 'quantity_ordered', measureLabel: 'Qty Ordered',
      },
    });

    view.mount(host);

    expect(host.querySelector('svg')?.getAttribute('aria-label')).toBe('Graph');
    expect(host.querySelector('.o-graph-legend')?.textContent).toContain('Qty Ordered');
    expect(host.querySelectorAll('.o-graph-gridline')).toHaveLength(5);
    expect(host.querySelector('.o-graph-mark')?.getAttribute('data-category')).toBe('Acme Corporation');
  });

  it('renders pie slices and a category legend for distribution reports', () => {
    const host = document.createElement('div');
    new GraphView('opt-out-report', {
      rows: [
        { reason: 'I changed my mind', count: 2 },
        { reason: 'Too many emails', count: 1 },
      ],
    }, { view: { id: 'graph', label: 'Opt-Out Report', categoryField: 'reason', measureField: 'count', type: 'pie' } }).mount(host);

    expect(host.querySelectorAll('.o-graph-pie-slice')).toHaveLength(2);
    expect(host.querySelector('.o-graph-pie-legend')?.textContent).toContain('I changed my mind (2)');
    expect(host.querySelectorAll('.o-graph-gridline')).toHaveLength(0);
    expect(host.querySelector('[data-graph-type="pie"]')?.getAttribute('aria-label')).toBe('Pie chart');
  });
});

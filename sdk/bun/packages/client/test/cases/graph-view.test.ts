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

    expect(container.querySelector('.o-graph-line')?.getAttribute('points')).toBe('72,140 172,30');
    expect(container.querySelector('.o-graph-area')?.getAttribute('points')).toContain('172,250');
    expect(container.querySelectorAll('.o-graph-mark')).toHaveLength(2);
  });
});

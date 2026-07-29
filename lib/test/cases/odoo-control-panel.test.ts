import { describe, expect, it } from 'vitest';
import { OdooControlPanel } from '../../components/OdooControlPanel.ts';

describe('OdooControlPanel', () => {
  it('exposes working selectors without inert duplicate filter buttons', () => {
    const container = document.createElement('div');
    const control = new OdooControlPanel('controls', {}, {
      filterOptions: [{ value: 'open', label: 'Open' }],
      groupOptions: [{ value: 'team', label: 'Team' }],
      sortOptions: [{ value: 'revenue', label: 'Revenue' }],
    });
    control.mount(container);

    expect(container.querySelectorAll('select')).toHaveLength(3);
    expect([...container.querySelectorAll('button')].map(button => button.textContent)).not.toContain('Filters');
    expect([...container.querySelectorAll('button')].map(button => button.textContent)).not.toContain('Group By');
    expect([...container.querySelectorAll('button')].map(button => button.textContent)).toContain('Favorites');
  });
});

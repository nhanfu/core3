import { describe, expect, it } from 'vitest';
import { StatusTabs } from '../../components/StatusTabs.ts';

describe('StatusTabs', () => {
  it('can render reference-style toggles without count badges', () => {
    const container = document.createElement('div');
    new StatusTabs(
      'vehicle-status',
      { active: 'Active' },
      [{ id: 'Active', label: 'Hoạt động', count: 8 }, { id: 'Out of Service', label: 'Ngưng hoạt động', count: 2 }],
      { showCounts: false },
    ).mount(container);

    expect(container.querySelectorAll('[role="tab"]')).toHaveLength(2);
    expect(container.textContent).toContain('Hoạt động');
    expect(container.textContent).not.toContain('8');
    expect(container.textContent).not.toContain('2');
  });
});

import { describe, expect, it } from 'vitest';
import { StatusTabs } from '@core3/client/components/StatusTabs';

describe('StatusTabs', () => {
  it('can render reference-style toggles without count badges', () => {
    const container = document.createElement('div');
    new StatusTabs(
      'vehicle-status',
      { active: 'Active' },
      [{ id: 'Active', label: 'Hoạt động', count: 8 }, { id: 'Out of Service', label: 'Ngưng hoạt động', count: 2 }],
      { showCounts: false, variant: 'toggle' },
    ).mount(container);

    expect(container.querySelectorAll('[role="tab"]')).toHaveLength(2);
    expect(container.querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe('Bộ lọc trạng thái');
    expect(container.querySelector('[role="tablist"]')?.className).toContain('core3-token-status-tabs');
    expect(container.textContent).toContain('Hoạt động');
    expect(container.textContent).not.toContain('8');
    expect(container.textContent).not.toContain('2');
    expect(container.querySelector('[data-status-tab="Active"]')?.className).toContain('rounded-md');
  });

  it('renders contained tabs for a resource card composition', () => {
    const container = document.createElement('div');
    new StatusTabs(
      'customer-status',
      { active: '' },
      [{ id: '', label: 'Tất cả', count: 30 }, { id: 'Customer', label: 'Khách hàng', count: 20 }],
      { variant: 'contained' },
    ).mount(container);

    expect(container.querySelector('[role="tablist"]')?.className).toContain('core3-status-tabs-contained');
    expect(container.querySelector('[role="tablist"]')?.className).toContain('core3-token-status-tabs');
    expect(container.querySelector('[data-status-tab=""]')?.className).toContain('bg-blue-50');
    expect(container.querySelector('[data-status-tab="Customer"]')?.textContent).toContain('20');
  });
});

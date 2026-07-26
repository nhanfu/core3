import { describe, expect, it, vi } from 'vitest';
import { ListToolbar, StatusTabs } from '@core3/frontend/components';

function mount<T extends { mount(container: HTMLElement): void }>(component: T) {
  const container = document.createElement('div');
  component.mount(container);
  return { component, container };
}

describe('StatusTabs', () => {
  const tabs = [
    { id: 'all', label: 'All', count: 31 },
    { id: 'draft', label: 'Draft', count: 4, action: 'orders.status.change' },
    { id: 'cancelled', label: 'Cancelled', count: 1, disabled: true },
  ];

  it('renders labels and count badges with the first tab selected by default', () => {
    const { container } = mount(new StatusTabs('status', {}, tabs));
    const all = container.querySelector<HTMLButtonElement>('[data-status-tab="all"]')!;

    expect(container.textContent).toContain('All');
    expect(container.textContent).toContain('31');
    expect(all.getAttribute('aria-selected')).toBe('true');
    expect(all.className).toContain('border-blue-600');
  });

  it('selects a tab and emits its configured action', () => {
    const component = new StatusTabs('status', {}, tabs);
    const submit = vi.spyOn(component, 'submit').mockResolvedValue({});
    const { container } = mount(component);

    container.querySelector<HTMLButtonElement>('[data-status-tab="draft"]')!.click();

    expect(component.state.active).toBe('draft');
    expect(submit).toHaveBeenCalledWith('orders.status.change', { id: 'draft', status: 'draft' });
    expect(container.querySelector<HTMLButtonElement>('[data-status-tab="draft"]')!.getAttribute('aria-selected')).toBe('true');
  });

  it('does not emit an action for a disabled status tab', () => {
    const component = new StatusTabs('status', {}, tabs);
    const submit = vi.spyOn(component, 'submit').mockResolvedValue({});
    const { container } = mount(component);

    container.querySelector<HTMLButtonElement>('[data-status-tab="cancelled"]')!.click();

    expect(submit).not.toHaveBeenCalled();
    expect(component.state.active).toBeUndefined();
  });
});

describe('ListToolbar', () => {
  const definition = {
    search: { placeholder: 'Search order, customer, cargo…', action: 'orders.search' },
    actions: [
      { id: 'advanced', icon: '⚙', title: 'Advanced search', action: 'orders.advanced' },
      { id: 'export', label: 'Export Excel', icon: '↓', action: 'orders.export', params: { format: 'xlsx' } },
      { id: 'columns', label: 'Columns', action: 'orders.columns' },
    ],
  } as const;

  it('renders the search input and optional utility actions', () => {
    const { container } = mount(new ListToolbar('toolbar', {}, definition));
    const input = container.querySelector<HTMLInputElement>('[data-list-search]')!;

    expect(input.placeholder).toBe('Search order, customer, cargo…');
    expect(container.querySelectorAll('[data-toolbar-action]')).toHaveLength(3);
    expect(container.querySelector('[data-toolbar-action="advanced"]')?.getAttribute('aria-label'))
      .toBe('Advanced search');
  });

  it('keeps query state while typing and emits search on Enter', () => {
    const component = new ListToolbar('toolbar', {}, definition);
    const submit = vi.spyOn(component, 'submit').mockResolvedValue({});
    const { container } = mount(component);
    const input = container.querySelector<HTMLInputElement>('[data-list-search]')!;

    input.value = 'ORD-1001';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(component.state.query).toBe('ORD-1001');
    expect(submit).toHaveBeenCalledWith('orders.search', { query: 'ORD-1001', value: 'ORD-1001' });
  });

  it('emits the action-specific params for utility buttons', () => {
    const component = new ListToolbar('toolbar', {}, definition);
    const submit = vi.spyOn(component, 'submit').mockResolvedValue({});
    const { container } = mount(component);

    container.querySelector<HTMLButtonElement>('[data-toolbar-action="export"]')!.click();

    expect(submit).toHaveBeenCalledWith('orders.export', { id: 'export', format: 'xlsx' });
  });

  it('can render an actions-only toolbar', () => {
    const { container } = mount(new ListToolbar('toolbar', {}, {
      search: false,
      actions: [{ id: 'refresh', label: 'Refresh' }],
    }));

    expect(container.querySelector('[data-list-search]')).toBeNull();
    expect(container.querySelector('[data-toolbar-action="refresh"]')).not.toBeNull();
  });
});

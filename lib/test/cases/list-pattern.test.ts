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
    expect(container.querySelector('[data-toolbar-action="export"] svg')).not.toBeNull();
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

  it('emits date bounds for a selected period preset', () => {
    const component = new ListToolbar('toolbar', {}, {
      search: false,
      date_range: { presets: ['month', 'all'] },
    });
    const submit = vi.spyOn(component, 'submit').mockResolvedValue({});
    const { container } = mount(component);
    const select = container.querySelector<HTMLSelectElement>('select[aria-label="Khoảng thời gian"]')!;

    select.value = 'all';
    select.dispatchEvent(new Event('change', { bubbles: true }));

    expect(submit).toHaveBeenCalledWith('date-range', { from_date: '', to_date: '' });
  });

  it('renders segmented period presets when requested', () => {
    const component = new ListToolbar('toolbar', {}, {
      search: false,
      date_range: { presets: ['month', 'all'], preset_style: 'segmented' },
    });
    const submit = vi.spyOn(component, 'submit').mockResolvedValue({});
    const { container } = mount(component);
    const button = container.querySelector<HTMLButtonElement>('[data-date-preset="month"]')!;

    button.click();

    expect(submit).toHaveBeenCalledWith('date-range', expect.objectContaining({ from_date: expect.any(String) }));
    expect(container.querySelector('select[aria-label="Khoảng thời gian"]')).toBeNull();
  });

  it('supports the dashboard previous-month and rolling-year presets', () => {
    const component = new ListToolbar('toolbar', {}, {
      search: false,
      date_range: { presets: ['previous_month', 'last_12_months'], preset_style: 'segmented' },
    });
    const submit = vi.spyOn(component, 'submit').mockResolvedValue({});
    const { container } = mount(component);

    container.querySelector<HTMLButtonElement>('[data-date-preset="previous_month"]')!.click();
    const previous = submit.mock.calls[0][1] as { from_date: string; to_date: string };
    container.querySelector<HTMLButtonElement>('[data-date-preset="last_12_months"]')!.click();
    const rolling = submit.mock.calls[1][1] as { from_date: string; to_date: string };

    expect(previous.from_date).toMatch(/^\d{4}-\d{2}-01$/);
    expect(previous.to_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(rolling.from_date).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it('emits typed filter values from declarative selects', () => {
    const component = new ListToolbar('toolbar', {}, {
      search: false,
      filters: [{ field: 'transport_method', label: 'Transport method', options: ['Road', { id: 'sea', label: 'Sea' }] }],
    });
    const submit = vi.spyOn(component, 'submit').mockResolvedValue({});
    const { container } = mount(component);
    const select = container.querySelector<HTMLSelectElement>('select[aria-label="Transport method"]')!;

    select.value = 'sea';
    select.dispatchEvent(new Event('change', { bubbles: true }));

    expect(submit).toHaveBeenCalledWith('filter', { transport_method: 'sea' });
  });

  it('collapses advanced fields until the filter control is opened', () => {
    const { container } = mount(new ListToolbar('toolbar', {}, {
      search: false,
      date_range: { presets: ['month'] },
      filters: [{ field: 'status', label: 'Status', options: ['Active'] }],
    }));
    const advanced = container.querySelector<HTMLButtonElement>('[aria-label="Bộ lọc nâng cao"]')!;
    const advancedContent = container.querySelector<HTMLElement>('.basis-full')!;

    expect(advanced.getAttribute('aria-expanded')).toBe('false');
    expect(advancedContent.style.display).toBe('none');
    advanced.click();
    expect(advanced.getAttribute('aria-expanded')).toBe('true');
    expect(advancedContent.style.display).toBe('flex');
  });

  it('opens and closes contextual help without changing filter state', () => {
    const { container } = mount(new ListToolbar('toolbar', {}, { search: false, help: true }));
    const help = container.querySelector<HTMLButtonElement>('[aria-label="Trợ giúp"]')!;

    help.click();
    expect(container.querySelector('[data-toolbar-help]')?.textContent).toContain('Dùng tìm kiếm');
    help.click();
    expect(container.querySelector('[data-toolbar-help]')).toBeNull();
  });
});

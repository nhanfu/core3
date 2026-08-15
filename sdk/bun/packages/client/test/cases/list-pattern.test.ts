import { describe, expect, it, vi } from 'vitest';
import { FilterBar, ListToolbar, StatusTabs } from '@core3/client';

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

    expect(container.querySelector('.token-toolbar')).not.toBeNull();
    expect(input.className).toContain('token-input');
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

  it('renders an optional semantic search button that emits the current query', () => {
    const component = new ListToolbar('toolbar', { query: 'KH001' }, {
      search: { action: 'customers.search' },
      search_button: true,
    });
    const submit = vi.spyOn(component, 'submit').mockResolvedValue({});
    const { container } = mount(component);

    expect(container.querySelector('[data-list-search-submit] svg')).not.toBeNull();
    (container.querySelector('[data-list-search-submit]') as HTMLButtonElement).click();
    expect(submit).toHaveBeenCalledWith('customers.search', { query: 'KH001', value: 'KH001' });
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

  it('uses Vietnamese defaults for the shared search control', () => {
    const { container } = mount(new ListToolbar('toolbar', {}, {}));
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    expect(input.placeholder).toBe('Tìm kiếm…');
    expect(input.getAttribute('aria-label')).toBe('Tìm kiếm danh sách');
  });

  it('can keep actions inline with a date range', () => {
    const { container } = mount(new ListToolbar('toolbar', {}, {
      search: false,
      date_range: { presets: ['month'], preset_style: 'segmented' },
      actions: [{ id: 'export', label: 'Export' }],
      actions_inline: true,
    }));

    expect(container.querySelector('[data-date-preset="month"]')).not.toBeNull();
    expect(container.querySelector('[data-toolbar-action="export"]')).not.toBeNull();
    expect(container.querySelector('.basis-full')).toBeNull();
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

  it('removes unrestricted presets and constrains protected date inputs', () => {
    const { container } = mount(new ListToolbar('toolbar', {}, {
      search: false,
      date_range: { presets: ['month', 'all'], max_years: 2, deny_unbounded: true },
    }));
    expect(container.querySelector('[data-date-preset="all"]')).toBeNull();
    const from = container.querySelector<HTMLInputElement>('input[aria-label="Từ ngày"]')!;
    expect(from.min).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(from.max).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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

  it('retains manually edited date bounds and clears the preset state', () => {
    const component = new ListToolbar('toolbar', { preset: 'month' }, {
      search: false,
      date_range: { presets: ['month', 'all'] },
    });
    const submit = vi.spyOn(component, 'submit').mockResolvedValue({});
    const { container } = mount(component);
    const from = container.querySelector<HTMLInputElement>('input[aria-label="Từ ngày"]')!;

    from.value = '2026-07-10';
    from.dispatchEvent(new Event('change', { bubbles: true }));

    expect(component.state.from_date).toBe('2026-07-10');
    expect(component.state.preset).toBeUndefined();
    expect(submit).toHaveBeenCalledWith('date-range', { from_date: '2026-07-10' });
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

  it('retains declarative filter values for later redraws', () => {
    const component = new ListToolbar('toolbar', {}, {
      search: false,
      filters: [{ field: 'status', label: 'Trạng thái', options: ['Active', 'Inactive'] }],
    });
    const submit = vi.spyOn(component, 'submit').mockResolvedValue({});
    const { container } = mount(component);
    const select = container.querySelector<HTMLSelectElement>('select[aria-label="Trạng thái"]')!;

    select.value = 'Inactive';
    select.dispatchEvent(new Event('change', { bubbles: true }));

    expect(component.state.status).toBe('Inactive');
    expect(submit).toHaveBeenCalledWith('filter', { status: 'Inactive' });
  });

  it('renders an empty option list when a filter is supplied by a datasource', () => {
    const { container } = mount(new ListToolbar('toolbar', {}, {
      filters: [{ field: 'shipment_type', label: 'Shipment type', options_source: 'shipment_types' }],
    }));
    expect(container.querySelectorAll('select option')).toHaveLength(1);
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

describe('FilterBar', () => {
  it('supports declarative localized select and clear labels', () => {
    const component = new FilterBar('localized-filters', { values: {} }, [{
      field: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'Active', label: 'Đang dùng' }],
    }], { all: 'Tất cả', clear: 'Xóa bộ lọc' });
    const container = document.createElement('div');
    component.mount(container);
    expect(container.querySelector('option')?.textContent).toBe('Tất cả');
    expect(container.querySelector('button')?.textContent).toBe('Xóa bộ lọc');
  });

  it('preserves datasource option labels while emitting values', () => {
    const component = new FilterBar('filters', { values: { type: 'SEMI' } }, [{
      field: 'type',
      label: 'Vehicle type',
      type: 'select',
      options: [{ value: 'SEMI', label: 'SEMI - Đầu kéo' }],
    }]);
    const container = document.createElement('div');
    component.mount(container);
    const option = container.querySelectorAll('option')[1]!;

    expect(option.textContent).toBe('SEMI - Đầu kéo');
    expect(option.value).toBe('SEMI');
  });
});

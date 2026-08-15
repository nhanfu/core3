import { afterEach, describe, expect, it, vi } from 'vitest';
import { client } from '@core3/client/client';
import { PageRuntime } from '@core3/client/components/PageRoot';

const renderPage = (config: any, { container = document.body }: { container?: HTMLElement } = {}) =>
  new PageRuntime(config, new Map()).render(container);

describe('YAML form modal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    window.history.pushState({}, '', '/');
    delete window.__CORE3_USER__;
  });

  it('renders declarative toolbar icons through the shared SVG registry', async () => {
    vi.spyOn(client, 'query').mockResolvedValue({ data: [], meta: { total: 0 } });
    const container = document.createElement('div');
    await renderPage({
      page: { id: 'toolbar-icon-test' },
      toolbar: [{ id: 'back', label: 'Danh sách', icon: 'arrow-left', action: 'back' }],
      actions: [{ id: 'back', type: 'navigate', navigate_to: '/items' }],
    }, { container });

    expect(container.querySelector('.page-toolbar button svg')).not.toBeNull();
    expect(container.querySelector('.page-toolbar button')?.textContent).toContain('Danh sách');
  });

  it('renders an accessible dialog and closes on Escape', async () => {
    vi.spyOn(client, 'query').mockResolvedValue({ data: [{ id: 'item-1', name: 'Existing' }], meta: { total: 1 } });
    window.__CORE3_USER__ = { permissions: ['items.write'] };
    const container = document.createElement('div');
    document.body.appendChild(container);

    await renderPage({
      page: { id: 'modal-test' },
      datasources: [{ id: 'items', single: false, permission: 'items.read', query: 'SELECT 1' }],
      toolbar: [{ id: 'add_item', label: '+ Thêm', action: 'add_item' }],
      components: [{
        type: 'DataGrid',
        source: 'items',
        columns: [{ field: 'name', label: 'Tên' }],
      }],
      actions: [{
        id: 'add_item',
        type: 'form',
        permission: 'items.write',
        title: 'Thêm mục',
        table: 'master_data',
        operation: 'insert',
        fields: [{ field: 'name', label: 'Tên', type: 'text', required: true }],
      }],
    }, { container });

    [...container.querySelectorAll('button')]
      .find(button => button.textContent?.includes('Thêm'))
      ?.click();

    const dialog = document.querySelector('[role="dialog"]') as HTMLElement | null;
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBeTruthy();
    const input = dialog?.querySelector('input');
    expect(dialog?.querySelector('label')?.htmlFor).toBe(input?.id);
    expect(input?.classList.contains('form-control')).toBe(true);
    expect(input?.getAttribute('style')).toBeNull();
    expect(document.activeElement).toBe(input);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders localized object options without changing submitted values', async () => {
    vi.spyOn(client, 'query').mockResolvedValue({ data: [], meta: { total: 0 } });
    window.__CORE3_USER__ = { permissions: ['items.write'] };
    const container = document.createElement('div');
    await renderPage({
      page: { id: 'localized-options-test' },
      components: [{ type: 'DataGrid', source: 'items', columns: [{ field: 'name', label: 'Tên' }] }],
      actions: [{
        id: 'add_item', type: 'form', permission: 'items.write', title: 'Thêm mục', table: 'items', operation: 'insert',
        fields: [{
          field: 'status', label: 'Trạng thái', type: 'select',
          options: [{ id: 'Active', label: 'Hoạt động' }, { id: 'Inactive', label: 'Ngưng hoạt động' }],
        }],
      }],
      toolbar: [{ id: 'add_item_button', label: '+ Thêm', action: 'add_item' }],
    }, { container });

    container.querySelector<HTMLButtonElement>('button')?.click();
    const options = [...document.querySelectorAll<HTMLSelectElement>('[role="dialog"] select option')];
    expect(options.map(option => [option.value, option.textContent])).toEqual([
      ['', 'Chọn…'], ['Active', 'Hoạt động'], ['Inactive', 'Ngưng hoạt động'],
    ]);
  });

  it('renders a searchable lookup field and submits its selected value', async () => {
    vi.spyOn(client, 'query').mockResolvedValue({ data: [{ value: 'customer-1', label: 'Acme Logistics' }], meta: { total: 1 } });
    const patch = vi.spyOn(client, 'patch').mockResolvedValue({ ok: true });
    window.__CORE3_USER__ = { permissions: ['orders.write'] };
    const container = document.createElement('div');
    await renderPage({
      page: { id: 'async-select-test' },
      datasources: [{ id: 'customers', single: false, permission: 'crm.read', query: 'SELECT id AS value, name AS label FROM customers' }],
      toolbar: [{ id: 'add_order', label: 'Thêm đơn', action: 'add_order' }],
      actions: [{
        id: 'add_order', type: 'form', permission: 'orders.write', title: 'Thêm đơn', table: 'orders', operation: 'insert',
        fields: [{ field: 'customer_name', label: 'Khách hàng', type: 'async-select', options_source: 'customers', required: true }],
      }],
    }, { container });

    container.querySelector<HTMLButtonElement>('button')?.click();
    const dialog = document.querySelector('[role="dialog"]')!;
    dialog.querySelector<HTMLButtonElement>('[role="option"]')!.click();
    dialog.querySelector<HTMLButtonElement>('button.btn-primary')!.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(patch).toHaveBeenCalledWith(expect.objectContaining({
      table: 'orders',
      changes: [{ field: 'customer_name', value: 'customer-1' }],
    }));
  });

  it('renders multi-select lookups and submits an array of selected values', async () => {
    vi.spyOn(client, 'query').mockResolvedValue({ data: [{ value: 'role-admin', label: 'Administrator' }, { value: 'role-dispatch', label: 'Dispatcher' }], meta: { total: 2 } });
    const patch = vi.spyOn(client, 'patch').mockResolvedValue({ ok: true });
    window.__CORE3_USER__ = { permissions: ['settings.write'] };
    const container = document.createElement('div');
    await renderPage({
      page: { id: 'multi-select-test' },
      datasources: [{ id: 'roles', single: false, permission: 'settings.read', query: 'SELECT id AS value, name AS label FROM roles' }],
      toolbar: [{ id: 'add_user', label: 'Thêm người dùng', action: 'add_user' }],
      actions: [{
        id: 'add_user', type: 'form', permission: 'settings.write', title: 'Thêm người dùng', table: 'users', operation: 'insert',
        fields: [{ field: 'roles', label: 'Vai trò', type: 'multi-select', options_source: 'roles', multiple: true }],
      }],
    }, { container });

    container.querySelector<HTMLButtonElement>('button')?.click();
    const dialog = document.querySelector('[role="dialog"]')!;
    const options = dialog.querySelectorAll<HTMLButtonElement>('[role="option"]');
    options[0].click();
    options[1].click();
    dialog.querySelector<HTMLButtonElement>('button.btn-primary')!.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(patch).toHaveBeenCalledWith(expect.objectContaining({
      table: 'users',
      changes: [{ field: 'roles', value: ['role-admin', 'role-dispatch'] }],
    }));
  });

  it('preserves trip timestamp precision in datetime form fields', async () => {
    vi.spyOn(client, 'query').mockResolvedValue({ data: { id: 'trip-1', departure_time: '2026-07-27T14:30:00.000Z' }, meta: {} });
    const patch = vi.spyOn(client, 'patch').mockResolvedValue({ ok: true });
    window.__CORE3_USER__ = { permissions: ['trips.write'] };
    const container = document.createElement('div');
    await renderPage({
      page: { id: 'datetime-test' },
      components: [{ type: 'DocumentSummary', source: 'trip', title_field: 'id' }],
      toolbar: [{ id: 'edit_trip', label: 'Sửa chuyến', action: 'edit_trip' }],
      datasources: [{ id: 'trip', single: true, permission: 'trips.read', query: 'SELECT id, departure_time FROM trips' }],
      actions: [{
        id: 'edit_trip', type: 'form', permission: 'trips.write', title: 'Cập nhật chuyến', table: 'trips', operation: 'update', prefill: 'source', prefill_source: 'trip',
        fields: [{ field: 'departure_time', label: 'Thời gian khởi hành', type: 'datetime' }],
      }],
    }, { container });

    container.querySelector<HTMLButtonElement>('button')?.click();
    const input = document.querySelector<HTMLInputElement>('[role="dialog"] input')!;
    expect(input.value).toBe('2026-07-27T14:30');
    input.value = '2026-07-28T09:45';
    document.querySelector<HTMLButtonElement>('[role="dialog"] button.btn-primary')!.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(patch).toHaveBeenCalledWith(expect.objectContaining({
      table: 'trips',
      id: 'trip-1',
      changes: [{ field: 'departure_time', value: '2026-07-28T09:45' }],
    }));
  });

  it('hides toolbar actions when their state condition is false', async () => {
    vi.spyOn(client, 'query').mockResolvedValue({ data: { status: 'Approved' }, meta: {} });
    const container = document.createElement('div');
    await renderPage({
      page: { id: 'conditional-toolbar-test' },
      datasources: [{ id: 'detail', single: true, permission: 'items.read', query: 'SELECT status FROM items' }],
      toolbar: [{ id: 'edit', label: 'Sửa', action: 'edit', show_if: "state.detail.status === 'Draft'" }],
      actions: [{ id: 'edit', type: 'form', permission: 'items.write', title: 'Sửa', table: 'items', operation: 'update', fields: [{ field: 'name', label: 'Tên', type: 'text' }] }],
    }, { container });

    expect(container.querySelector('button')).toBeNull();
  });

  it('filters form fields through the page state show_if contract', async () => {
    vi.spyOn(client, 'query').mockResolvedValue({ data: [], meta: { total: 0 } });
    window.__CORE3_USER__ = { permissions: ['items.write'] };
    const container = document.createElement('div');
    window.history.pushState({}, '', '?kind=customer');
    await renderPage({
      page: { id: 'conditional-form-test' },
      toolbar: [{ id: 'edit', label: 'Sửa', action: 'edit' }],
      actions: [{
        id: 'edit', type: 'form', permission: 'items.write', title: 'Sửa đối tượng', table: 'customers', operation: 'update',
        fields: [
          { field: 'stage', label: 'Giai đoạn CRM', type: 'select', show_if: "state.kind === 'customer'" },
          { field: 'partner_type', label: 'Loại đối tác', type: 'select', show_if: "state.kind === 'partner'" },
        ],
      }],
    }, { container });

    container.querySelector<HTMLButtonElement>('button')?.click();
    const labels = [...document.querySelectorAll<HTMLLabelElement>('[role="dialog"] label')].map(label => label.textContent);
    expect(labels).toEqual(['Giai đoạn CRM']);
  });

  it('hides row actions when the current user lacks the declared permission', async () => {
    vi.spyOn(client, 'query').mockResolvedValue({
      data: [{ id: 'item-1', name: 'Existing' }],
      meta: { total: 1 },
    });
    window.__CORE3_USER__ = { permissions: [] };
    const container = document.createElement('div');

    await renderPage({
      page: { id: 'row-permission-test' },
      components: [{
        type: 'DataGrid',
        source: 'items',
        columns: [{
          field: 'actions',
          label: '',
          actions: [{ id: 'edit_item', label: 'Sửa', permission: 'items.write' }],
        }],
      }],
      actions: [{
        id: 'edit_item',
        type: 'form',
        permission: 'items.write',
        title: 'Sửa',
        table: 'items',
        operation: 'update',
        fields: [{ field: 'name', label: 'Tên', type: 'text' }],
      }],
    }, { container });

    expect(container.querySelector('[data-grid-row-action]')).toBeNull();
  });
});

describe('YAML tab groups', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders token-backed tab classes and switches panels accessibly', async () => {
    vi.spyOn(client, 'query').mockResolvedValue({ data: [], meta: { total: 0 } });
    const container = document.createElement('div');

    await renderPage({
      page: { id: 'tabs-test' },
      components: [{
        type: 'TabGroup',
        tabs: [
          { id: 'one', label: 'Một', components: [] },
          { id: 'two', label: 'Hai', components: [] },
        ],
      }],
    }, { container });

    const tabs = [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const panels = [...container.querySelectorAll<HTMLElement>('.tab-panel')];
    expect(tabs[0].classList.contains('is-active')).toBe(true);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(panels[1].classList.contains('tab-panel-hidden')).toBe(true);

    tabs[1].click();
    expect(tabs[0].classList.contains('is-active')).toBe(false);
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(panels[0].classList.contains('tab-panel-hidden')).toBe(true);
    expect(panels[1].getAttribute('style')).toBeNull();
  });
});

describe('YAML status tabs', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('does not request facet counts when badge rendering is disabled', async () => {
    const query = vi.spyOn(client, 'query').mockResolvedValue({
      data: [{ id: 'vehicle-1', status: 'Active' }],
      meta: { total: 1, page: 1, pageSize: 25 },
    });
    const container = document.createElement('div');

    await renderPage({
      page: { id: 'badge-free-tabs-test' },
      datasources: [{ id: 'vehicles', single: false, permission: 'fleet.read', query: 'SELECT id, status FROM trucks' }],
      components: [{
        type: 'StatusTabs', source: 'vehicles', filter_field: 'status', show_counts: false,
        tabs: [{ id: '', label: 'Tất cả' }, { id: 'Active', label: 'Sẵn sàng' }],
      }],
    }, { container });

    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenLastCalledWith(expect.not.objectContaining({ facetField: 'status' }));
    expect(container.querySelector('[role="tablist"]')?.textContent).toContain('Tất cả');
    expect(container.querySelector('[role="tablist"]')?.textContent).not.toContain('1');
  });
});

describe('YAML DataGrid sorting', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('forwards sortable-header changes as a server query sort', async () => {
    const query = vi.spyOn(client, 'query').mockResolvedValue({
      data: [{ id: 'a', name: 'Alpha' }],
      meta: { total: 1, page: 1, pageSize: 25 },
    });
    const container = document.createElement('div');

    await renderPage({
      page: { id: 'sort-test' },
      components: [{
        type: 'DataGrid',
        source: 'items',
        columns: [{ field: 'name', label: 'Tên', sortable: true }],
      }],
      datasources: [{ id: 'items', single: false, permission: 'items.read', query: 'SELECT id, name FROM items' }],
    }, { container });

    container.querySelector<HTMLButtonElement>('[data-sort-field="name"]')?.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(query).toHaveBeenLastCalledWith(expect.objectContaining({
      sort: { field: 'name', direction: 'asc' },
      skip: 0,
      top: 25,
    }));
  });
});

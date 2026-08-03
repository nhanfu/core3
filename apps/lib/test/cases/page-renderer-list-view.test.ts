import { afterEach, describe, expect, it, vi } from 'vitest';
import { client } from '../../client.ts';
import { PageRuntime } from '../../components/PageRoot.ts';

const renderPage = (config: any, { container = document.body }: { container?: HTMLElement } = {}) =>
  new PageRuntime(config, new Map()).render(container);

describe('YAML Odoo ListView renderer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    window.history.replaceState({}, '', '/');
    delete window.__CORE3_USER__;
  });

  it('owns the page control panel and filters row commands by permission and state', async () => {
    vi.spyOn(client, 'query').mockResolvedValue({
      data: [{ id: 'o1', number: 'ORD-001', status: 'Draft' }],
      meta: { total: 1, page: 1, pageSize: 50 },
    });
    window.__CORE3_USER__ = { permissions: ['orders.read', 'orders.write'] };
    const container = document.createElement('div');
    await renderPage({
      title: 'Orders',
      page: { id: 'orders', breadcrumb: ['Management', 'Orders'] },
      datasources: [{ id: 'orders', permission: 'orders.read', query: 'SELECT 1' }],
      components: [{
        type: 'ListView', variant: 'odoo', source: 'orders', create_action: 'add', create_label: 'New',
        row_open_action: 'view', row_actions: 'menu', selectable: true, column_chooser: true,
        search: { placeholder: 'Search...' }, filters: [{ field: 'status', label: 'Status', options: ['Draft'] }],
        columns: [
          { field: 'number', label: 'Order' },
          { field: 'actions', label: '', actions: [
            { id: 'edit', label: 'Edit', permission: 'orders.write', show_if: "row.status === 'Draft'" },
            { id: 'approve', label: 'Approve', permission: 'orders.approve' },
          ] },
        ],
      }],
      actions: [
        { id: 'add', type: 'form', permission: 'orders.write', title: 'Add', table: 'orders', operation: 'insert', fields: [{ field: 'number', label: 'Order', type: 'text' }] },
        { id: 'view', type: 'navigate', permission: 'orders.read', navigate_to: '/orders/detail' },
        { id: 'edit', type: 'form', permission: 'orders.write', title: 'Edit', table: 'orders', operation: 'update', fields: [{ field: 'number', label: 'Order', type: 'text' }] },
        { id: 'approve', type: 'server', permission: 'orders.approve', action: 'approve', handler: 'approve' },
      ],
    }, { container });

    expect(container.querySelector('.page-header')).toBeNull();
    expect(container.querySelector('.o-list-breadcrumbs')?.textContent).toContain('Management / Orders');
    expect(container.querySelector('[data-list-create="add"]')).not.toBeNull();
    expect(container.querySelector('[data-list-row-action="edit:o1"]')).not.toBeNull();
    expect(container.querySelector('[data-list-row-action="approve:o1"]')).toBeNull();
  });

  it('renders the view selected by the URL', async () => {
    vi.spyOn(client, 'query').mockResolvedValue({
      data: [{ id: 'o1', number: 'ORD-001', status: 'Draft' }],
      meta: { total: 1, page: 1, pageSize: 50 },
    });
    window.__CORE3_USER__ = { permissions: ['orders.read'] };
    window.history.replaceState({}, '', '/tms/orders?view=kanban');
    const container = document.createElement('div');
    await renderPage({
      title: 'Orders',
      page: { id: 'orders', breadcrumb: ['Management', 'Orders'] },
      datasources: [{ id: 'orders', permission: 'orders.read', query: 'SELECT 1' }],
      components: [{
        type: 'ListView', variant: 'odoo', source: 'orders',
        views: [
          { id: 'list', label: 'List' },
          { id: 'kanban', label: 'Kanban', group_by: 'status', groups: [{ value: 'Draft', label: 'Draft' }], card: { title: 'number' } },
        ],
        columns: [{ field: 'number', label: 'Order' }],
      }],
    }, { container });

    expect(container.querySelector('.o-kanban-board')).not.toBeNull();
    expect(container.querySelector('.o-list-table')).toBeNull();

    container.querySelector<HTMLButtonElement>('[data-list-view="list"]')!.click();
    expect(new URLSearchParams(window.location.search).get('view')).toBe('list');
  });

  it('passes calendar date metadata from YAML to the CalendarView', async () => {
    vi.spyOn(client, 'query').mockResolvedValue({
      data: [{ id: 'o1', order_number: 'ORD-001', order_date: '2026-07-19' }],
      meta: { total: 1, page: 1, pageSize: 50 },
    });
    window.__CORE3_USER__ = { permissions: ['orders.read'] };
    window.history.replaceState({}, '', '/tms/orders?view=calendar');
    const container = document.createElement('div');
    await renderPage({
      title: 'Orders',
      page: { id: 'orders', breadcrumb: ['Management', 'Orders'] },
      datasources: [{ id: 'orders', permission: 'orders.read', query: 'SELECT 1' }],
      components: [{
        type: 'ListView', variant: 'odoo', source: 'orders',
        views: [
          { id: 'list', label: 'List' },
          { id: 'calendar', label: 'Calendar', date_field: 'order_date', card: { title: 'order_number' } },
        ],
        columns: [{ field: 'order_number', label: 'Order' }],
      }],
    }, { container });

    expect(container.querySelector('[data-row-id="o1"]')?.textContent).toBe('ORD-001');
  });

  it('renders every configured detail component in the FormView side panel', async () => {
    vi.useFakeTimers();
    try {
      vi.spyOn(client, 'query').mockResolvedValue({
        data: [{ id: 'o1', number: 'ORD-001', status: 'Draft' }],
        meta: { total: 1, page: 1, pageSize: 50 },
      });
      vi.spyOn(client, '_fetch').mockResolvedValue({
        title: 'Order details',
        page: { id: 'order-detail' },
        datasources: [{ id: 'order_detail', data: { id: 'o1', number: 'ORD-001', status: 'Draft' } }],
        components: [
          { type: 'PageIntro', title: 'Configured detail component' },
          {
            type: 'OdooFormView', source: 'order_detail', title_field: 'number', status_field: 'status',
            statusbar: [{ value: 'Draft', label: 'Draft' }, { value: 'Approved', label: 'Approved' }],
            header_actions: [
              { id: 'edit_order', label: 'Edit', variant: 'secondary', show_if: "state.order_detail.status === 'Draft'" },
              { id: 'approve', label: 'Approve', variant: 'primary', show_if: "state.order_detail.status === 'Draft'" },
            ],
            fields: [{ field: 'number', label: 'Order' }],
          },
        ],
        actions: [
          { id: 'edit_order', type: 'form', permission: 'orders.write', operation: 'update', table: 'orders', fields: [{ field: 'number', label: 'Order', type: 'text' }] },
          { id: 'approve', type: 'server', permission: 'orders.read', action: 'approve', handler: 'approve' },
        ],
      });
      window.__CORE3_USER__ = { permissions: ['orders.read', 'orders.write'] };
      const patchSpy = vi.spyOn(client, 'patch').mockResolvedValue({});
      const container = document.createElement('div');
      await renderPage({
        title: 'Orders',
        page: { id: 'orders', breadcrumb: ['Management', 'Orders'] },
        datasources: [{ id: 'orders', permission: 'orders.read', query: 'SELECT 1' }],
        components: [{
          type: 'ListView', variant: 'odoo', source: 'orders',
          views: [{ id: 'list', label: 'List' }, { id: 'form', label: 'Form' }],
          form_view: { page: 'order-detail.yaml', side_panel: true },
          columns: [{ field: 'number', label: 'Order' }],
        }],
      }, { container });

      container.querySelector<HTMLElement>('[data-row-id="o1"] [data-column="number"]')!.click();
      await vi.advanceTimersByTimeAsync(250);
      await vi.runAllTimersAsync();
      await vi.waitFor(() => expect(container.querySelector('.o-list-form-side-panel .o-form-view')).not.toBeNull());
      expect(container.querySelector('.o-list-form-side-panel')?.textContent).toContain('Configured detail component');
      expect(Array.from(container.querySelectorAll('.o-list-form-side-panel .o-form-action')).some(button => button.textContent === 'Approve')).toBe(true);
      expect(container.querySelector('.o-list-form-side-panel .o-form-statusbar-step.is-current')?.textContent).toBe('Draft');
      container.querySelector<HTMLButtonElement>('.o-list-form-side-panel .o-form-action-secondary')!.click();
      expect(container.querySelector('.o-list-form-side-panel .o-form-inline-editor')).not.toBeNull();
      const saveButton = Array.from(container.querySelectorAll<HTMLButtonElement>('.o-list-form-side-panel .o-form-action-primary'))
        .find(button => button.textContent === 'Save');
      saveButton!.click();
      await vi.waitFor(() => expect(patchSpy).toHaveBeenCalled());
    } finally {
      vi.useRealTimers();
    }
  });
});

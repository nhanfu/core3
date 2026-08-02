import { afterEach, describe, expect, it, vi } from 'vitest';
import { client } from '../../client.ts';
import { renderPage } from '../../page-renderer.ts';

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
});

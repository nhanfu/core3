import { describe, expect, it, vi } from 'vitest';
import { CardView } from '../../components/CardView.ts';

describe('CardView', () => {
  it('renders grouped Kanban-style cards and routes on selection', () => {
    const host = document.createElement('div');
    const submit = vi.fn();
    const view = new CardView('orders-card', {
      rows: [{ id: 'o1', number: 'ORD-001', customer: 'Acme', status: 'Draft' }],
      groupBy: 'status',
    }, {
      view: {
        id: 'card',
        label: 'Cards',
        groupBy: 'status',
        groups: [{ value: 'Draft', label: 'Draft' }],
        card: { title: 'number', subtitle: 'customer', fields: [{ field: 'status', label: 'Status' }] },
      },
      openAction: 'view_order',
    });
    view._transport = { submit };
    view.mount(host);

    const card = host.querySelector<HTMLElement>('.o-card-view-item')!;
    expect(host.querySelector('[data-card-group="Draft"]')).not.toBeNull();
    expect(card.textContent).toContain('ORD-001');
    expect(card.textContent).toContain('Acme');
    expect(card.textContent).toContain('Draft');
    card.click();
    expect(submit).toHaveBeenCalledWith('view_order', { row: expect.objectContaining({ id: 'o1' }) });
  });

  it('does not group from the card view definition without searchbar grouping state', () => {
    const host = document.createElement('div');
    const view = new CardView('orders-card', {
      rows: [{ id: 'o1', number: 'ORD-001', status: 'Draft' }],
    }, {
      view: { id: 'card', label: 'Cards', groupBy: 'status', card: { title: 'number' } },
    });
    view.mount(host);

    expect(host.querySelector('[data-card-group]')).toBeNull();
    expect(host.querySelectorAll('.o-card-view-item')).toHaveLength(1);
  });

  it('uses one localized group when rows contain the group label instead of its code', () => {
    const host = document.createElement('div');
    const view = new CardView('orders-card', {
      rows: [{ id: 'o1', number: 'ORD-001', status_label: 'Nháp' }],
      groupBy: 'status_label',
    }, {
      view: {
        id: 'card',
        label: 'Cards',
        groups: [{ value: 'Draft', label: 'Nháp' }],
        card: { title: 'number' },
      },
    });
    view.mount(host);

    expect(host.querySelectorAll('[data-card-group]')).toHaveLength(1);
    expect(host.querySelector('[data-card-group="Draft"]')?.textContent).toContain('Nháp');
    expect(host.querySelector('[data-card-group="Draft"]')?.textContent).not.toContain('Draft');
  });
});

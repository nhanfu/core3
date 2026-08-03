import { describe, expect, it, vi } from 'vitest';
import { CardView } from '../../components/CardView.ts';

describe('CardView', () => {
  it('renders grouped Kanban-style cards and routes on selection', () => {
    const host = document.createElement('div');
    const submit = vi.fn();
    const view = new CardView('orders-card', {
      rows: [{ id: 'o1', number: 'ORD-001', customer: 'Acme', status: 'Draft' }],
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
});

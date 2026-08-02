import { describe, expect, it, vi } from 'vitest';
import { KanbanView } from '../../components/KanbanView.ts';

describe('KanbanView', () => {
  it('renders independently from ListView and supports grouped cards', () => {
    const host = document.createElement('div');
    const onMove = vi.fn();
    new KanbanView('orders-kanban', {
      rows: [{ id: 'o1', status: 'Draft', number: 'ORD-001' }],
    }, {
      view: {
        id: 'kanban',
        label: 'Kanban',
        groupBy: 'status',
        groups: [{ value: 'Draft', label: 'Draft' }],
        card: { title: 'number' },
      },
      onMove,
    }).mount(host);

    expect(host.querySelector('.o-kanban-board')).not.toBeNull();
    expect(host.querySelector('[data-kanban-group="Draft"]')?.textContent).toContain('ORD-001');
  });
});

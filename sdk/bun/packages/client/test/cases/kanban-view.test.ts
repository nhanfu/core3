import { describe, expect, it, vi } from 'vitest';
import { KanbanView } from '@core3/client/components/KanbanView';

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

  it('renders an image or initials fallback when the card declares an avatar field', () => {
    const host = document.createElement('div');
    new KanbanView('employees-kanban', {
      rows: [{ id: 'e1', status: 'Active', name: 'Nguyen Minh Anh', image_url: null }],
    }, {
      view: {
        id: 'kanban', label: 'Kanban', groupBy: 'status', groups: [{ value: 'Active', label: 'Active' }],
        card: { title: 'name', image_field: 'image_url' },
      },
    }).mount(host);

    expect(host.querySelector('.o-kanban-card.has-avatar')).not.toBeNull();
    expect(host.querySelector('.o-kanban-card-avatar-initials')?.textContent).toBe('NM');
  });
});

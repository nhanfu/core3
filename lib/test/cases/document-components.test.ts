import { describe, expect, it } from 'vitest';
import { ApprovalTimeline } from '../../components/ApprovalTimeline.ts';
import { ContactGrid } from '../../components/ContactGrid.ts';
import { DataGrid } from '../../components/DataGrid.ts';
import { DocumentSummary } from '../../components/DocumentSummary.ts';
import { LineItemGrid } from '../../components/LineItemGrid.ts';
import { MoneySummary } from '../../components/MoneySummary.ts';

function mount(component: { mount(container: HTMLElement): void }) {
  const container = document.createElement('div');
  component.mount(container);
  return container;
}

describe('document detail components', () => {
  it('renders document identity, state, and configured metadata', () => {
    const container = mount(new DocumentSummary('summary', {
      record: {
        code: 'DH-001',
        customer: 'Acme Logistics',
        status_label: 'Draft',
        route: 'HCM - Ha Noi',
      },
    }, {
      title_field: 'code',
      subtitle_field: 'customer',
      status_field: 'status_label',
      status_colors: { Draft: 'neutral' },
      columns: [{ field: 'route', label: 'Route' }],
    }));

    expect(container.textContent).toContain('DH-001');
    expect(container.textContent).toContain('Acme Logistics');
    expect(container.textContent).toContain('HCM - Ha Noi');
  });

  it('renders derived money values and activity events', () => {
    const money = mount(new MoneySummary('money', {
      record: { revenue: '12,000,000', profit: '3,000,000' },
    }, {
      title: 'Totals',
      stats: [
        { label: 'Revenue', field: 'revenue' },
        { label: 'Profit', field: 'profit' },
      ],
    }));
    expect(money.textContent).toContain('12,000,000');
    expect(money.textContent).toContain('3,000,000');

    const timeline = mount(new ApprovalTimeline('timeline', {
      events: [{
        action_label: 'Approved',
        actor_name: 'Admin',
        detail: 'Draft -> Approved',
        created_at: '2026-07-26 10:00',
      }],
    }, {}));
    expect(timeline.textContent).toContain('Approved');
    expect(timeline.textContent).toContain('Admin');
    expect(timeline.textContent).toContain('Draft -> Approved');
  });

  it('keeps line-item grids on the shared DataGrid behavior', () => {
    const grid = new LineItemGrid('lines', { rows: [] }, []);
    expect(grid).toBeInstanceOf(DataGrid);
    expect(new ContactGrid('contacts', { rows: [] }, [])).toBeInstanceOf(DataGrid);
  });
});

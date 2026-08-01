import { describe, expect, it } from 'vitest';
import { ApprovalTimeline } from '../../components/ApprovalTimeline.ts';
import { AsyncSelect } from '../../components/AsyncSelect.ts';
import { ContactGrid } from '../../components/ContactGrid.ts';
import { DataGrid } from '../../components/DataGrid.ts';
import { DocumentSummary } from '../../components/DocumentSummary.ts';
import { LineItemGrid } from '../../components/LineItemGrid.ts';
import { MoneySummary } from '../../components/MoneySummary.ts';
import { MoneyInput } from '../../components/MoneyInput.ts';
import { ScheduleGrid } from '../../components/ScheduleGrid.ts';

function mount(component: { mount(container: HTMLElement): void }) {
  const container = document.createElement('div');
  component.mount(container);
  return container;
}

describe('document detail components', () => {
  it('filters searchable lookup options and preserves selected values', () => {
    const component = new AsyncSelect('customer', { value: '' }, {
      options: [{ value: 'acme', label: 'Acme Logistics' }, { value: 'beta', label: 'Beta Transport' }],
      search_placeholder: 'Tìm khách hàng...',
    });
    const container = mount(component);
    const search = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'beta';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(container.querySelectorAll('[role="option"]')).toHaveLength(1);
    container.querySelector<HTMLButtonElement>('[role="option"]')!.click();
    expect(component.input?.value).toBe('beta');
    expect(container.textContent).toContain('Beta Transport');
  });

  it('serializes multi-value lookup selections', () => {
    const component = new AsyncSelect('employees', { value: ['one'] }, {
      multiple: true,
      options: [{ value: 'one', label: 'One' }, { value: 'two', label: 'Two' }],
    });
    const container = mount(component);
    const second = [...container.querySelectorAll<HTMLButtonElement>('[role="option"]')]
      .find(option => option.textContent === 'Two')!;
    second.click();
    expect(component.input?.value).toBe('one,two');
    container.querySelector<HTMLButtonElement>('[aria-label="Bỏ chọn One"]')!.click();
    expect(component.input?.value).toBe('two');
  });

  it('formats VND for display while keeping a plain numeric submission value', () => {
    const component = new MoneyInput('amount', { value: 1234567 }, { currency: 'VND' });
    const container = mount(component);
    const display = container.querySelector<HTMLInputElement>('.core3-money-input-display')!;
    expect(display.value).toBe('1.234.567');
    display.value = '9.876.543';
    display.dispatchEvent(new Event('input', { bubbles: true }));
    expect(component.input?.value).toBe('9876543');
    display.dispatchEvent(new Event('blur'));
    expect(display.value).toBe('9.876.543');
  });

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

  it('renders configured empty-state copy for activity timelines', () => {
    const timeline = mount(new ApprovalTimeline('timeline', { events: [] }, {
      title: 'Lịch sử chứng từ',
      empty_state: { title: 'Chưa có hoạt động chứng từ' },
    }));

    expect(timeline.textContent).toContain('Lịch sử chứng từ');
    expect(timeline.textContent).toContain('Chưa có hoạt động chứng từ');
    expect(timeline.textContent).not.toContain('No activity yet');
  });

  it('maps raw activity actions through declarative labels', () => {
    const timeline = mount(new ApprovalTimeline('timeline', {
      events: [{ action: 'employment_contracts.update', actor_name: 'Admin', created_at: '2026-07-27' }],
    }, {
      title: 'Lịch sử hợp đồng',
      action_labels: { 'employment_contracts.update': 'Cập nhật hợp đồng' },
    }));

    expect(timeline.textContent).toContain('Cập nhật hợp đồng');
    expect(timeline.textContent).not.toContain('employment_contracts.update');
  });

  it('keeps line-item grids on the shared DataGrid behavior', () => {
    const grid = new LineItemGrid('lines', { rows: [] }, []);
    expect(grid).toBeInstanceOf(DataGrid);
    expect(new ContactGrid('contacts', { rows: [] }, [])).toBeInstanceOf(DataGrid);
  });

  it('renders resource rows across assignment dates', () => {
    const container = mount(new ScheduleGrid('schedule', {
      rows: [
        { work_date: '2026-07-27', employee_code: 'NV001', employee_name: 'Nguyen Van An', shift_code: 'S1', shift_name: 'Ca sáng', status: 'Present' },
        { work_date: '2026-07-28', employee_code: 'NV001', employee_name: 'Nguyen Van An', shift_code: 'S2', shift_name: 'Ca chiều', status: 'Leave' },
        { work_date: '2026-07-27', employee_code: 'NV002', employee_name: 'Tran Thi Bich', shift_code: 'S1', shift_name: 'Ca sáng', status: 'Present' },
      ],
    }, {
      title: 'Lịch phân ca',
      date_field: 'work_date',
      resource_field: 'employee_code',
      resource_label_field: 'employee_name',
      title_field: 'shift_code',
      subtitle_field: 'shift_name',
      status_field: 'status',
    }));

    expect(container.querySelector('[role="grid"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-schedule-date]')).toHaveLength(2);
    expect(container.textContent).toContain('Nguyen Van An');
    expect(container.textContent).toContain('Ca chiều');
    expect(container.querySelector('[data-status="Leave"]')).not.toBeNull();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { ApprovalTimeline } from '../../components/ApprovalTimeline.ts';
import { AsyncSelect } from '../../components/AsyncSelect.ts';
import { ContactGrid } from '../../components/ContactGrid.ts';
import { DataGrid } from '../../components/DataGrid.ts';
import { DocumentSummary } from '../../components/DocumentSummary.ts';
import { LineItemGrid } from '../../components/LineItemGrid.ts';
import { MoneySummary } from '../../components/MoneySummary.ts';
import { MoneyInput } from '../../components/MoneyInput.ts';
import { OdooFormView } from '../../components/OdooFormView.ts';
import { OdooChatter } from '../../components/OdooChatter.ts';
import { OdooFollowerManager } from '../../components/OdooFollowerManager.ts';
import { OdooAttachmentPanel } from '../../components/OdooAttachmentPanel.ts';
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

  it('renders an Odoo-style form sheet from declarative fields', () => {
    const container = mount(new OdooFormView('order', {
      record: { number: 'SO-001', customer: 'Acme Logistics', status: 'Draft', route: 'HCM - Hanoi' },
      messages: [{ actor_name: 'Admin', action_label: 'Created', detail: 'Order created', created_at: '2026-08-02' }],
      followers: [{ name: 'Admin' }],
    }, {
      title_field: 'number',
      subtitle_field: 'customer',
      status_field: 'status',
      status_colors: { Draft: 'neutral' },
      status_badges: [{ value: 'Cancelled', label: 'Cancelled', tone: 'red' }],
      statusbar: [{ value: 'Draft', label: 'Draft' }, { value: 'Approved', label: 'Approved' }],
      header_actions: [{ id: 'submit', label: 'Submit for approval', variant: 'primary' }],
      message_source: 'messages',
      follower_source: 'followers',
      group_columns: 2,
      groups: [{ title: 'Shipping', fields: [{ field: 'route', label: 'Route' }] }],
    }));

    expect(container.querySelector('.o-form-sheet')).not.toBeNull();
    expect(container.querySelector('.o-form-sheet-bg > .o-form-statusbar')).not.toBeNull();
    expect(container.querySelector('.o-form-groups-2')).not.toBeNull();
    expect(container.querySelector('.o-form-statusbar-step.is-current')?.textContent).toBe('Draft');
    expect(container.querySelector('.o-form-statusbar-step.is-current')?.getAttribute('aria-current')).toBe('step');
    expect(container.querySelector('.o-form-actionbar')?.textContent).toContain('Submit for approval');
    expect(container.textContent).toContain('SO-001');
    expect(container.textContent).toContain('Route');
    expect(container.textContent).toContain('HCM - Hanoi');
    expect(container.textContent).toContain('Messages and activities');
    expect(container.textContent).toContain('Followers');
    expect(container.textContent).not.toContain('Attachments');
  });

  it('shows exceptional workflow states outside the normal status progression', () => {
    const container = mount(new OdooFormView('cancelled-order', {
      record: { number: 'SO-002', status: 'Cancelled' },
    }, {
      title_field: 'number',
      status_field: 'status',
      statusbar: [{ value: 'Draft', label: 'Draft' }, { value: 'Approved', label: 'Approved' }],
      status_badges: [{ value: 'Cancelled', label: 'Cancelled', tone: 'red' }],
    }));

    expect(container.querySelector('.o-form-status-exception')?.textContent).toBe('Cancelled');
    expect(container.querySelector('.o-form-statusbar-step.is-current')).toBeNull();
  });

  it('supports inline edit, save, and discard lifecycle', async () => {
    const saved: any[] = [];
    const component = new OdooFormView('customer', { record: { id: 'c1', name: 'Acme', status: 'Active' } }, {
      title_field: 'name',
      editable: true,
      edit_action_id: 'edit_customer',
      edit_fields: [
        { field: 'name', label: 'Name', type: 'text' },
        { field: 'status', label: 'Status', type: 'select', options: [{ id: 'Active', label: 'Active' }, { id: 'Inactive', label: 'Inactive' }] },
      ],
      header_actions: [{ id: 'edit_customer', label: 'Edit', variant: 'secondary' }],
    });
    component.state.onInlineSave = async (values: any) => { saved.push(values); };
    const container = mount(component);
    container.querySelector<HTMLButtonElement>('.o-form-action')!.click();
    const name = container.querySelector<HTMLInputElement>('[data-form-field="name"]')!;
    name.value = 'Acme Updated';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    container.querySelector<HTMLButtonElement>('.o-form-action-primary')!.click();
    await Promise.resolve();
    expect(saved[0]).toMatchObject({ id: 'c1', name: 'Acme Updated' });
    expect(container.querySelector('[data-form-field="name"]')).toBeNull();
  });

  it('preserves embedded panel content when the form redraws', () => {
    const component = new OdooFormView('order', { record: { number: 'SO-001' } }, {
      title_field: 'number',
      content_slot: true,
      notebook: {
        tabs: [
          { id: 'lines', label: 'Order Lines', content_slot: true },
          { id: 'other', label: 'Other Information', fields: [{ field: 'note', label: 'Note' }] },
        ],
      },
    });
    const container = mount(component);
    const embedded = component.getEmbeddedContent();
    embedded.append(document.createTextNode('Order Lines'));

    component.setState({ record: { number: 'SO-002' } });

    expect(container.querySelector('.o-form-embedded-content')?.textContent).toBe('Order Lines');
  });

  it('switches declarative form notebook panels without redrawing embedded content', () => {
    const component = new OdooFormView('notebook-order', { record: { number: 'SO-003', note: 'Handle carefully' } }, {
      title_field: 'number',
      content_slot: true,
      notebook: {
        tabs: [
          { id: 'lines', label: 'Order Lines', content_slot: true },
          { id: 'other', label: 'Other Information', fields: [{ field: 'note', label: 'Note' }] },
        ],
      },
    });
    const container = mount(component);
    component.getEmbeddedContent().textContent = 'Line content';

    const other = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find(button => button.textContent === 'Other Information')!;
    other.click();

    expect(other.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector<HTMLElement>('[data-notebook-panel="other"]')?.hidden).toBe(false);
    expect(container.textContent).toContain('Handle carefully');
    expect(component.getEmbeddedContent().textContent).toBe('Line content');

    other.focus();
    other.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    const lines = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find(button => button.textContent === 'Order Lines')!;
    expect(lines.getAttribute('aria-selected')).toBe('true');
  });

  it('submits configured chatter actions with the current record id', async () => {
    const component = new OdooFormView('order', { record: { id: 'order-1', number: 'SO-001' } }, {
      title_field: 'number',
      message_source: 'messages',
      message_action: 'send_order_message',
    });
    const submitted: Array<{ action: string; params: any }> = [];
    component._transport = { submit: async (action: string, params: any) => { submitted.push({ action, params }); } };
    const container = mount(component);
    container.querySelector<HTMLButtonElement>('.o-form-chatter-primary')!.click();
    const composer = container.querySelector<HTMLFormElement>('.o-form-composer')!;
    expect(container.querySelector('.o-form-sheet')).not.toBeNull();
    const input = composer.querySelector<HTMLTextAreaElement>('textarea')!;
    input.value = 'Please review this order';
    composer.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    expect(submitted).toEqual([{ action: 'send_order_message', params: { id: 'order-1', content: 'Please review this order' } }]);
    expect(container.querySelector('.o-form-sheet')).not.toBeNull();
  });

  it('renders chatter followers as a tool menu and closes composers explicitly', () => {
    const chatter = new OdooChatter('chatter', {
      record: { id: 'order-1' },
      followers: [{ name: 'Admin User' }],
      messages: [{ actor_name: 'Admin User', action: 'orders.note', action_label: 'Log note', detail: 'Review rates', created_at: '2026-08-04 09:15:00' }],
    }, {
      message_source: 'messages',
      follower_source: 'followers',
      message_action: 'send_message',
      message_action_labels: { 'orders.note': 'Internal note' },
      message_detail_labels: { 'Review rates': 'Review freight rates' },
    });
    const container = mount(chatter);

    expect(container.querySelector('.o-form-chatter-tool-menu')).not.toBeNull();
    expect(container.textContent).toContain('Admin User');
    expect(container.querySelector('.o-form-chatter-message.is-note time')?.textContent).not.toContain('2026-08-04 09:15:00');
    expect(container.textContent).toContain('Internal note');
    expect(container.textContent).toContain('Review freight rates');
    container.querySelector<HTMLButtonElement>('.o-form-chatter-primary')!.click();
    expect(container.querySelector('.o-form-composer')).not.toBeNull();
    container.querySelector<HTMLButtonElement>('.o-form-composer-cancel')!.click();
    expect(container.querySelector('.o-form-composer')).toBeNull();
  });

  it('adds and removes followers through the shared chatter manager', async () => {
    const component = new OdooFollowerManager('followers', {
      record: { id: 'order-1' },
      followers: [{ user_id: 'user-1', name: 'Admin User', email: 'admin@example.com' }],
      candidates: [
        { user_id: 'user-1', name: 'Admin User' },
        { user_id: 'user-2', name: 'Dispatch User' },
      ],
    }, {
      follower_add_action: 'add_follower',
      follower_remove_action: 'remove_follower',
    });
    const submitted: Array<{ action: string; params: any }> = [];
    component._transport = { submit: async (action: string, params: any) => { submitted.push({ action, params }); } };
    const container = mount(component);

    container.querySelector<HTMLButtonElement>('.o-form-follower-add-toggle')!.click();
    const select = container.querySelector<HTMLSelectElement>('.o-form-follower-add-form select')!;
    expect([...select.options].map(option => option.textContent)).toContain('Dispatch User');
    expect([...select.options].map(option => option.textContent)).not.toContain('Admin User');
    select.value = 'user-2';
    container.querySelector<HTMLFormElement>('.o-form-follower-add-form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    container.querySelector<HTMLButtonElement>('.o-form-follower-remove')!.click();
    await Promise.resolve();

    expect(submitted).toEqual([
      { action: 'add_follower', params: { id: 'order-1', user_id: 'user-2' } },
      { action: 'remove_follower', params: { id: 'order-1', user_id: 'user-1' } },
    ]);
  });

  it('uploads multiple attachments and downloads persisted files', async () => {
    const component = new OdooAttachmentPanel('attachments', {
      record: { id: 'order-1' },
      attachments: [{ id: 'file-1', file_name: 'manifest.pdf', mime_type: 'application/pdf', size_bytes: 2048 }],
    }, {
      attachment_upload_action: 'upload_attachment',
      attachment_download_action: 'download_attachment',
    });
    const submitted: Array<{ action: string; params: any }> = [];
    component._transport = { submit: async (action: string, params: any) => { submitted.push({ action, params }); } };
    const container = mount(component);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const files = [new File(['one'], 'proof.png', { type: 'image/png' }), new File(['two'], 'notes.txt', { type: 'text/plain' })];
    Object.defineProperty(input, 'files', { configurable: true, value: files });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    container.querySelector<HTMLButtonElement>('.o-form-attachment-download')!.click();
    await Promise.resolve();

    expect(submitted.slice(0, 2).map(entry => [entry.action, entry.params.id, entry.params.file.name])).toEqual([
      ['upload_attachment', 'order-1', 'proof.png'],
      ['upload_attachment', 'order-1', 'notes.txt'],
    ]);
    expect(submitted[2]).toMatchObject({ action: 'download_attachment', params: { id: 'file-1', file_name: 'manifest.pdf' } });
    expect(container.textContent).toContain('2 KB');
  });

  it('loads authenticated image previews and closes the viewer with Escape', async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createObjectURL = vi.fn(() => 'blob:order-image');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    const component = new OdooAttachmentPanel('image-attachments', {
      record: { id: 'order-1' },
      attachments: [{ id: 'image-1', file_name: 'delivery.png', mime_type: 'image/png', size_bytes: 1024 }],
    }, {
      attachment_download_action: 'download_attachment',
      resolve_attachment_blob: async () => new Blob(['image'], { type: 'image/png' }),
    });
    component._transport = { submit: async () => {} };
    const container = mount(component);
    document.body.appendChild(container);
    await new Promise(resolve => setTimeout(resolve, 0));
    const image = container.querySelector<HTMLImageElement>('.o-form-attachment-preview-button img')!;
    expect(image.src).toContain('blob:order-image');
    container.querySelector<HTMLButtonElement>('.o-form-attachment-preview-button')!.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(document.body.querySelector('.o-form-attachment-preview-overlay')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.body.querySelector('.o-form-attachment-preview-overlay')).toBeNull();
    component.dispose();
    container.remove();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:order-image');
    if (originalCreateObjectURL) Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL });
    else delete (URL as any).createObjectURL;
    if (originalRevokeObjectURL) Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL });
    else delete (URL as any).revokeObjectURL;
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
    const grid = new LineItemGrid('lines', {
      rows: [],
      footerStats: [{ label: 'Total amount', field: 'total' }],
      footerRecord: { total: '18,500,000 ₫' },
    }, []);
    expect(grid).toBeInstanceOf(DataGrid);
    expect(new ContactGrid('contacts', { rows: [] }, [])).toBeInstanceOf(DataGrid);
    expect(mount(grid).querySelector('.o-document-totals')?.textContent).toContain('18,500,000 ₫');
  });

  it('renders Odoo x2many actions as inline create controls', () => {
    const grid = new LineItemGrid('lines', {
      rows: [],
      variant: 'odoo_x2many',
      actions: [{ id: 'add_line', label: 'Add a line' }],
    }, [{ field: 'description', label: 'Description' }]);
    const container = mount(grid);

    expect(container.querySelector('.o-x2many-grid')).not.toBeNull();
    expect(container.querySelector('.o-x2many-create')?.textContent).toBe('Add a line');
    expect(container.querySelector('.core3-token-toolbar')).toBeNull();
  });

  it('keeps Odoo x2many row actions visually quiet', () => {
    const grid = new LineItemGrid('action-lines', {
      rows: [{ id: 'line-1', description: 'Freight' }],
      variant: 'odoo_x2many',
    }, [
      { field: 'description', label: 'Description' },
      { field: 'actions', label: '', rowActions: [{ id: 'delete_line', label: 'Delete', variant: 'danger' }] },
    ]);
    const container = mount(grid);

    expect(container.querySelector('.o-x2many-row-action.is-danger')?.textContent).toBe('Delete');
  });

  it('marks grid cells by column so responsive variants can retain essential data', () => {
    const grid = new LineItemGrid('responsive-lines', {
      rows: [{ id: 'line-1', description: 'Freight', line_total_display: '1,000 ₫' }],
      variant: 'odoo_x2many',
    }, [
      { field: 'description', label: 'Description' },
      { field: 'line_total_display', label: 'Amount' },
    ]);
    const container = mount(grid);

    expect(container.querySelector('th[data-column="line_total_display"]')).not.toBeNull();
    expect(container.querySelector('td[data-column="line_total_display"]')?.textContent).toBe('1,000 ₫');
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

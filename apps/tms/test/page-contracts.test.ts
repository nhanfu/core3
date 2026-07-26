import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('MovedX page contracts', () => {
  it('keeps the vehicle status tabs aligned with the reference composition', async () => {
    const source = readFileSync(resolve(process.cwd(), 'pages/vehicles.yaml'), 'utf8');
    expect(source).toMatch(/tabs:\n\s+- \{ id: '', label: Tất cả \}\n\s+- \{ id: Active, label: Sẵn sàng \}\n\s+- \{ id: Maintenance, label: Bảo dưỡng \}\n\s+- \{ id: 'Out of Service', label: Ngưng hoạt động \}/);
  });

  it('keeps fleet and catalog status tabs badge-free like the reference screens', () => {
    for (const page of ['drivers', 'containers', 'locations', 'areas']) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toMatch(/type: StatusTabs[\s\S]*?show_counts: false/);
    }
  });

  it('keeps the organization team page localized in the visible YAML contract', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages/teams.yaml'), 'utf8');
    expect(source).toContain('title: Đội nhóm');
    expect(source).toContain("label: '+ Thêm đội nhóm'");
    expect(source).not.toMatch(/\bteam\b/i);
  });

  it('keeps the customer list composition aligned with the supplied MovedX reference', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages/customers.yaml'), 'utf8');
    expect(source).toContain("title: 'Xuất Excel'");
    expect(source).toContain('icon: download');
    expect(source).toContain('show_counts: true');
    expect(source).not.toContain('filters:');
    expect(source).toContain('field: system_code');
    expect(source).toContain('field: entity_type');
    expect(source).toContain('field: stage_label');
    expect(source).toContain('field: owner_name');
    expect(source).toContain('field: phone');
    expect(source).not.toContain('field: created_by');
    expect(source).not.toContain('field: created_at');
  });

  it('keeps lookup datasources inside the same branch and CRM visibility scope as their pages', () => {
    const scopedPages = [
      ['customers', 'd.branch_id', 'visibility ='],
      ['partners', 'd.branch_id', 'visibility ='],
      ['orders', 'current_user_name', 'branch_id = :current_branch_id'],
      ['order-detail', 'current_user_name', 'branch_id = :current_branch_id'],
      ['quotes', 'current_user_name', 'branch_id = :current_branch_id'],
      ['vehicles', 'branch_id = :current_branch_id'],
      ['vehicle-detail', 'branch_id = :current_branch_id'],
      ['containers', 'visibility =', 'branch_id = :current_branch_id'],
    ] as const;
    for (const [page, ...fragments] of scopedPages) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      for (const fragment of fragments) expect(source).toContain(fragment);
    }
    for (const page of ['accounting-advances', 'accounting-debit-notes', 'accounting-payment-requests', 'accounting-settlements', 'accounting-invoice-templates', 'accounting-ledger-accounts']) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toContain('branch_id = :current_branch_id');
    }
  });

  it('keeps trip views scoped by explicit trip ownership as well as truck ownership', () => {
    for (const page of ['trips', 'dashboard', 'reports', 'system-activity']) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toContain('branch_id = :current_branch_id');
    }
    const trips = readFileSync(resolve(process.cwd(), 'pages/trips.yaml'), 'utf8');
    expect(trips).toContain('tr.branch_id = :current_branch_id OR t.branch_id = :current_branch_id');
    expect(trips).toContain('id: trip_branch_lookup');
    expect(trips).toContain('field: branch_id');
  });

  it('uses the shared money editor for financial form values', () => {
    for (const [page, field] of [
      ['order-detail', 'unit_price'],
      ['quote-detail', 'cost_price'],
      ['accounting-document-detail', 'unit_price'],
      ['contracts', 'base_salary'],
      ['payroll', 'net_salary'],
      ['payroll-detail', 'net_salary'],
    ] as const) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toContain(`field: ${field}`);
      expect(source).toContain(`field: ${field}, label:`);
      expect(source).toContain('type: money');
      expect(source).toContain('currency: VND');
    }
  });

  it('uses searchable multi-selects for every user role editor', () => {
    for (const page of ['users', 'user-detail', 'settings']) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toContain('type: multi-select');
      expect(source).toContain('search_placeholder: \'Tìm vai trò...\'');
      expect(source).toContain('multiple: true');
    }
  });

  it('keeps the partner CRM list on the shared customer composition', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages/partners.yaml'), 'utf8');
    expect(source).toContain('breadcrumb: [Kinh doanh, Đối tượng]');
    expect(source).toContain("scope: { label: 'Phạm vi xem', value: 'Toàn công ty' }");
    expect(source).toContain('help: true');
    expect(source).toContain('search_button: true');
    expect(source).toContain('show_counts: true');
    expect(source).toContain('variant: contained');
    expect(source).toContain('field: system_code');
    expect(source).not.toContain('filters:');
    expect(source).not.toContain('field: created_at');
  });

  it('keeps the shared CRM detail editable for both customers and partners', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages/crm-entity-detail.yaml'), 'utf8');
    expect(source).toContain('id: edit_crm_entity');
    expect(source).toContain('action: crm.entities.update');
    expect(source).toContain('prefill_source: crm_entity_detail');
    expect(source).toContain('c.status AS status');
    expect(source).toContain('p.partner_type');
    expect(source).toContain('field: stage');
    expect(source).toContain('field: partner_type');
    expect(source).toContain("show_if: \"state.kind === 'customer'\"");
    expect(source).toContain("show_if: \"state.kind === 'partner'\"");
    expect(source).toContain("WHERE :kind = 'customer'");
    expect(source).toContain("WHERE :kind = 'partner'");
  });

  it('keeps shift assignments available in the declarative calendar surface', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages/shifts.yaml'), 'utf8');
    expect(source).toContain('type: ScheduleGrid');
    expect(source).toContain('source: shift_assignments');
    expect(source).toContain('date_field: work_date');
    expect(source).toContain('resource_field: employee_code');
  });

  it('uses contained tabs for standard list routes while preserving vehicle toggles', () => {
    const containedPages = [
      'accounting-advances', 'accounting-debit-notes', 'accounting-payment-requests',
      'areas', 'branches', 'catalog-cargo-types', 'catalog-container-types',
      'catalog-currencies', 'catalog-fee-types', 'catalog-units', 'catalog-vehicle-types',
      'contracts', 'drivers', 'employees', 'orders', 'payroll', 'quotes', 'shifts',
      'teams', 'timesheets', 'trips', 'users',
    ];
    for (const page of containedPages) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toMatch(/type: StatusTabs[\s\S]*?variant: contained/);
    }
    const vehicles = readFileSync(resolve(process.cwd(), 'pages/vehicles.yaml'), 'utf8');
    expect(vehicles).toContain('variant: toggle');
    expect(vehicles).not.toContain('variant: contained');
  });

  it('keeps catalog routes on the MovedX breadcrumb hierarchy', () => {
    const expected: Record<string, string> = {
      'catalog-container-types': 'Loại container',
      'catalog-vehicle-types': 'Loại xe',
      'catalog-units': 'Đơn vị tính',
      'catalog-cargo-types': 'Loại hàng hóa',
      'catalog-fee-types': 'Loại phí',
      'catalog-currencies': 'Tiền tệ',
    };
    for (const [page, leaf] of Object.entries(expected)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toContain(`breadcrumb: [Danh mục, ${leaf}]`);
    }
  });

  it('keeps accounting routes on the MovedX breadcrumb hierarchy', () => {
    const expected: Record<string, string> = {
      'accounting-advances': 'Tạm ứng',
      'accounting-debit-notes': 'Giấy báo nợ',
      'accounting-debit-note-summary': 'Tổng hợp giấy báo nợ',
      'accounting-payment-requests': 'Đề nghị thanh toán',
      'accounting-payment-request-summary': 'Tổng hợp đề nghị chi',
      'accounting-settlements': 'Hoàn ứng',
      'accounting-invoice-templates': 'Mẫu hóa đơn',
      'accounting-ledger-accounts': 'Hệ thống tài khoản',
    };
    for (const [page, leaf] of Object.entries(expected)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toContain(`breadcrumb: [Kế toán, ${leaf}]`);
    }
  });

  it('keeps HR routes on the MovedX breadcrumb hierarchy', () => {
    const expected: Record<string, string> = {
      employees: 'Nhân viên',
      contracts: 'Hợp đồng',
      timesheets: 'Chấm công',
      shifts: 'Ca làm việc',
      payroll: 'Bảng lương',
    };
    for (const [page, leaf] of Object.entries(expected)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toContain(`breadcrumb: [Nhân sự, ${leaf}]`);
    }
  });

  it('keeps organization routes on the MovedX breadcrumb hierarchy', () => {
    const expected: Record<string, string> = {
      'own-company': 'Công ty chủ quản',
      branches: 'Chi nhánh',
      departments: 'Phòng ban',
      teams: 'Đội nhóm',
      users: 'Người dùng',
      roles: 'Vai trò',
    };
    for (const [page, leaf] of Object.entries(expected)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toContain(`breadcrumb: [Tổ chức & phân quyền, ${leaf}]`);
    }
  });

  it('keeps system routes on the MovedX breadcrumb hierarchy', () => {
    const expected: Record<string, string> = {
      'system-activity': 'Lịch sử thao tác',
      'system-code-rules': 'Cấu hình sinh mã',
      'system-print-templates': 'Mẫu in',
      'system-approval-flows': 'Quy trình duyệt',
      'system-shipment-types': 'Loại hình vận chuyển',
      'system-trip-statuses': 'Trạng thái chuyến',
      'system-fee-rules': 'Công thức phí chuyến',
      'system-storage': 'Quản lý dung lượng',
    };
    for (const [page, leaf] of Object.entries(expected)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toContain(`breadcrumb: [Hệ thống, ${leaf}]`);
    }
  });

  it('keeps remaining sales routes on the MovedX breadcrumb hierarchy', () => {
    const expected: Record<string, string> = {
      quotes: 'Báo giá',
      'crm-dashboard': 'Tổng hợp CRM',
      'crm-kpi': 'Chỉ tiêu KPI',
    };
    for (const [page, leaf] of Object.entries(expected)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toContain(`breadcrumb: [Kinh doanh, ${leaf}]`);
    }
  });

  it('keeps operations routes on the MovedX breadcrumb hierarchy', () => {
    const expected: Record<string, string> = {
      chat: 'Tin nhắn',
      schedule: 'Lịch điều',
      trips: 'Lịch điều',
    };
    for (const [page, leaf] of Object.entries(expected)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toContain(`breadcrumb: [Điều hành, ${leaf}]`);
    }
  });

  it('keeps fleet and location routes on the MovedX catalog hierarchy', () => {
    const expected: Record<string, string> = {
      drivers: 'Tài xế',
      containers: 'Container',
      locations: 'Địa điểm',
      areas: 'Khu vực',
    };
    for (const [page, leaf] of Object.entries(expected)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toContain(`breadcrumb: [Danh mục, ${leaf}]`);
    }
  });

  it('keeps canonical detail routes on their parent domain hierarchy', () => {
    const expectations: Record<string, string> = {
      'order-detail': '[Quản lý, Đơn hàng, Chi tiết]',
      'quote-detail': '[Kinh doanh, Báo giá, Chi tiết]',
      'accounting-document-detail': '[Kế toán, Chi tiết chứng từ]',
      'employee-detail': '[Nhân sự, Nhân viên, Chi tiết]',
      'contract-detail': '[Nhân sự, Hợp đồng, Chi tiết]',
      'payroll-detail': '[Nhân sự, Bảng lương, Chi tiết]',
      'vehicle-detail': '[Quản lý, Phương tiện, Chi tiết]',
      'driver-detail': '[Danh mục, Tài xế, Chi tiết]',
      'branch-detail': '[Tổ chức & phân quyền, Chi nhánh, Chi tiết]',
      'department-detail': '[Tổ chức & phân quyền, Phòng ban, Chi tiết]',
      'user-detail': '[Tổ chức & phân quyền, Người dùng, Chi tiết]',
      'role-detail': '[Tổ chức & phân quyền, Vai trò, Chi tiết]',
      'area-detail': '[Danh mục, Khu vực, Chi tiết]',
      'system-print-template-detail': '[Hệ thống, Mẫu in, Chi tiết]',
      'system-approval-flow-detail': '[Hệ thống, Quy trình duyệt, Chi tiết]',
      'crm-entity-detail': '[Kinh doanh, Đối tượng, Chi tiết]',
    };
    for (const [page, breadcrumb] of Object.entries(expectations)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toContain(`breadcrumb: ${breadcrumb}`);
    }
  });

  it('keeps fleet detail routes editable through the shared server form contract', () => {
    const expectations: Record<string, string[]> = {
      'driver-detail': ['edit_driver_detail', 'table: drivers', 'prefill_source: driver_detail'],
      'vehicle-detail': ['edit_vehicle_detail', 'table: trucks', 'prefill_source: vehicle_detail'],
    };
    for (const [page, fragments] of Object.entries(expectations)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      for (const fragment of fragments) expect(source).toContain(fragment);
    }
  });

  it('keeps organization and hierarchy details editable through shared forms', () => {
    const expectations: Record<string, string[]> = {
      'area-detail': ['edit_area_detail', 'table: areas', 'prefill_source: area_detail'],
      'branch-detail': ['edit_branch_detail', 'table: branches', 'prefill_source: branch_detail'],
      'department-detail': ['edit_department_detail', 'table: departments', 'prefill_source: department_detail'],
    };
    for (const [page, fragments] of Object.entries(expectations)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      for (const fragment of fragments) expect(source).toContain(fragment);
    }
  });

  it('keeps user detail profiles editable alongside role assignment', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages', 'user-detail.yaml'), 'utf8');
    for (const fragment of ['edit_user_detail', 'table: users', 'prefill_source: user_detail', 'field: roles']) {
      expect(source).toContain(fragment);
    }
  });

  it('keeps quote detail headers editable while status remains action-controlled', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages', 'quote-detail.yaml'), 'utf8');
    expect(source).toContain('id: edit_quote_detail');
    expect(source).toContain('prefill_source: quote_detail');
    expect(source).toContain('table: quotes');
    expect(source).toContain('field: valid_until');
    expect(source).toContain("show_if: \"state.quote_detail.status === 'Draft'\"");
    const editor = source.slice(source.indexOf('  - id: edit_quote_detail'), source.indexOf('  - id: add_quote_line'));
    expect(editor).not.toContain('field: status');
  });

  it('keeps financial document detail headers Draft-only and status-free', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages', 'accounting-document-detail.yaml'), 'utf8');
    expect(source).toContain('id: edit_accounting_document');
    expect(source).toContain('action: accounting.documents.update');
    expect(source).toContain("show_if: \"state.accounting_document_detail.status === 'Draft'\"");
    const editor = source.slice(source.indexOf('  - id: edit_accounting_document'), source.indexOf('  - id: add_accounting_line'));
    expect(editor).not.toContain('field: status');
    expect(editor).not.toContain('field: amount');
  });

  it('keeps order detail headers Draft-only with server-backed lookups', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages', 'order-detail.yaml'), 'utf8');
    expect(source).toContain('id: edit_order_detail');
    expect(source).toContain('prefill_source: order_detail');
    expect(source).toContain('options_source: order_customer_lookup_detail');
    expect(source).toContain('options_source: order_shipment_type_lookup_detail');
    expect(source).toContain("show_if: \"state.order_detail.status === 'Draft'\"");
    const editor = source.slice(source.indexOf('  - id: edit_order_detail'), source.indexOf('  - id: add_order_line'));
    expect(editor).not.toContain('field: status');
    expect(editor).not.toContain('field: total_amount');
  });

  it('keeps canonical editor options localized while preserving internal enum values', () => {
    const expectations: Array<[string, string, string]> = [
      ['system-print-templates', 'id: Active, label: Đang dùng', 'id: Inactive, label: Ngưng dùng'],
      ['system-shipment-types', 'id: Active, label: Đang dùng', 'id: Inactive, label: Ngưng dùng'],
      ['shifts', 'id: Present, label: Có mặt', 'id: Absent, label: Vắng mặt'],
      ['timesheets', 'id: Present, label: Có mặt', 'id: Absent, label: Vắng mặt'],
      ['trips', 'id: Scheduled, label: Đã lên lịch', "id: 'In Transit', label: Đang vận chuyển"],
      ['users', 'id: true, label: Đang kích hoạt', 'id: false, label: Đã khóa'],
      ['crm-entity-detail', 'id: false, label: Không', 'id: true, label: Có'],
    ];
    for (const [page, first, second] of expectations) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toContain(first);
      expect(source).toContain(second);
    }
  });

  it('keeps the dispatch trip editor fully localized', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages/trips.yaml'), 'utf8');
    for (const fragment of [
      'title: Tạo chuyến',
      'title: Cập nhật chuyến',
      'label: Điểm đi',
      'label: Điểm đến',
      'label: Phương tiện',
      'label: Tài xế',
      'label: Ghi chú',
      'confirm: "Hủy chuyến {{row.trip_number}}?"',
    ]) expect(source).toContain(fragment);
    expect(source).not.toMatch(/label: (Trip #|Origin|Destination|Truck ID|Driver ID|Departure Time|Arrival Time|Distance \(km\)|Cargo Type|Cargo Weight \(kg\)|Notes)/);
    expect(source).not.toContain('title: Schedule Trip');
    expect(source).not.toContain('title: Edit Trip');
  });

  it('keeps trip lifecycle changes behind named server actions', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages/trips.yaml'), 'utf8');
    for (const action of ['action: trips.start', 'action: trips.complete', 'action: trips.cancel']) {
      expect(source).toContain(action);
    }
    const editor = source.slice(source.indexOf('  - id: edit_trip'), source.indexOf('  - id: cancel_trip'));
    expect(editor).not.toContain('field: status');
    expect(source).toContain("show_if: \"row.status === 'Scheduled'\"");
    expect(source).toContain("show_if: \"row.status === 'In Transit'\"");
  });

  it('keeps payroll detail editing Draft-only like the server workflow', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages/payroll-detail.yaml'), 'utf8');
    expect(source).toContain("show_if: \"state.payroll_detail.status === 'Draft'\"");
    const editor = source.slice(source.indexOf('  - id: edit_payroll_detail'));
    expect(editor).not.toContain('field: status');
  });

  it('keeps explicit Excel contracts for debit notes and container types', () => {
    const debitNotes = readFileSync(resolve(process.cwd(), 'pages/accounting-debit-notes.yaml'), 'utf8');
    const containerTypes = readFileSync(resolve(process.cwd(), 'pages/catalog-container-types.yaml'), 'utf8');
    expect(debitNotes).toContain("id: debit_notes.export, label: 'Xuất Excel', icon: download, params: { format: xlsx }");
    expect(containerTypes).toContain("id: container_types.export, label: 'Xuất Excel', icon: download, params: { format: xlsx }");
    expect(containerTypes).toContain("id: import_container_types, label: 'Nhập Excel', icon: upload");
  });

  it('uses semantic SVG names for declarative import and export actions', () => {
    const pages = readdirSync(resolve(process.cwd(), 'pages')).filter(file => file.endsWith('.yaml'));
    for (const page of pages) {
      const source = readFileSync(resolve(process.cwd(), 'pages', page), 'utf8');
      expect(source).not.toMatch(/icon:\s*['"][↓↑]['"]/);
    }
  });

  it('keeps reachable provisional shells localized while they remain in the app', () => {
    const expectedTitles: Record<string, string> = {
      fleet: 'Tổng quan phương tiện',
      maintenance: 'Bảo dưỡng',
      reports: 'Báo cáo',
      settings: 'Cài đặt',
    };
    for (const [page, title] of Object.entries(expectedTitles)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toContain(`title: ${title}`);
      expect(source).not.toMatch(/title: (Fleet Overview|Maintenance|Reports|Settings)/);
    }
  });

  it('keeps order and quote mutations behind explicit permissions', () => {
    const expectations: Record<string, string[]> = {
      orders: [
        'id: view_order, label: Chi tiết, variant: secondary, permission: orders.read',
        'id: edit_order, label: Sửa, variant: ghost, permission: orders.write',
        'id: approve_order, label: Duyệt, variant: primary, permission: orders.approve',
        'id: delete_order, label: Xóa, variant: danger, permission: orders.write',
        '  - id: add_order\n    type: form\n    permission: orders.write',
      ],
      quotes: [
        'id: view_quote, label: Chi tiết, variant: secondary, permission: crm.read',
        'id: edit_quote, label: Sửa, variant: ghost, permission: crm.write',
        'id: send_quote, label: Gửi, variant: primary, permission: crm.write',
        'id: delete_quote, label: Xóa, variant: danger, permission: crm.write',
        '  - id: add_quote\n    type: form\n    permission: crm.write',
      ],
    };
    for (const [page, fragments] of Object.entries(expectations)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      for (const fragment of fragments) expect(source).toContain(fragment);
    }
  });

  it('uses searchable customer lookups in order forms', () => {
    for (const page of ['orders', 'order-detail']) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toContain('type: async-select');
      expect(source).toContain("search_placeholder: 'Tìm khách hàng...'");
    }
  });

  it('keeps trip schedule editors precise to the minute', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages/trips.yaml'), 'utf8');
    expect(source).toMatch(/field: departure_time[\s\S]*?type: datetime/);
    expect(source).toMatch(/field: arrival_time[\s\S]*?type: datetime/);
  });

  it('keeps catalog and system CRUD row actions behind write permissions', () => {
    const expectations: Record<string, string[]> = {
      'catalog-units': [
        'id: edit_unit, label: Sửa, variant: ghost, permission: catalog.write',
        'id: delete_unit, label: Xóa, variant: danger, permission: catalog.write',
        'id: import_units, type: upload, permission: catalog.write',
      ],
      'catalog-currencies': [
        'id: edit_currency, label: Sửa, variant: ghost, permission: catalog.write',
        'id: delete_currency, label: Xóa, variant: danger, permission: catalog.write',
        'id: sync_currency_rates, type: server, permission: catalog.write',
      ],
      'system-storage': [
        'id: edit_storage_config, label: Sửa, variant: ghost, permission: system.write',
        'id: delete_storage_config, label: Xóa, variant: danger, permission: system.write',
        'id: add_storage_config, type: form, permission: system.write',
      ],
      'system-code-rules': [
        'id: preview_code_rule, label: Xem mẫu, variant: ghost, permission: system.read',
        'id: edit_code_rule, label: Sửa, variant: ghost, permission: system.write',
        'id: delete_code_rule, label: Xóa, variant: danger, permission: system.write',
      ],
    };
    for (const [page, fragments] of Object.entries(expectations)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      for (const fragment of fragments) expect(source).toContain(fragment);
    }
  });

  it('keeps accounting document workflows behind read/write/approval permissions', () => {
    const expectations: Record<string, string[]> = {
      'accounting-advances': [
        'id: view_advance, label: Chi tiết, variant: secondary, permission: accounting.read',
        'id: edit_advance, label: Sửa, variant: ghost, permission: accounting.write',
        'id: approve_advance, label: Duyệt, variant: primary, permission: accounting.approve',
        'id: delete_advance, label: Xóa, variant: danger, permission: accounting.write',
      ],
      'accounting-debit-notes': [
        'id: pay_debit_note, label: Đã thanh toán, variant: primary, permission: accounting.pay',
        'id: approve_debit_note, type: server, permission: accounting.approve',
      ],
      'accounting-payment-requests': [
        'id: pay_payment_request, label: Đã thanh toán, variant: primary, permission: accounting.pay',
        'id: submit_payment_request, type: server, permission: accounting.write',
      ],
      'accounting-settlements': [
        'id: view_settlement, label: Chi tiết, variant: secondary, permission: accounting.read',
        'id: approve_settlement, label: Duyệt, variant: primary, permission: accounting.approve',
      ],
    };
    for (const [page, fragments] of Object.entries(expectations)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      for (const fragment of fragments) expect(source).toContain(fragment);
    }
  });

  it('keeps HR list workflows behind explicit permissions', () => {
    const expectations: Record<string, string[]> = {
      employees: [
        'id: view_employee, label: Chi tiết, variant: primary, permission: hr.read',
        'id: edit_employee, label: Sửa, variant: ghost, permission: hr.write',
        'id: delete_employee, label: Xóa, variant: danger, permission: hr.write',
      ],
      contracts: [
        'id: view_contract, label: Chi tiết, variant: primary, permission: hr.read',
        'id: edit_contract, label: Sửa, variant: ghost, permission: hr.write',
      ],
      shifts: [
        'id: edit_shift, label: Sửa, variant: ghost, permission: hr.write',
        'id: add_shift_assignment\n    type: form\n    permission: hr.write',
      ],
      timesheets: [
        'id: edit_timesheet, label: Sửa, variant: ghost, permission: hr.write',
        'id: delete_timesheet, label: Xóa, variant: danger, permission: hr.write',
      ],
      payroll: [
        'id: approve_payroll, label: Duyệt, variant: primary, permission: hr.approve',
        'id: pay_payroll, label: Xác nhận chi, variant: primary, permission: hr.pay',
        'id: delete_payroll, label: Xóa, variant: danger, permission: hr.write',
      ],
    };
    for (const [page, fragments] of Object.entries(expectations)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      for (const fragment of fragments) expect(source).toContain(fragment);
    }
  });

  it('keeps customer, partner, and contact mutations behind CRM permissions', () => {
    const expectations: Record<string, string[]> = {
      customers: [
        'permission: crm.read',
        'permission: crm.write',
        'id: delete_customer\n    type: delete\n    permission: crm.write',
      ],
      partners: [
        'permission: crm.read',
        'permission: crm.write',
        'id: delete_partner\n    type: delete\n    permission: crm.write',
      ],
      'crm-entity-detail': [
        'id: edit_crm_contact, label: Sửa, variant: ghost, permission: crm.write',
        'id: delete_crm_contact, label: Xóa, variant: danger, permission: crm.write',
        'id: edit_crm_entity\n    type: server_form\n    permission: crm.write',
      ],
    };
    for (const [page, fragments] of Object.entries(expectations)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      for (const fragment of fragments) expect(source).toContain(fragment);
    }
  });

  it('keeps fleet and location master-data mutations behind explicit permissions', () => {
    const expectations: Record<string, string[]> = {
      vehicles: [
        'permission: fleet.read',
        'permission: fleet.write',
        'id: delete_vehicle\n    type: delete\n    permission: fleet.write',
      ],
      containers: [
        'id: edit_container, label: Sửa, variant: ghost, permission: dispatch.write',
        'id: delete_container, label: Xóa, variant: danger, permission: dispatch.write',
      ],
      drivers: [
        'id: view_driver, label: Chi tiết, variant: primary, permission: drivers.read',
        'id: edit_driver, label: Sửa, variant: ghost, permission: drivers.write',
      ],
      locations: [
        'id: edit_location, label: Sửa, variant: ghost, permission: dispatch.write',
        'id: delete_location, label: Xóa, variant: danger, permission: dispatch.write',
      ],
      areas: [
        'id: view_area, label: Chi tiết, variant: primary, permission: dispatch.read',
        'id: edit_area, label: Sửa, variant: ghost, permission: dispatch.write',
      ],
    };
    for (const [page, fragments] of Object.entries(expectations)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      for (const fragment of fragments) expect(source).toContain(fragment);
    }
  });

  it('keeps organization and RBAC mutations behind settings permissions', () => {
    const expectations: Record<string, string[]> = {
      branches: [
        'id: view_branch, label: Chi tiết, variant: primary, permission: settings.read',
        'id: edit_branch, label: Sửa, variant: ghost, permission: settings.write',
      ],
      departments: [
        'id: view_department, label: Chi tiết, variant: primary, permission: settings.read',
        'id: delete_department, type: delete, permission: settings.write',
      ],
      teams: [
        'id: edit_team, label: Sửa, variant: ghost, permission: settings.write',
        'id: delete_team, type: delete, permission: settings.write',
      ],
      users: [
        'id: view_user, label: Chi tiết, variant: primary, permission: settings.read',
        'id: edit_user, label: Sửa, variant: ghost, permission: settings.write',
      ],
      roles: [
        'id: view_role, label: Chi tiết, variant: primary, permission: settings.read',
      ],
      'role-detail': [
        'id: grant_permission, label: Cấp quyền, variant: primary, permission: settings.write',
        'id: revoke_permission, type: server, permission: settings.write',
      ],
      'user-detail': [
        'id: grant_user_role, type: server, permission: settings.write',
        'id: revoke_user_role, type: server, permission: settings.write',
      ],
      'own-company': [
        'id: edit_company, label: Cập nhật, variant: ghost, permission: settings.write',
        'id: download_company_document, label: Tải xuống, variant: ghost, permission: settings.read',
      ],
    };
    for (const [page, fragments] of Object.entries(expectations)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      for (const fragment of fragments) expect(source).toContain(fragment);
    }
  });

  it('keeps dispatch lifecycle and document line mutations behind permissions', () => {
    const expectations: Record<string, string[]> = {
      trips: [
        'permission: trips.write',
        'id: start_trip\n    type: server\n    permission: trips.write',
        'id: complete_trip\n    type: server\n    permission: trips.write',
      ],
      'order-detail': [
        'id: edit_order_line, label: Sửa, variant: ghost, permission: orders.write',
        'id: delete_order_line\n    type: server\n    permission: orders.write',
      ],
      'quote-detail': [
        'id: edit_quote_line, label: Sửa, variant: ghost, permission: crm.write',
        'id: delete_quote_line\n    type: server\n    permission: crm.write',
      ],
    };
    for (const [page, fragments] of Object.entries(expectations)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      for (const fragment of fragments) expect(source).toContain(fragment);
    }
  });

  it('keeps accounting detail and master-data mutations behind accounting.write', () => {
    const expectations: Record<string, string[]> = {
      'accounting-document-detail': [
        'id: edit_accounting_line, label: Sửa, variant: ghost, permission: accounting.write',
        'id: delete_accounting_line\n    type: server\n    permission: accounting.write',
      ],
      'accounting-invoice-templates': [
        'id: edit_invoice_template, label: Sửa, variant: ghost, permission: accounting.write',
        'id: delete_invoice_template, type: delete, permission: accounting.write',
      ],
      'accounting-ledger-accounts': [
        'id: edit_ledger_account, label: Sửa, variant: ghost, permission: accounting.write',
        'id: delete_ledger_account, type: delete, permission: accounting.write',
      ],
      'area-detail': [
        'id: edit_area_detail\n    type: form\n    permission: dispatch.write',
      ],
    };
    for (const [page, fragments] of Object.entries(expectations)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      for (const fragment of fragments) expect(source).toContain(fragment);
    }
  });

  it('keeps Chat actions behind chat read/write permissions', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages/chat.yaml'), 'utf8');
    for (const fragment of [
      'id: create_thread\n    type: server_form\n    permission: chat.write',
      'id: send_message\n    type: server\n    permission: chat.write',
      'id: mark_thread_read\n    type: server\n    permission: chat.read',
      'id: upload_attachment\n    type: upload\n    permission: chat.write',
      'id: download_attachment\n    type: download\n    permission: chat.read',
    ]) expect(source).toContain(fragment);
  });

  it('keeps populated detail editors and documents behind domain permissions', () => {
    const expectations: Record<string, string[]> = {
      'employee-detail': [
        'id: upload_employee_document, type: upload, permission: hr.write',
        'id: download_employee_document, type: download, permission: hr.read',
        'id: edit_employee_detail\n    type: form\n    permission: hr.write',
      ],
      'contract-detail': [
        'id: upload_contract_document, type: upload, permission: hr.write',
        'id: download_contract_document, type: download, permission: hr.read',
        'id: edit_contract_detail\n    type: form\n    permission: hr.write',
      ],
      'driver-detail': ['id: edit_driver_detail\n    type: form\n    permission: drivers.write'],
      'vehicle-detail': ['id: edit_vehicle_detail\n    type: form\n    permission: fleet.write'],
      'branch-detail': ['id: edit_branch_detail\n    type: form\n    permission: settings.write'],
      'department-detail': ['id: edit_department_detail\n    type: form\n    permission: settings.write'],
    };
    for (const [page, fragments] of Object.entries(expectations)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      for (const fragment of fragments) expect(source).toContain(fragment);
    }
  });

  it('keeps legacy fleet, maintenance, and payroll editors behind permissions', () => {
    const expectations: Record<string, string[]> = {
      fleet: [
        'permission: fleet.write',
        'id: delete_truck\n    type: delete\n    permission: fleet.write',
      ],
      maintenance: [
        'permission: maintenance.write',
        'id: mark_done\n    type: patch\n    permission: maintenance.write',
      ],
      'payroll-detail': [
        'id: edit_payroll_detail\n    type: form\n    permission: hr.write',
      ],
    };
    for (const [page, fragments] of Object.entries(expectations)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      for (const fragment of fragments) expect(source).toContain(fragment);
    }
  });

  it('keeps settings and system builder mutations behind write permissions', () => {
    const expectations: Record<string, string[]> = {
      settings: [
        'id: edit_branch\n    type: form\n    permission: settings.write',
        'id: delete_branch\n    type: delete\n    permission: settings.write',
        'id: edit_translation\n    type: form\n    permission: settings.write',
      ],
      'system-approval-flow-detail': [
        'id: edit_step, label: Sửa, variant: ghost, permission: system.write',
        'id: move_step_up, type: server, permission: system.write',
      ],
      'system-code-rules': ['id: preview_code_rule, label: Xem mẫu, variant: ghost, permission: system.read', 'result: alert', 'result_field: preview'],
      'system-print-template-detail': [
        'type: TemplatePreview, source: template_blocks, template_source: print_template',
        'id: edit_block, label: Sửa, variant: ghost, permission: system.write',
        'id: move_block_down, type: server, permission: system.write',
      ],
    };
    for (const [page, fragments] of Object.entries(expectations)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      for (const fragment of fragments) expect(source).toContain(fragment);
    }
  });

  it('keeps legacy GridView empty states localized', () => {
    const expectations: Record<string, string> = {
      fleet: 'title: Không có phương tiện',
      maintenance: 'title: Không có lịch bảo dưỡng',
      settings: 'title: Không có chi nhánh',
      reports: 'title: Không có dữ liệu tài xế',
    };
    for (const [page, text] of Object.entries(expectations)) {
      expect(readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8')).toContain(text);
    }
  });

  it('keeps legacy filter-bar labels declarative and localized', () => {
    for (const page of ['fleet', 'maintenance', 'settings']) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toContain('all_label: Tất cả');
      expect(source).toContain('clear_label: Xóa bộ lọc');
    }
  });

  it('keeps detail timeline empty states localized', () => {
    const expectations: Record<string, string> = {
      'accounting-document-detail': 'Chưa có hoạt động chứng từ',
      'quote-detail': 'Chưa có hoạt động báo giá',
      'payroll-detail': 'Chưa có hoạt động bảng lương',
      'user-detail': 'Chưa có hoạt động người dùng',
      'crm-entity-detail': 'Chưa có hoạt động liên hệ',
      'employee-detail': 'Chưa có hoạt động nhân viên',
      'order-detail': 'Chưa có hoạt động đơn hàng',
      'contract-detail': 'Chưa có hoạt động hợp đồng',
    };
    for (const [page, text] of Object.entries(expectations)) {
      expect(readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8')).toContain(`empty_state: { title: ${text} }`);
    }
  });

  it('keeps raw detail timeline actions declaratively localized', () => {
    const expectations: Record<string, string> = {
      'employee-detail': 'action_labels: { create: Đã tạo, update: Cập nhật, upload: Tải tài liệu lên, delete: Xóa }',
      'contract-detail': 'action_labels: { create: Đã tạo, update: Cập nhật, upload: Tải tài liệu lên, delete: Xóa }',
      'payroll-detail': 'action_labels: { create: Đã tạo, update: Cập nhật, approve: Đã duyệt, mark_paid: Đã thanh toán, reopen: Mở lại, delete: Xóa }',
      'user-detail': 'action_labels: { create: Đã tạo, update: Cập nhật, grant: Gán vai trò, revoke: Thu hồi vai trò, password: Đổi mật khẩu, delete: Xóa }',
    };
    for (const [page, text] of Object.entries(expectations)) {
      expect(readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8')).toContain(text);
    }
  });

  it('keeps every canonical DataGrid empty state localized', () => {
    const expectations: Record<string, string> = {
      'system-fee-rules': 'Chưa có công thức phí',
      'role-detail': 'Chưa có quyền trong vai trò',
      'user-detail': 'Chưa có vai trò được gán',
      'system-trip-statuses': 'Chưa có trạng thái chuyến',
      'system-storage': 'Chưa có cấu hình kho',
      'system-print-templates': 'Chưa có mẫu in',
      'system-approval-flows': 'Chưa có quy trình duyệt',
      quotes: 'Chưa có báo giá',
      'crm-kpi': 'Chưa có chỉ tiêu theo giai đoạn',
      'crm-dashboard': 'Chưa có báo giá gần đây',
      'system-code-rules': 'Chưa có quy tắc sinh mã',
      'system-shipment-types': 'Chưa có loại hình vận chuyển',
      dashboard: 'Chưa có dữ liệu tuyến đường',
    };
    for (const [page, text] of Object.entries(expectations)) {
      expect(readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8')).toContain(text);
    }
  });

  it('keeps system master-data lists exportable', () => {
    for (const page of ['system-shipment-types', 'system-trip-statuses']) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toContain("label: 'Xuất CSV'");
      expect(source).toContain('icon: download');
    }
  });

  it('keeps the canonical area hierarchy exportable', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages', 'areas.yaml'), 'utf8');
    expect(source).toContain('id: areas.export');
    expect(source).toContain("label: 'Xuất CSV'");
    expect(source).toContain('icon: download');
  });

  it('keeps accounting workflow lists date-filterable at the datasource boundary', () => {
    const expectations: Record<string, string> = {
      'accounting-debit-notes': 'from_label: \'Từ ngày chứng từ\'',
      'accounting-payment-requests': 'from_label: \'Từ ngày đề nghị\'',
      'accounting-advances': 'from_label: \'Từ ngày tạm ứng\'',
      'accounting-settlements': 'from_label: \'Từ ngày hoàn ứng\'',
    };
    for (const [page, text] of Object.entries(expectations)) {
      const source = readFileSync(resolve(process.cwd(), 'pages', `${page}.yaml`), 'utf8');
      expect(source).toContain(text);
      expect(source).toContain(':from_date');
      expect(source).toContain(':to_date');
    }
  });

  it('keeps driver compliance lists filterable by license expiry', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages', 'drivers.yaml'), 'utf8');
    expect(source).toContain("from_label: 'Hạn giấy phép từ'");
    expect(source).toContain("to_label: 'Hạn giấy phép đến'");
    expect(source).toContain('d.license_expiry >= CAST(:from_date AS DATE)');
    expect(source).toContain('d.license_expiry < CAST(:to_date AS DATE) + INTERVAL 1 DAY');
  });
});

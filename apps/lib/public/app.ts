import { AppShell } from '../../tms/components/AppShell.ts';
import { i18n } from '../../tms/i18n.ts';
import { renderPage } from '../page-renderer.ts';
import { registerNavigator } from '../navigate.ts';
import { client } from '../client.ts';

const TOKEN_KEY = 'tms_token';
let _user: any = null;
let _shell: AppShell | null = null;

// Routes: string = server page id, function = JS module loader
const ROUTES: Record<string, string | (() => Promise<any>)> = {
  '/login':        () => import('../../tms/pages/login.ts'),
  '/dashboard':    'dashboard',
  '/fleet':        'fleet', '/trips': 'trips', '/maintenance': 'maintenance', '/reports': 'reports', '/settings': 'settings',
  '/vehicles':     'vehicles', '/vehicles/detail': 'vehicle-detail',
  '/drivers':      'drivers', '/drivers/detail': 'driver-detail',
  '/orders':       'orders',
  '/orders/detail': 'order-detail',
  '/chat':         'chat',
  '/schedule':     'schedule',
  '/customers':    'customers',
  '/partners':     'partners',
  '/crm/entities/detail': 'crm-entity-detail',
  '/quotes':       'quotes', '/quotes/detail': 'quote-detail',
  '/crm/dashboard': 'crm-dashboard', '/crm/kpi': 'crm-kpi',
  '/accounting/debit-notes': 'accounting-debit-notes',
  '/accounting/debit-note-summary': 'accounting-debit-note-summary',
  '/accounting/payment-requests': 'accounting-payment-requests',
  '/accounting/payment-request-summary': 'accounting-payment-request-summary',
  '/accounting/advances': 'accounting-advances',
  '/accounting/settlements': 'accounting-settlements',
  '/accounting/documents/detail': 'accounting-document-detail',
  '/accounting/invoice-templates': 'accounting-invoice-templates',
  '/accounting/ledger-accounts': 'accounting-ledger-accounts',
  '/hr/employees': 'employees', '/hr/employees/detail': 'employee-detail', '/hr/payroll/detail': 'payroll-detail',
  '/hr/contracts': 'contracts', '/hr/contracts/detail': 'contract-detail',
  '/hr/timesheets': 'timesheets',
  '/hr/shifts': 'shifts',
  '/hr/payroll': 'payroll',
  '/containers': 'containers',
  '/locations': 'locations', '/areas/detail': 'area-detail',
  '/areas': 'areas',
  '/catalog/container-types': 'catalog-container-types',
  '/catalog/vehicle-types': 'catalog-vehicle-types',
  '/catalog/units': 'catalog-units',
  '/catalog/cargo-types': 'catalog-cargo-types',
  '/catalog/fee-types': 'catalog-fee-types',
  '/catalog/currencies': 'catalog-currencies',
  '/org/own-company': 'own-company',
  '/org/branches': 'branches', '/org/branches/detail': 'branch-detail',
  '/org/departments': 'departments', '/org/departments/detail': 'department-detail',
  '/org/teams': 'teams',
  '/org/users': 'users', '/org/users/detail': 'user-detail',
  '/org/roles': 'roles', '/org/roles/detail': 'role-detail',
  '/system/activity': 'system-activity', '/system/code-rules': 'system-code-rules',
  '/system/print-templates': 'system-print-templates', '/system/approval-flows': 'system-approval-flows',
  '/system/print-templates/detail': 'system-print-template-detail',
  '/system/approval-flows/detail': 'system-approval-flow-detail',
  '/system/shipment-types': 'system-shipment-types', '/system/trip-statuses': 'system-trip-statuses',
  '/system/fee-rules': 'system-fee-rules', '/system/storage': 'system-storage',
};

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Tổng quan',
  '/orders': 'Đơn hàng', '/orders/detail': 'Chi tiết đơn hàng',
  '/chat': 'Tin nhắn', '/schedule': 'Lịch điều',
  '/customers': 'Khách hàng', '/partners': 'Đối tượng', '/quotes': 'Báo giá',
  '/crm/entities/detail': 'Chi tiết đối tượng CRM',
  '/quotes/detail': 'Chi tiết báo giá',
  '/crm/dashboard': 'Tổng hợp CRM', '/crm/kpi': 'Chỉ tiêu KPI',
  '/accounting/debit-notes': 'Giấy báo nợ',
  '/accounting/debit-note-summary': 'Tổng hợp giấy báo nợ',
  '/accounting/payment-requests': 'Đề nghị thanh toán',
  '/accounting/payment-request-summary': 'Tổng hợp đề nghị chi',
  '/accounting/advances': 'Tạm ứng', '/accounting/settlements': 'Hoàn ứng',
  '/accounting/documents/detail': 'Chi tiết chứng từ',
  '/accounting/invoice-templates': 'Mẫu hóa đơn',
  '/accounting/ledger-accounts': 'Hệ thống tài khoản',
  '/hr/employees': 'Nhân viên', '/hr/employees/detail': 'Chi tiết nhân viên', '/hr/contracts': 'Hợp đồng', '/hr/contracts/detail': 'Chi tiết hợp đồng', '/hr/payroll/detail': 'Chi tiết bảng lương',
  '/hr/timesheets': 'Chấm công', '/hr/shifts': 'Ca làm việc', '/hr/payroll': 'Bảng lương',
  '/drivers': 'Tài xế', '/drivers/detail': 'Chi tiết tài xế', '/vehicles': 'Phương tiện', '/vehicles/detail': 'Chi tiết phương tiện', '/containers': 'Container',
  '/locations': 'Địa điểm', '/areas': 'Khu vực', '/areas/detail': 'Chi tiết khu vực',
  '/catalog/container-types': 'Loại container', '/catalog/vehicle-types': 'Loại xe',
  '/catalog/units': 'Đơn vị tính', '/catalog/cargo-types': 'Loại hàng hóa',
  '/catalog/fee-types': 'Loại phí', '/catalog/currencies': 'Tiền tệ',
  '/org/own-company': 'Công ty chủ quản', '/org/branches': 'Chi nhánh', '/org/branches/detail': 'Chi tiết chi nhánh', '/org/departments/detail': 'Chi tiết phòng ban', '/org/roles/detail': 'Chi tiết vai trò', '/org/users/detail': 'Chi tiết người dùng',
  '/org/departments': 'Phòng ban', '/org/teams': 'Đội nhóm', '/org/users': 'Người dùng',
  '/org/roles': 'Vai trò', '/system/activity': 'Lịch sử thao tác',
  '/system/code-rules': 'Cấu hình sinh mã', '/system/print-templates': 'Mẫu in',
  '/system/approval-flows': 'Quy trình duyệt',
  '/system/print-templates/detail': 'Chi tiết mẫu in',
  '/system/approval-flows/detail': 'Chi tiết quy trình duyệt',
  '/system/shipment-types': 'Loại hình vận chuyển',
  '/system/trip-statuses': 'Trạng thái chuyến',
  '/system/fee-rules': 'Công thức phí chuyến', '/system/storage': 'Quản lý dung lượng',
};

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  return _user;
}

export function getDefaultRoute(user: any = _user) {
  const permissions = new Set<string>(user?.permissions || []);
  if (permissions.has('fleet.read')) return '/dashboard';
  if (permissions.has('orders.read')) return '/orders';
  if (permissions.has('crm.read')) return '/customers';
  if (permissions.has('accounting.read')) return '/accounting/debit-notes';
  if (permissions.has('hr.read')) return '/hr/employees';
  if (permissions.has('system.read')) return '/system/activity';
  return '/login';
}

export async function setAuth(token: string, user: any) {
  localStorage.setItem(TOKEN_KEY, token);
  _user = user;
  window.__CORE3_USER__ = user;
  client.setToken(token);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  _user = null;
  _shell?.dispose();
  _shell = null;
  client.setToken(null);
  const app = document.getElementById('app');
  if (app) app.innerHTML = '<div id="outlet"></div>';
  navigate('/login');
}

export async function navigate(path: string, params: Record<string, string | number | boolean | null | undefined> = {}) {
  const qs = Object.keys(params).length
    ? '?' + new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)])
      )
    ).toString()
    : '';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const target = `#${normalizedPath}${qs}`;
  if (window.location.hash === target) {
    await renderRoute(normalizedPath);
    return;
  }
  window.location.hash = target;
}

// apiFetch: wrapper that adds auth header
export async function apiFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    logout();
    throw new Error('Unauthorized');
  }
  return res;
}

async function renderRoute(path: string) {
  // Normalize: strip trailing slash
  const cleanPath = path === '/' ? '/dashboard' : path.replace(/\/$/, '');
  const loader = ROUTES[cleanPath as keyof typeof ROUTES] || ROUTES['/dashboard'];

  const outlet = document.getElementById('outlet');
  if (!outlet) return;

  // Show loading indicator
  outlet.innerHTML = `<div class="flex items-center justify-center py-20 text-gray-400">
    <div class="spinner" style="border-color:rgba(79,70,229,0.2);border-top-color:var(--color-primary);width:24px;height:24px;"></div>
  </div>`;

  // Prefetch i18n for this page
  const pageName = cleanPath.slice(1).replace('/', '-') || 'dashboard';
  await i18n.prefetch(pageName);
  await i18n.prefetch('*');

  // Update shell active nav + header title
  if (_shell) {
    _shell.setActivePath(cleanPath);
    _shell.setTitle(i18n.t(pageName, null, ROUTE_TITLES[cleanPath as keyof typeof ROUTE_TITLES] || 'TMS'));
  }

  try {
    outlet.innerHTML = '';
    if (typeof loader === 'string') {
      // The server strips datasource definitions before returning the page config.
      const res = await apiFetch(`/api/pages/${loader}`);
      if (!res.ok) throw new Error(`Failed to load page (${res.status})`);
      const config = await res.json();
      config.locale = 'vi';
      await renderPage(config, { container: outlet });
    } else {
      // JS module route (e.g. login)
      const mod = await loader();
      await mod.mount(outlet);
    }
  } catch (err) {
    console.error('Route load error:', err);
    const message = err instanceof Error ? err.message : String(err);
    outlet.innerHTML = `<div class="flex flex-col items-center justify-center py-20 text-red-500">
      <div style="font-size:2rem;margin-bottom:8px">&#9888;&#65039;</div>
      <div style="font-weight:600">Failed to load page</div>
      <div style="font-size:0.8rem;color:var(--color-text-muted);margin-top:4px">${message}</div>
    </div>`;
  }
}

async function bootstrap() {
  const app = document.getElementById('app');
  const token = getToken();
  if (!app) return;

  // No token → login
  if (!token) {
    app.innerHTML = '<div id="outlet"></div>';
    await renderRoute('/login');
    return;
  }

  // Verify token
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Token invalid');
    _user = await res.json();
    window.__CORE3_USER__ = _user;
    client.setToken(token);
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    app.innerHTML = '<div id="outlet"></div>';
    await renderRoute('/login');
    return;
  }

  // Prefetch global i18n
  const lang = _user?.preferred_lang || 'en';
  await i18n.setLang(lang);

  // Mount app shell
  let company: any = null;
  try {
    const companyRes = await fetch('/api/v1/company', { headers: { Authorization: `Bearer ${token}` } });
    if (companyRes.ok) company = await companyRes.json();
  } catch {
    // The shell can still render if a deployment has no company profile yet.
  }
  _shell = new AppShell('app-shell', {
    user: _user,
    company,
    onLanguageChange: async () => {
      const currentPath = window.location.hash.slice(1).split('?')[0] || getDefaultRoute(_user);
      await renderRoute(currentPath);
    },
  });
  _shell.mount(app);

  // Register navigator so page-renderer navigate() calls use SPA pushState
  registerNavigator((path: string, params: Record<string, unknown> = {}) => {
    void navigate(path, params as Record<string, string | number | boolean | null | undefined>);
  });

  // Match the reference app's hash-routing model. Keeping routing client-side
  // also avoids a server allowlist change for every new parity route.
  const hashPath = window.location.hash.slice(1).split('?')[0] || getDefaultRoute(_user);
  await renderRoute(hashPath);
}

// Handle browser back/forward and direct hash navigation.
window.addEventListener('hashchange', () => {
  const hashPath = window.location.hash.slice(1).split('?')[0] || getDefaultRoute(_user);
  void renderRoute(hashPath);
});

bootstrap();

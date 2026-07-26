import { AppShell } from './components/AppShell.ts';
import { i18n } from './i18n.ts';
import { renderPage } from '@core3/framework/page-renderer.ts';
import { registerNavigator } from '@core3/framework/navigate.ts';
import { client } from '@core3/framework/client.ts';

const TOKEN_KEY = 'tms_token';
let _user: any = null;
let _shell: AppShell | null = null;

// Routes: string = server page id, function = JS module loader
const ROUTES: Record<string, string | (() => Promise<any>)> = {
  '/login':        () => import('./pages/login.ts'),
  '/dashboard':    'dashboard',
  '/vehicles':     'vehicles',
  '/drivers':      'drivers',
  '/orders':       'orders',
  '/chat':         () => import('./pages/placeholder.ts'),
  '/schedule':     'trips',
  '/customers':    'customers',
  '/partners':     () => import('./pages/placeholder.ts'),
  '/quotes':       () => import('./pages/placeholder.ts'),
  '/crm/dashboard': () => import('./pages/placeholder.ts'),
  '/crm/kpi':      () => import('./pages/placeholder.ts'),
  '/accounting/debit-notes': () => import('./pages/placeholder.ts'),
  '/accounting/debit-note-summary': () => import('./pages/placeholder.ts'),
  '/accounting/payment-requests': () => import('./pages/placeholder.ts'),
  '/accounting/payment-request-summary': () => import('./pages/placeholder.ts'),
  '/accounting/advances': () => import('./pages/placeholder.ts'),
  '/accounting/settlements': () => import('./pages/placeholder.ts'),
  '/accounting/invoice-templates': () => import('./pages/placeholder.ts'),
  '/accounting/ledger-accounts': () => import('./pages/placeholder.ts'),
  '/hr/employees': () => import('./pages/placeholder.ts'),
  '/hr/contracts': () => import('./pages/placeholder.ts'),
  '/hr/timesheets': () => import('./pages/placeholder.ts'),
  '/hr/shifts': () => import('./pages/placeholder.ts'),
  '/hr/payroll': () => import('./pages/placeholder.ts'),
  '/containers': () => import('./pages/placeholder.ts'),
  '/locations': () => import('./pages/placeholder.ts'),
  '/areas': () => import('./pages/placeholder.ts'),
  '/catalog/container-types': () => import('./pages/placeholder.ts'),
  '/catalog/vehicle-types': () => import('./pages/placeholder.ts'),
  '/catalog/units': () => import('./pages/placeholder.ts'),
  '/catalog/cargo-types': () => import('./pages/placeholder.ts'),
  '/catalog/fee-types': () => import('./pages/placeholder.ts'),
  '/catalog/currencies': () => import('./pages/placeholder.ts'),
  '/org/own-company': () => import('./pages/placeholder.ts'),
  '/org/branches': () => import('./pages/placeholder.ts'),
  '/org/departments': () => import('./pages/placeholder.ts'),
  '/org/teams': () => import('./pages/placeholder.ts'),
  '/org/users': () => import('./pages/placeholder.ts'),
  '/org/roles': () => import('./pages/placeholder.ts'),
  '/system/activity': () => import('./pages/placeholder.ts'),
  '/system/code-rules': () => import('./pages/placeholder.ts'),
  '/system/print-templates': () => import('./pages/placeholder.ts'),
  '/system/approval-flows': () => import('./pages/placeholder.ts'),
  '/system/shipment-types': () => import('./pages/placeholder.ts'),
  '/system/trip-statuses': () => import('./pages/placeholder.ts'),
  '/system/fee-rules': () => import('./pages/placeholder.ts'),
  '/system/storage': () => import('./pages/placeholder.ts'),
};

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Tổng quan',
  '/orders': 'Đơn hàng', '/chat': 'Tin nhắn', '/schedule': 'Lịch điều',
  '/customers': 'Khách hàng', '/partners': 'Đối tượng', '/quotes': 'Báo giá',
  '/crm/dashboard': 'Tổng hợp CRM', '/crm/kpi': 'Chỉ tiêu KPI',
  '/accounting/debit-notes': 'Giấy báo nợ',
  '/accounting/debit-note-summary': 'Tổng hợp giấy báo nợ',
  '/accounting/payment-requests': 'Đề nghị thanh toán',
  '/accounting/payment-request-summary': 'Tổng hợp đề nghị chi',
  '/accounting/advances': 'Tạm ứng', '/accounting/settlements': 'Hoàn ứng',
  '/accounting/invoice-templates': 'Mẫu hóa đơn',
  '/accounting/ledger-accounts': 'Hệ thống tài khoản',
  '/hr/employees': 'Nhân viên', '/hr/contracts': 'Hợp đồng',
  '/hr/timesheets': 'Chấm công', '/hr/shifts': 'Ca làm việc', '/hr/payroll': 'Bảng lương',
  '/drivers': 'Tài xế', '/vehicles': 'Phương tiện', '/containers': 'Container',
  '/locations': 'Địa điểm', '/areas': 'Khu vực',
  '/catalog/container-types': 'Loại container', '/catalog/vehicle-types': 'Loại xe',
  '/catalog/units': 'Đơn vị tính', '/catalog/cargo-types': 'Loại hàng hóa',
  '/catalog/fee-types': 'Loại phí', '/catalog/currencies': 'Tiền tệ',
  '/org/own-company': 'Công ty chủ quản', '/org/branches': 'Chi nhánh',
  '/org/departments': 'Phòng ban', '/org/teams': 'Team', '/org/users': 'Người dùng',
  '/org/roles': 'Vai trò', '/system/activity': 'Lịch sử thao tác',
  '/system/code-rules': 'Cấu hình sinh mã', '/system/print-templates': 'Mẫu in',
  '/system/approval-flows': 'Quy trình duyệt',
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

export async function setAuth(token: string, user: any) {
  localStorage.setItem(TOKEN_KEY, token);
  _user = user;
  window.__CORE3_USER__ = user;
  client.setToken(token);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  _user = null;
  _shell = null;
  client.setToken(null);
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
  _shell = new AppShell('app-shell', { user: _user });
  _shell.mount(app);

  // Register navigator so page-renderer navigate() calls use SPA pushState
  registerNavigator((path: string, params: Record<string, unknown> = {}) => {
    void navigate(path, params as Record<string, string | number | boolean | null | undefined>);
  });

  // Match the reference app's hash-routing model. Keeping routing client-side
  // also avoids a server allowlist change for every new parity route.
  const hashPath = window.location.hash.slice(1).split('?')[0] || '/dashboard';
  await renderRoute(hashPath);
}

// Handle browser back/forward and direct hash navigation.
window.addEventListener('hashchange', () => {
  const hashPath = window.location.hash.slice(1).split('?')[0] || '/dashboard';
  void renderRoute(hashPath);
});

bootstrap();

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
  '/fleet':        'fleet',
  '/drivers':      'drivers',
  '/trips':        'trips',
  '/maintenance':  'maintenance',
  '/reports':      'reports',
  '/settings':     'settings',
};

const ROUTE_TITLES: Record<string, string> = {
  '/fleet':        'Fleet Overview',
  '/drivers':      'Drivers',
  '/trips':        'Trip Management',
  '/maintenance':  'Maintenance',
  '/reports':      'Reports',
  '/settings':     'Settings',
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
  history.pushState({}, '', path + qs);
  await renderRoute(path);
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
  const cleanPath = path === '/' ? '/fleet' : path.replace(/\/$/, '');
  const loader = ROUTES[cleanPath as keyof typeof ROUTES] || ROUTES['/fleet'];

  const outlet = document.getElementById('outlet');
  if (!outlet) return;

  // Show loading indicator
  outlet.innerHTML = `<div class="flex items-center justify-center py-20 text-gray-400">
    <div class="spinner" style="border-color:rgba(79,70,229,0.2);border-top-color:var(--color-primary);width:24px;height:24px;"></div>
  </div>`;

  // Prefetch i18n for this page
  const pageName = cleanPath.slice(1) || 'fleet';
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
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
    ).toString();
    const url = path + (qs ? '?' + qs : '');
    history.pushState({}, '', url);
    void renderRoute(path);
  });

  // Navigate to current path (or default to /fleet)
  const path = window.location.pathname || '/fleet';
  await renderRoute(path === '/' ? '/fleet' : path);
}

// Handle browser back/forward
window.addEventListener('popstate', () => {
  void renderRoute(window.location.pathname);
});

bootstrap();

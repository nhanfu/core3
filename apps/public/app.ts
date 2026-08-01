import { AppShell } from './components/AppShell.ts';
import { i18n } from '../lib/i18n.ts';
import { renderPage } from '../lib/page-renderer.ts';
import { getPageParams, registerNavigator } from '../lib/navigate.ts';
import { client } from '../lib/client.ts';

const TOKEN_KEY = 'tms_token';
const DEFAULT_APP_KEY = 'core3_default_app';
const WELCOME_TOAST_KEY = 'core3_show_welcome_toast';
let _user: any = null;
let _shell: AppShell | null = null;
let _apps: any[] = [];
let _activeModuleId = '';
type ManifestPage = { id: string; route: string | null; title: string };
type ManifestModule = { id: string; pages: ManifestPage[]; routes?: Array<{ path: string; page: string }> };
let _manifest: ManifestModule[] = [];

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  return _user;
}

function defaultAppStorageKey(user: any = _user) {
  return `${DEFAULT_APP_KEY}:${String(user?.sub || user?.id || 'anonymous')}`;
}

export function getDefaultApp(user: any = _user) {
  const selected = localStorage.getItem(defaultAppStorageKey(user));
  return _apps.find((app) => app.id === selected && app.available) || null;
}

export function setDefaultApp(appId: string, user: any = _user) {
  if (_apps.some((app) => app.id === appId && app.available)) {
    localStorage.setItem(defaultAppStorageKey(user), appId);
  }
}

export function getApps() {
  return _apps;
}

export function selectApp(app: any, makeDefault = false) {
  if (!app?.available) return;
  if (makeDefault) setDefaultApp(String(app.id));
  _activeModuleId = String(app.module || app.id || '');
  _shell?.setCurrentApp(app);
  navigate(String(app.route || '/dashboard'));
}

export function getDefaultRoute(user: any = _user) {
  const selected = getDefaultApp(user);
  if (selected?.route) return selected.route;
  return '/apps';
}

export async function setAuth(token: string, user: any) {
  localStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(WELCOME_TOAST_KEY, '1');
  _user = user;
  window.__CORE3_USER__ = user;
  client.setToken(token);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(WELCOME_TOAST_KEY);
  _user = null;
  _shell?.dispose();
  _shell = null;
  client.setToken(null);
  const app = document.getElementById('app');
  if (app) app.innerHTML = '<div id="outlet"></div>';
  navigate('/auth/login');
}

function routeWithModule(path: string) {
  const routePath = path.startsWith('/') ? path : `/${path}`;
  if (routePath === '/apps') return routePath;
  if (_manifest.some((module) => routePath === `/${module.id}` || routePath.startsWith(`/${module.id}/`))) return routePath;
  if (routePath === '/login' || routePath.startsWith('/login/')) return `/auth${routePath}`;
  const moduleId = _activeModuleId || String(getDefaultApp()?.module || getDefaultApp()?.id || 'tms');
  return `/${moduleId}${routePath}`;
}

export async function navigate(path: string, params: Record<string, string | number | boolean | null | undefined> = {}) {
  const routePath = routeWithModule(path);
  const currentParams = new URLSearchParams(window.location.search);
  if (params.lc == null && currentParams.get('lc')) params = { ...params, lc: currentParams.get('lc') };
  const qs = Object.keys(params).length
    ? '?' + new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)])
      )
    ).toString()
    : '';
  const target = `${routePath}${qs}`;
  if (`${window.location.pathname}${window.location.search}` === target) {
    const location = currentLocation();
    await renderRoute(location.path, location.langCode);
    return;
  }
  window.history.pushState({}, '', target);
  const location = currentLocation();
  await renderRoute(location.path, location.langCode);
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

function currentLocation() {
  const path = window.location.pathname === '/' ? getDefaultRoute(_user) : window.location.pathname;
  const module = _manifest.find((entry) => path === `/${entry.id}` || path.startsWith(`/${entry.id}/`));
  if (module) _activeModuleId = module.id;
  return { path: path.replace(/\/$/, '') || '/', langCode: new URLSearchParams(window.location.search).get('lc') || undefined };
}

async function renderRoute(path: string, langCode?: string) {
  if (langCode && langCode !== i18n.lang) await i18n.setLang(langCode);
  // Normalize: strip trailing slash
  const cleanPath = path === '/' ? '/dashboard' : path.replace(/\/$/, '');
  const route = _manifest.flatMap((module) => module.routes || []).find((entry) => entry.path === cleanPath);
  const page = _manifest.flatMap((module) => module.pages).find((entry) => entry.id === route?.page || entry.route === cleanPath);
  const pageId = page?.id || 'dashboard';

  const outlet = document.getElementById('outlet');
  if (!outlet) return;

  // Show loading indicator
  outlet.innerHTML = `<div class="flex items-center justify-center py-20 text-gray-400">
    <div class="spinner" style="border-color:rgba(79,70,229,0.2);border-top-color:var(--color-primary);width:24px;height:24px;"></div>
  </div>`;

  // The page response includes its datasource data and i18n payload.
  const pageName = pageId;

  // Update shell active nav + header title
  if (_shell) {
    const activePath = route ? cleanPath.slice(`/${_activeModuleId}`.length) || '/' : cleanPath;
    _shell.setActivePath(activePath);
    _shell.setTitle(i18n.t(pageName, null, page?.title || 'TMS'));
  }

  try {
    outlet.innerHTML = '';
    if (cleanPath === '/apps') {
      const mod = await import('./components/AppPicker.ts');
      await mod.mount(outlet);
    } else {
      const pageParams = new URLSearchParams({ lc: i18n.lang });
      for (const [key, value] of Object.entries(getPageParams() as Record<string, string>)) {
        pageParams.set(key, value);
      }
      const fetchOptions: RequestInit = pageParams.get('cache') === 'false'
        ? { cache: 'no-store' }
        : {};
      const res = await apiFetch(`/api/pages/${pageId}?${pageParams.toString()}`, fetchOptions);
      if (!res.ok) throw new Error(`Failed to load page (${res.status})`);
      const config = await res.json();
      i18n.hydrate(pageId, config.i18n);
      delete config.i18n;
      const translatedConfig = i18n.translatePageConfig(pageId, config);
      translatedConfig.locale = i18n.lang;
      if (_shell) {
        _shell.setTitle(i18n.t(pageId, null, page?.title || 'TMS'));
      }
      await renderPage(translatedConfig, { container: outlet });
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
  try {
    const cached = sessionStorage.getItem('core3_module_manifest');
    _manifest = cached ? JSON.parse(cached) : [];
    const response = await fetch('/api/modules', { cache: 'force-cache' });
    if (response.ok) {
      _manifest = await response.json() as ManifestModule[];
      sessionStorage.setItem('core3_module_manifest', JSON.stringify(_manifest));
    }
  } catch {
    _manifest = [];
  }
  try {
    const appsResponse = await fetch('/api/apps');
    _apps = appsResponse.ok ? await appsResponse.json() as any[] : [];
  } catch {
    _apps = [];
  }
  _activeModuleId = String(getDefaultApp()?.module || getDefaultApp()?.id || '');
  const token = getToken();
  if (!app) return;

  // No token → login
  if (!token) {
    app.innerHTML = '<div id="outlet"></div>';
    const location = currentLocation();
    await renderRoute('/auth/login', location.langCode);
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
    sessionStorage.removeItem(WELCOME_TOAST_KEY);
    app.innerHTML = '<div id="outlet"></div>';
    const location = currentLocation();
    await renderRoute('/auth/login', location.langCode);
    return;
  }

  // Prefetch global i18n
  const requestedLocation = currentLocation();
  const lang = requestedLocation.langCode || _user?.preferred_lang || 'en';
  await i18n.setLang(lang);

  // Menus belong to modules and are discovered from pages/menu.yaml on the
  // server. The shell only receives the public, parsed declaration.
  let menu: any = {};
  const modules = i18n.menuModules;
  menu = modules.reduce((merged, entry) => ({
    dashboard: merged.dashboard || entry.menu?.dashboard,
    groups: [...(merged.groups || []), ...(entry.menu?.groups || [])],
  }), {});

  // Mount app shell
  const showWelcomeToast = sessionStorage.getItem(WELCOME_TOAST_KEY) === '1';
  sessionStorage.removeItem(WELCOME_TOAST_KEY);
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
    menu,
    apps: _apps,
    currentApp: getDefaultApp(_user),
    showWelcomeToast,
    navigate,
    onLanguageChange: async (langCode: string) => {
      const location = currentLocation();
      await navigate(location.path, { lc: langCode });
    },
    onAppChange: (app: any, makeDefault = false) => selectApp(app, makeDefault),
  });
  _shell.mount(app);

  // Register navigator so page-renderer navigate() calls use SPA pushState
  registerNavigator((path: string, params: Record<string, unknown> = {}) => {
    void navigate(path, params as Record<string, string | number | boolean | null | undefined>);
  });

  const location = currentLocation();
  const canonicalPath = routeWithModule(location.path);
  if (canonicalPath !== location.path) {
    window.history.replaceState({}, '', `${canonicalPath}${window.location.search}`);
    location.path = canonicalPath;
  }
  await renderRoute(location.path, location.langCode);
}

// Handle browser back/forward and direct slash navigation.
window.addEventListener('popstate', () => {
  const location = currentLocation();
  void renderRoute(location.path, location.langCode);
});

bootstrap();

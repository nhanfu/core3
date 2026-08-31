import { html } from '@core3/client/html';
import { registerNavigator } from '@core3/client/navigate';
import { PageRuntime } from '@core3/client/components/PageRoot';
import { registerPageComponentSchema, validatePageDefinition } from '@core3/server/yaml/schema';
import { DocTopNav } from '@core3/client/doc/DocTopNav';
import { DocPage } from '@core3/client/doc/DocPage';

// Mirrors the registration in server.ts — the browser loads its own copy of
// the shared page schema, so the custom "DocPage" type must be declared here too.
registerPageComponentSchema('DocPage', ['layout', 'hero', 'timelineNav', 'sections']);

const ROUTES: Record<string, string> = {
  '/': 'home',
  '/overview': 'overview',
  '/frontend': 'frontend',
  '/backend': 'backend',
  '/scripting': 'scripting',
  '/reference': 'reference',
  '/methodology': 'methodology',
  '/component-library': 'component-library',
  '/extensions': 'extensions',
  '/roadmap': 'roadmap',
  '/plan/auth-mediator': 'plan-auth-mediator',
};

const registry = new Map<string, any>();
registry.set('DocPage', DocPage);

const app = document.getElementById('app')!;
const navSlot = html.take(app).div.ele() as HTMLElement;
const contentSlot = html.take(app).div.attr('id', 'doc-content').ele() as HTMLElement;
const scrollKey = () => `core3-spec-scroll:${window.location.pathname}`;

window.addEventListener('beforeunload', () => {
  sessionStorage.setItem(scrollKey(), String(window.scrollY));
});

let topNav: DocTopNav | null = null;

function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

const THEME_KEY = 'core3-spec-theme';
const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

function systemTheme(): 'light' | 'dark' {
  return darkMediaQuery.matches ? 'dark' : 'light';
}

function currentTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : systemTheme();
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme;
  topNav?.setState({ theme });
}

function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

// If the user hasn't explicitly picked a theme, keep following the OS setting live.
darkMediaQuery.addEventListener('change', () => {
  if (!localStorage.getItem(THEME_KEY)) applyTheme(systemTheme());
});

async function renderRoute(pathname: string, restoreScroll = false) {
  const path = normalizePath(pathname);
  const pageId = ROUTES[path];
  topNav?.setState({ active: path });

  if (!pageId) {
    html.take(contentSlot).clear();
    html.take(contentSlot).div.className('doc-not-found').text(`No page is mapped to ${path}`);
    return;
  }
  const response = await fetch(`/api/pages/${pageId}`);
  if (!response.ok) {
    html.take(contentSlot).clear();
    html.take(contentSlot).div.className('doc-not-found').text(`Page "${pageId}" could not be loaded`);
    return;
  }
  const config = validatePageDefinition(await response.json(), { allowExternalSources: true });
  await new PageRuntime(config, registry).render(contentSlot);
  if (restoreScroll) {
    const saved = sessionStorage.getItem(scrollKey());
    if (saved !== null) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.scrollTo(0, Number(saved));
        sessionStorage.removeItem(scrollKey());
      }));
    }
  }
}

function navigate(path: string) {
  const target = normalizePath(path);
  if (target !== normalizePath(window.location.pathname)) {
    window.history.pushState({}, '', target);
  }
  void renderRoute(target);
}

registerNavigator((pageId: string) => navigate(pageId));

window.addEventListener('popstate', () => {
  void renderRoute(window.location.pathname);
});

async function bootstrap() {
  const nav = await (await fetch('/api/nav')).json();
  topNav = new DocTopNav('doc-top-nav', {
    active: normalizePath(window.location.pathname),
    onNavigate: navigate,
    theme: currentTheme(),
    onToggleTheme: toggleTheme,
  }, nav.nav || {});
  topNav.mount(navSlot);
  await renderRoute(window.location.pathname, true);
}

void bootstrap();

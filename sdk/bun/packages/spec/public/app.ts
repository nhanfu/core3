import { html } from '@core3/client/html';
import { registerNavigator } from '@core3/client/navigate';
import { PageRuntime } from '@core3/client/components/PageRoot';
import { registerPageComponentSchema, validatePageDefinition } from '@core3/server/yaml/schema';
import { DocTopNav } from '@core3/client/doc/DocTopNav';
import { DocPage } from '@core3/client/doc/DocPage';

// Mirrors the registration in server.ts — the browser loads its own copy of
// the shared page schema, so the custom "DocPage" type must be declared here too.
registerPageComponentSchema('DocPage', ['hero', 'sections']);

const ROUTES: Record<string, string> = {
  '/': 'main',
  '/frontend': 'frontend',
  '/backend': 'backend',
  '/scripting': 'scripting',
  '/reference': 'reference',
  '/component-library': 'component-library',
  '/extensions': 'doc-extensions',
  '/plan': 'plan',
  '/plan/auth-mediator': 'plan-auth-mediator',
};

const registry = new Map<string, any>();
registry.set('DocPage', DocPage);

const app = document.getElementById('app')!;
const navSlot = html.take(app).div.ele() as HTMLElement;
const contentSlot = html.take(app).div.attr('id', 'doc-content').ele() as HTMLElement;

let topNav: DocTopNav | null = null;

function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

async function renderRoute(pathname: string) {
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
  topNav = new DocTopNav('doc-top-nav', { active: normalizePath(window.location.pathname), onNavigate: navigate }, nav.nav || {});
  topNav.mount(navSlot);
  await renderRoute(window.location.pathname);
}

void bootstrap();

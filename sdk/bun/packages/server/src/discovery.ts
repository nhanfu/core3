import { join, relative, sep } from 'node:path';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { validatePageDefinition } from './yaml/schema.ts';
import { validateWorkflowDefinition, type WorkflowDefinition } from './yaml/workflow-schema.ts';
import { discoverModuleRoots } from './module.ts';
import { loadYamlServiceManifest } from './yaml-service.ts';

export type DiscoveredPage = {
  id: string;
  file: string;
  module: string;
  config: any;
};

export type TranslationCatalog = Record<string, Record<string, string>>;
export type ModuleMenu = { module: string; config: any };
export type PermissionDefinition = { module: string; file: string; config: any };
export type DiscoveredWorkflow = { id: string; module: string; file: string; config: WorkflowDefinition };
export type PageRoute = { path: string; page: string; module: string };

export function validateTranslationCatalogs(catalogs: Map<string, TranslationCatalog>): void {
  for (const [catalogId, catalog] of catalogs) {
    if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
      throw new Error(`Translation catalog ${catalogId} must be a language map`);
    }
    for (const [language, values] of Object.entries(catalog)) {
      if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(language)) throw new Error(`Invalid translation language "${language}" in ${catalogId}`);
      if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error(`Translation language ${language} in ${catalogId} must be a string map`);
      for (const [key, value] of Object.entries(values)) {
        if (!key.trim()) throw new Error(`Empty translation key in ${catalogId}:${language}`);
        if (typeof value !== 'string') throw new Error(`Translation ${catalogId}:${language}:${key} must be a string`);
      }
    }
  }
}

function routeItems(value: any, result: any[] = []) {
  if (!value || typeof value !== 'object') return result;
  if (typeof value.path === 'string') result.push(value);
  for (const child of Array.isArray(value) ? value : Object.values(value)) routeItems(child, result);
  return result;
}

function routeId(path: string, pages: Map<string, DiscoveredPage>) {
  if (path === '/') {
    // A module dashboard may intentionally use its module root as the public
    // entry point. Prefer conventional dashboard page IDs before falling back
    // to the module's primary list page.
    for (const candidate of ['dashboard', 'home', 'orders']) if (pages.has(candidate)) return candidate;
  }
  const singular = (part: string) => part.endsWith('ies') ? `${part.slice(0, -3)}y` : part.endsWith('s') ? part.slice(0, -1) : part;
  const parts = path.split('/').filter(Boolean).map(singular);
  const rawParts = path.split('/').filter(Boolean);
  const candidates = [rawParts.join('-'), parts.join('-'), rawParts.slice(-2).join('-'), parts.slice(-2).join('-'), rawParts.slice(-1)[0], parts.slice(-1)[0]];
  for (const candidate of candidates) if (pages.has(candidate)) return candidate;
  const matches = [...pages.keys()].map((id) => {
    const tokens = id.split('-');
    const score = tokens.filter((token) => parts.includes(singular(token))).length;
    const suffix = id.endsWith(`-${parts.slice(-2).join('-')}`) || id === parts.slice(-2).join('-') ? 2 : 0;
    return { id, score: score + suffix };
  }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return matches[0]?.id;
}

export function discoverPageRoutes(discovered: ReturnType<typeof discoverPages>): PageRoute[] {
  const routes = new Map<string, PageRoute>();
  const add = (path: unknown, page: string, module: string) => {
    if (typeof path !== 'string' || !path.startsWith('/') || !discovered.pages.has(page)) return;
    routes.set(path.replace(/\/$/, '') || '/', { path: path.replace(/\/$/, '') || '/', page, module });
  };
  for (const entry of discovered.pages.values()) {
    const declared = entry.config?.page?.route;
    if (declared) add(declared, entry.id, entry.module);
  }
  for (const menu of discovered.menus.values()) {
    for (const item of routeItems(menu.config?.menu)) {
      const page = routeId(item.path, discovered.pages);
      if (page) add(item.path, page, discovered.pages.get(page)!.module);
    }
  }
  for (const entry of discovered.pages.values()) {
    const visit = (value: any) => {
      if (!value || typeof value !== 'object') return;
      if (typeof value.navigate_to === 'string') {
        const page = routeId(value.navigate_to, discovered.pages);
        if (page) add(value.navigate_to, page, discovered.pages.get(page)!.module);
      }
      for (const child of Array.isArray(value) ? value : Object.values(value)) visit(child);
    };
    visit(entry.config);
  }
  for (const entry of discovered.pages.values()) {
    if (![...routes.values()].some((route) => route.page === entry.id)) {
      add(`/${entry.id.replace(/-/g, '/')}`, entry.id, entry.module);
    }
  }
  return [...routes.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

function parseYaml(file: string): any {
  return Bun.YAML.parse(readFileSync(file, 'utf8'));
}

function scopedCatalog(catalog: TranslationCatalog, pageId: string): TranslationCatalog {
  // Menu strings are global to the shell, just like the historical common
  // catalog. Page catalogs remain scoped to their page.
  if (pageId === 'common' || pageId === 'menu') return catalog;
  return Object.fromEntries(Object.entries(catalog).map(([lang, values]) => [
    lang,
    Object.fromEntries(Object.entries(values).map(([key, value]) => [
      key.includes('::') ? key : `${pageId}::${key}`,
      value,
    ])),
  ]));
}

function assertUnique(map: Map<string, unknown>, key: string, file: string, kind: string) {
  if (map.has(key)) throw new Error(`Duplicate ${kind} "${key}" in ${file}`);
  map.set(key, file);
}

export function discoverPages(appsRoot: string) {
  const pageRoots = new Set<string>();
  const topPages = join(appsRoot, 'pages');
  try { if (statSync(topPages).isDirectory()) pageRoots.add(topPages); } catch { /* top-level pages are optional */ }
  for (const moduleRoot of discoverModuleRoots(appsRoot)) {
    const pages = join(moduleRoot, 'pages');
    try { if (statSync(pages).isDirectory()) pageRoots.add(pages); } catch { /* module may not define pages */ }
  }

  const pages = new Map<string, DiscoveredPage>();
  const datasources = new Map<string, any>();
  const catalogs = new Map<string, TranslationCatalog>();
  const menus = new Map<string, ModuleMenu>();
  const permissions = new Map<string, PermissionDefinition>();
  const workflows = new Map<string, DiscoveredWorkflow>();

  for (const moduleRoot of discoverModuleRoots(appsRoot)) {
    const moduleName = relative(appsRoot, moduleRoot).split(sep).pop() || 'root';
    let file = join(moduleRoot, 'permission.yaml');
    try {
      const manifest = loadYamlServiceManifest(moduleRoot).manifest;
      if (manifest.permissions) file = join(moduleRoot, manifest.permissions);
    } catch { /* default permission path is optional */ }
    try {
      if (statSync(file).isFile()) permissions.set(moduleName, {
        module: moduleName,
        file,
        config: parseYaml(file) || {},
      });
    } catch { /* unreadable permission files are ignored during discovery */ }
  }

  for (const pagesRoot of pageRoots) {
    const moduleName = relative(appsRoot, pagesRoot).split(sep).slice(-2, -1)[0] || 'root';
    for (const file of walk(pagesRoot).filter((name) => /\.ya?ml$/i.test(name)).sort()) {
      const value = parseYaml(file);
      const relativeFile = relative(pagesRoot, file).split(sep);
      if (relativeFile[0] !== 'i18n' && /-workflow\.ya?ml$/i.test(file)) {
        const config = validateWorkflowDefinition(value);
        assertUnique(workflows, config.id, file, 'workflow id');
        workflows.set(config.id, { id: config.id, module: moduleName, file, config });
        continue;
      }
      if (relativeFile.length === 1 && /^menu\.ya?ml$/i.test(relativeFile[0])) {
        menus.set(moduleName, { module: moduleName, config: parseYaml(file) || {} });
        continue;
      }
      if (relativeFile[0] === 'i18n') {
        const catalogId = relativeFile[1]?.replace(/\.ya?ml$/i, '');
        if (catalogId) catalogs.set(`${moduleName}:${catalogId}`, scopedCatalog(value || {}, catalogId));
        continue;
      }
      if (file.endsWith('i18n.yaml') || file.endsWith('i18n.yml')) {
        catalogs.set(moduleName, value || {});
        continue;
      }
      validatePageDefinition(value);
      const id = String(value.page?.id || '');
      assertUnique(pages, id, file, 'page id');
      pages.set(id, { id, file, module: moduleName, config: value });
      for (const source of value.datasources || []) {
        assertUnique(datasources, source.id, file, 'datasource id');
        datasources.set(source.id, source);
      }
    }
  }
  validateTranslationCatalogs(catalogs);
  return { pages, datasources, catalogs, menus, permissions, workflows };
}

export function translationMap(catalogs: Map<string, TranslationCatalog>, lang: string, page = '*') {
  const result: Record<string, string> = {};
  for (const catalog of catalogs.values()) {
    const language = catalog[lang] || catalog.en || {};
    for (const [key, value] of Object.entries(language)) {
      // The global catalog is for the app shell only. Page-scoped catalogs can
      // be large, so they must be requested through their page endpoint.
      const include = page === '*'
        ? !key.includes('::')
        : !key.includes('::') || key.startsWith(`${page}::`);
      if (include) result[key.replace(`${page}::`, '')] = value;
    }
  }
  return result;
}

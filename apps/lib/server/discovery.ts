import { join, relative, sep } from 'node:path';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { validatePageDefinition } from '../yaml/schema.ts';

export type DiscoveredPage = {
  id: string;
  file: string;
  module: string;
  config: any;
};

export type TranslationCatalog = Record<string, Record<string, string>>;
export type ModuleMenu = { module: string; config: any };
export type PermissionDefinition = { module: string; file: string; config: any };

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
  try { if (statSync(topPages).isDirectory()) pageRoots.add(topPages); } catch {}
  for (const entry of readdirSync(appsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'lib' || entry.name === 'node_modules') continue;
    const pages = join(appsRoot, entry.name, 'pages');
    try { if (statSync(pages).isDirectory()) pageRoots.add(pages); } catch {}
  }

  const pages = new Map<string, DiscoveredPage>();
  const datasources = new Map<string, any>();
  const catalogs = new Map<string, TranslationCatalog>();
  const menus = new Map<string, ModuleMenu>();
  const permissions = new Map<string, PermissionDefinition>();

  for (const entry of readdirSync(appsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'lib' || entry.name === 'node_modules') continue;
    const file = join(appsRoot, entry.name, 'permission.yaml');
    try {
      if (statSync(file).isFile()) permissions.set(entry.name, {
        module: entry.name,
        file,
        config: parseYaml(file) || {},
      });
    } catch {}
  }

  for (const pagesRoot of pageRoots) {
    const moduleName = relative(appsRoot, pagesRoot).split(sep)[0] || 'root';
    for (const file of walk(pagesRoot).filter((name) => /\.ya?ml$/i.test(name)).sort()) {
      const value = parseYaml(file);
      const relativeFile = relative(pagesRoot, file).split(sep);
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
  return { pages, datasources, catalogs, menus, permissions };
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

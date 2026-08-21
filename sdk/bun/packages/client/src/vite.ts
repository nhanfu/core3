import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, resolve } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

export type ComponentRoot = string;
export type ComponentPackage = string | { name: string; subpath?: string };

export type Core3ComponentsOptions = {
  roots?: ComponentRoot[];
  packages?: ComponentPackage[];
  virtualId?: string;
};

type ComponentEntry = { name: string; file: string };
const COMPONENT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const require = createRequire(import.meta.url);

function normalizePath(path: string) {
  return path.replaceAll('\\', '/');
}

function scan(root: string, entries: ComponentEntry[]) {
  if (!existsSync(root)) return;
  for (const item of readdirSync(root, { withFileTypes: true })) {
    if (item.name.startsWith('.') || item.name === 'node_modules') continue;
    const file = join(root, item.name);
    if (item.isDirectory()) {
      scan(file, entries);
      continue;
    }
    if (!COMPONENT_EXTENSIONS.has(extname(item.name))) continue;
    const name = item.name.slice(0, -extname(item.name).length);
    if (name === 'index' || name === 'vite' || name === 'ComLoader') continue;
    entries.push({ name, file: normalizePath(file) });
  }
}

function packageRoot(packageName: ComponentPackage): string | null {
  const name = typeof packageName === 'string' ? packageName : packageName.name;
  const subpath = typeof packageName === 'string' ? undefined : packageName.subpath;
  try {
    const entry = require.resolve(name);
    const root = dirname(entry);
    return resolve(root, subpath || '.');
  } catch {
    return null;
  }
}

function componentEntries(config: ResolvedConfig, options: Core3ComponentsOptions) {
  const roots = (options.roots || []).map(root => isAbsolute(root) ? root : resolve(config.root, root));
  const packageRoots = (options.packages || []).map(packageRoot).filter((root): root is string => Boolean(root));
  const entries: ComponentEntry[] = [];
  for (const root of [...roots, ...packageRoots]) scan(root, entries);

  const byName = new Map<string, ComponentEntry>();
  for (const entry of entries) {
    const previous = byName.get(entry.name);
    if (previous && previous.file !== entry.file) {
      throw new Error(`Duplicate Core3 component convention "${entry.name}": ${previous.file} and ${entry.file}`);
    }
    byName.set(entry.name, entry);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function manifestSource(entries: ComponentEntry[]) {
  const eager = entries.filter(entry => /(Cell|Editor|Field|Input)$/.test(entry.name));
  const imports = eager.map((entry, index) => `import * as m${index} from ${JSON.stringify(entry.file)};`).join('\n');
  const eagerValues = eager.map((entry, index) => `${JSON.stringify(entry.name)}: m${index}`).join(',\n  ');
  const loaders = entries.map((entry) => {
    const eagerIndex = eager.findIndex(candidate => candidate.name === entry.name);
    return `${JSON.stringify(entry.name)}: ${eagerIndex >= 0 ? `() => Promise.resolve(m${eagerIndex})` : `() => import(${JSON.stringify(entry.file)})`}`;
  }).join(',\n  ');
  return `${imports}\nexport const componentModules = {\n  ${eagerValues}\n};\nexport const componentLoaders = {\n  ${loaders}\n};\nexport default componentModules;\n`;
}

export function core3Components(options: Core3ComponentsOptions = {}): Plugin {
  const virtualName = options.virtualId || 'virtual:core3-component-manifest';
  const resolvedVirtualName = `\0${virtualName}`;
  let resolvedConfig: ResolvedConfig;

  return {
    name: 'core3-components',
    configResolved(config) {
      resolvedConfig = config;
    },
    resolveId(id) {
      return id === virtualName ? resolvedVirtualName : undefined;
    },
    load(id) {
      if (id !== resolvedVirtualName) return undefined;
      return manifestSource(componentEntries(resolvedConfig, {
        ...options,
        roots: [resolve(import.meta.dirname, 'components'), ...(options.roots || [])],
      }));
    },
  };
}

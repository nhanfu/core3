import { basename, join } from 'node:path';
import { readdirSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { ModuleApplicationConfig } from './application-config.ts';
import type { EventBus } from './event-store.ts';

export type ModuleServer = { upgrade(request: Request, options?: { data?: unknown }): boolean };
export type ModuleApiHandler = (request: Request, url: URL, server?: ModuleServer) => Response | null | undefined | Promise<Response | null | undefined>;

export type ModuleContext = {
  appsRoot: string;
  moduleRoot: string;
  env: NodeJS.ProcessEnv;
  config: ModuleApplicationConfig;
  serviceConfigs: Record<string, ModuleApplicationConfig>;
  eventBus: EventBus;
  registerApi(handler: ModuleApiHandler): void;
  registerService<T>(name: string, service: T): void;
  resolveService<T>(name: string): T;
};

export type ModuleHostContext = Omit<ModuleContext, 'moduleRoot' | 'config' | 'registerApi' | 'registerService' | 'resolveService'> & {
  moduleConfigs: Record<string, ModuleApplicationConfig>;
  serviceConfigs: Record<string, ModuleApplicationConfig>;
};

export interface ModuleLifecycle {
  readonly id: string;
  install(context: ModuleContext): Promise<void> | void;
  load(context: ModuleContext): Promise<void> | void;
  unload(context: ModuleContext): Promise<void> | void;
  uninstall(context: ModuleContext): Promise<void> | void;
}

export function discoverModuleRoots(appsRoot: string): string[] {
  const roots: string[] = [];
  const candidates = readdirSync(appsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'lib' && entry.name !== 'node_modules' && entry.name !== 'services')
    .map((entry) => join(appsRoot, entry.name));
  const servicesRoot = join(appsRoot, 'services');
  try {
    if (statSync(servicesRoot).isDirectory()) {
      candidates.push(...readdirSync(servicesRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(servicesRoot, entry.name)));
    }
  } catch {}
  for (const root of candidates) {
    try { if (statSync(join(root, 'module.ts')).isFile()) roots.push(root); } catch {}
  }
  return roots.sort();
}

function moduleRoot(appsRoot: string, moduleId: string): string {
  const root = discoverModuleRoots(appsRoot).find((candidate) => basename(candidate) === moduleId);
  if (!root) throw new Error(`Module root is not discoverable: ${moduleId}`);
  return root;
}

export async function discoverModules(appsRoot: string): Promise<ModuleLifecycle[]> {
  const modules: ModuleLifecycle[] = [];
  for (const root of discoverModuleRoots(appsRoot)) {
    const loaded = await import(pathToFileURL(join(root, 'module.ts')).href);
    const candidate = loaded.default ?? loaded.createModule;
    const instance = typeof candidate === 'function' ? new candidate() : candidate;
    if (!instance || typeof instance.load !== 'function' || typeof instance.install !== 'function'
      || typeof instance.unload !== 'function' || typeof instance.uninstall !== 'function') {
      throw new Error(`Module ${root} must export a lifecycle class as default`);
    }
    if (modules.some((module) => module.id === instance.id)) throw new Error(`Duplicate module id: ${instance.id}`);
    modules.push(instance);
  }
  return modules;
}

export class ModuleManager {
  readonly modules: ModuleLifecycle[];
  readonly apiHandlers: ModuleApiHandler[] = [];
  readonly services = new Map<string, unknown>();

  get metadata() {
    return this.modules.map((module) => ({ id: module.id }));
  }

  constructor(modules: ModuleLifecycle[]) {
    this.modules = modules;
  }

  async loadAll(context: ModuleHostContext): Promise<void> {
    const moduleContext = {
      ...context,
      registerApi: (handler: ModuleApiHandler) => this.apiHandlers.push(handler),
      registerService: <T>(name: string, service: T) => {
        if (this.services.has(name)) throw new Error(`Duplicate module service: ${name}`);
        this.services.set(name, service);
      },
      resolveService: <T>(name: string) => {
        const service = this.services.get(name);
        if (!service) throw new Error(`Module service is not registered: ${name}`);
        return service as T;
      },
    };
    for (const module of this.modules) await module.load({ ...moduleContext, config: context.moduleConfigs[module.id] || {}, moduleRoot: moduleRoot(context.appsRoot, module.id) });
  }

  async installAll(context: ModuleHostContext): Promise<void> {
    for (const module of this.modules) await module.install({ ...context, config: context.moduleConfigs[module.id] || {}, moduleRoot: moduleRoot(context.appsRoot, module.id), registerApi: () => {}, registerService: () => {}, resolveService: <T>(name: string) => { throw new Error(`Module service is unavailable during install: ${name}`); } });
  }

  async unloadAll(context: ModuleHostContext): Promise<void> {
    for (const module of [...this.modules].reverse()) await module.unload({ ...context, config: context.moduleConfigs[module.id] || {}, moduleRoot: moduleRoot(context.appsRoot, module.id), registerApi: () => {}, registerService: () => {}, resolveService: <T>(name: string) => this.services.get(name) as T });
    this.apiHandlers.length = 0;
    this.services.clear();
  }

  async uninstallAll(context: ModuleHostContext): Promise<void> {
    for (const module of [...this.modules].reverse()) await module.uninstall({ ...context, config: context.moduleConfigs[module.id] || {}, moduleRoot: moduleRoot(context.appsRoot, module.id), registerApi: () => {}, registerService: () => {}, resolveService: <T>(name: string) => { throw new Error(`Module service is unavailable during uninstall: ${name}`); } });
  }

  async handle(request: Request, url: URL, server?: ModuleServer): Promise<Response | null | undefined> {
    for (const handler of this.apiHandlers) {
      const response = await handler(request, url, server);
      if (response === undefined) return undefined;
      if (response) return response;
    }
    return null;
  }
}

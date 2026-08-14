import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { validateServiceManifest, type YamlServiceManifest } from './yaml/service-schema.ts';
import type { ModuleContext, ModuleLifecycle } from './module.ts';
import { discoverPages } from './discovery.ts';
import { DuckDbDatabase } from './database/duckdb-database.ts';
import { PostgresDatabase } from './database/postgres-database.ts';
import { YamlRepository } from './database/yaml-repository.ts';
import { migrateDatabase } from '@core3/server/migrations';
import { createYamlApi } from './routes/yaml-api.ts';
import { TopicMediator } from './topics/mediator.ts';
import { topicDefinition } from './topics/contracts.ts';
import type { ModuleApiHandler } from './module.ts';

export type YamlRuntimeContext = {
  id: string;
  api: ModuleApiHandler;
  pages: Map<string, any>;
  datasources: Map<string, any>;
  menus: Map<string, any>;
  actions: Map<string, any>;
  storage: any;
};

export type DiscoveredYamlService = {
  root: string;
  manifestFile: string;
  manifest: YamlServiceManifest;
};

export type YamlServiceDefinition = DiscoveredYamlService & {
  pages: Array<{ file: string; config: unknown }>;
  permissions: unknown;
  topics: unknown;
  events: unknown;
  storage: unknown;
  migrations: unknown;
};

export function loadYamlServiceManifest(root: string): DiscoveredYamlService {
  const manifestFile = join(root, 'manifest.yaml');
  const manifest = validateServiceManifest(Bun.YAML.parse(readFileSync(manifestFile, 'utf8')), manifestFile);
  return { root, manifestFile, manifest };
}

function readOptionalYaml(root: string, file: string | undefined): unknown {
  if (!file) return undefined;
  return Bun.YAML.parse(readFileSync(join(root, file), 'utf8'));
}

export function loadYamlServiceDefinition(service: DiscoveredYamlService): YamlServiceDefinition {
  const { root, manifestFile, manifest } = service;
  return {
    ...service,
    pages: (manifest.pages || []).map((file) => ({ file: join(root, file), config: Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) })),
    permissions: readOptionalYaml(root, manifest.permissions),
    topics: readOptionalYaml(root, manifest.topics),
    events: readOptionalYaml(root, manifest.events),
    storage: readOptionalYaml(root, manifest.storage),
    migrations: manifest.migrations,
  };
}

function resolveServiceDatabase(
  database: YamlServiceManifest['database'],
  serviceConfigs: Record<string, any>,
): any {
  if (typeof database === 'string') {
    const configured = serviceConfigs[database];
    return configured?.database || configured;
  }
  return database;
}

function resolveDatabasePath(
  serviceId: string,
  database: any,
  env: Record<string, string | undefined>,
  moduleRoot: string,
): string {
  const storage = database?.storage || database || {};
  const configuredPath = storage.path
    || (storage.path_env ? env[String(storage.path_env)] : undefined)
    || env[`${serviceId.toUpperCase()}_DB_PATH`];
  return String(configuredPath || join(moduleRoot, '..', '..', 'coredb', `${serviceId}.duckdb`));
}

function resolveDatabaseUrl(database: any, env: Record<string, string | undefined>): string | undefined {
  const storage = database?.storage || database || {};
  const envName = storage.url_env;
  return String(storage.url || (envName ? env[String(envName)] : '') || '') || undefined;
}

async function provisionColumnstore(database: any, storage: any): Promise<void> {
  const mirrors = Array.isArray(storage?.columnstore?.mirrors) ? storage.columnstore.mirrors : [];
  if (!mirrors.length) return;
  const connection = database.connect();
  try {
    const extension = await connection.all("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_mooncake') AS installed");
    if (!extension[0]?.installed) throw new Error('pg_mooncake is required for configured columnstore mirrors');
    for (const mirror of mirrors) {
      const source = String(mirror?.source || '');
      const name = String(mirror?.name || '');
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(source) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        throw new Error(`Invalid pg_mooncake mirror declaration: ${name || source}`);
      }
      const existing = await connection.all('SELECT to_regclass(?) AS relation', [name]);
      if (existing[0]?.relation) continue;
      await connection.run('CALL mooncake.create_table(?, ?)', [name, source]);
    }
  } finally {
    await new Promise<void>((resolve) => connection.close(resolve));
  }
}

/**
 * Transitional generic module seam. Runtime execution is deliberately added
 * behind this interface; YAML services must not grow a service-specific
 * module.ts just to participate in discovery and lifecycle management.
 */
export class YamlServiceModule implements ModuleLifecycle {
  readonly id: string;
  readonly manifest: YamlServiceManifest;
  readonly definition: YamlServiceDefinition;
  private db: any = null;
  private repository: YamlRepository | null = null;
  private topics: TopicMediator | null = null;
  private runtime: YamlRuntimeContext | null = null;

  constructor(private readonly service: DiscoveredYamlService) {
    this.id = service.manifest.id;
    this.manifest = service.manifest;
    this.definition = loadYamlServiceDefinition(service);
  }

  install(_context: ModuleContext): void {}

  async load(context: ModuleContext): Promise<void> {
    context.registerService(`yaml.service.${this.id}`, this.definition);
    const databaseConfig = resolveServiceDatabase(this.manifest.database, context.serviceConfigs,);
    const migrationsRoot = this.manifest.migrations ? join(context.moduleRoot, this.manifest.migrations) : undefined;
    const configuredDriver = String(databaseConfig?.storage?.driver || databaseConfig?.driver || 'duckdb');
    const storageDriver = configuredDriver === 'duckdb-memory' ? 'duckdb' : configuredDriver;
    if (storageDriver === 'postgres') {
      const url = resolveDatabaseUrl(databaseConfig, context.env);
      if (!url) throw new Error(`Postgres storage requires ${databaseConfig?.storage?.url_env || databaseConfig?.url_env || 'database.storage.url'}`);
      this.db = PostgresDatabase.open(url);
    } else if (storageDriver === 'duckdb') {
      const path = resolveDatabasePath(this.id, databaseConfig, context.env, context.moduleRoot);
      this.db = await DuckDbDatabase.open(String(path));
    } else {
      throw new Error(`Durable storage driver is not implemented yet: ${storageDriver}`);
    }
    this.repository = new YamlRepository(this.db);
    if (this.manifest.migrations) {
      await migrateDatabase(this.repository, migrationsRoot!, undefined, `${this.id}_schema_migrations`);
    }
    if (storageDriver === 'postgres' && context.env.CORE3_MOONCAKE_ENABLED === 'true') {
      await provisionColumnstore(this.db, this.definition.storage);
    }
    this.topics = new TopicMediator(context.eventBus, `${this.id}-${process.pid}`);

    const discovered = discoverPages(context.appsRoot);
    const pageMaps = {
      pages: new Map([...discovered.pages].filter(([, page]) => page.module === this.id).map(([id, page]) => [id, page.config])),
      datasources: new Map([...discovered.datasources].filter(([, source]) => {
        return [...discovered.pages.values()].some((page) => page.module === this.id && (page.config.datasources || []).some((candidate: any) => candidate.id === source.id));
      })),
      catalogs: new Map([...discovered.catalogs].filter(([key]) => key.startsWith(`${this.id}:`))),
      menus: new Map([...discovered.menus].filter(([key]) => key === this.id)),
      workflows: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === this.id).map(([id, workflow]) => [id, workflow.config])),
      workflowFiles: new Map([...discovered.workflows].filter(([, workflow]) => workflow.module === this.id).map(([id, workflow]) => [id, workflow.file])),
    };
    const actions = [...pageMaps.pages.values()].flatMap((page: any) => page.actions || []);
    const namedActions = new Map(actions.filter((action: any) => typeof action.action === 'string').map((action: any) => [action.action, action]));
    const topicDeclarations = Array.isArray((this.definition.topics as any)?.topics) ? (this.definition.topics as any).topics : [];
    for (const declaration of topicDeclarations) {
      const action = actions.find((candidate: any) => candidate.topic === declaration.id);
      if (!action?.mutation) continue;
      this.topics.register({
        definition: topicDefinition(String(declaration.id), Number(declaration.version || 1)),
        handle: (payload: any) => this.repository!.executeMutation(action.mutation, {
          ...(payload?.values && typeof payload.values === 'object' ? payload.values : payload),
          current_user_id: payload?.actor?.id || payload?.current_user_id || null,
          current_user_name: payload?.actor?.name || payload?.current_user_name || '',
          view_scope: 'all',
        }),
      });
    }
    this.topics.start();
    const authProvider: any = context.resolveService('auth.adapter');
    const api = createYamlApi({
      repository: this.repository,
      authProvider,
      sources: pageMaps.datasources,
      pages: pageMaps.pages,
      catalogs: pageMaps.catalogs,
      menus: pageMaps.menus,
      workflows: pageMaps.workflows,
      workflowFiles: pageMaps.workflowFiles,
      permissions: discovered.permissions.get(this.id)?.config || {},
      uploadRoot: context.env[`${this.id.toUpperCase()}_UPLOAD_ROOT`] || join(context.moduleRoot, '.data', 'uploads'),
      eventStore: context.eventBus,
      topics: this.topics,
      storage: this.definition.storage,
    });
    this.runtime = {
      id: this.id,
      api,
      pages: pageMaps.pages,
      datasources: pageMaps.datasources,
      menus: pageMaps.menus,
      actions: namedActions,
      storage: this.definition.storage,
    };
  }

  getRuntimeContext(): YamlRuntimeContext | null {
    return this.runtime;
  }

  async unload(_context: ModuleContext): Promise<void> {
    this.topics?.stop();
    this.topics = null;
    this.repository = null;
    this.runtime = null;
    if (this.db) await new Promise<void>((resolve) => this.db.close(() => resolve()));
    this.db = null;
  }

  uninstall(_context: ModuleContext): void {}
}

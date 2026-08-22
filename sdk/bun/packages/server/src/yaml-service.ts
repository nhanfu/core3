import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { interpolateEnvironment } from './application-config.ts';
import { validateServiceManifest, type YamlServiceManifest } from './yaml/service-schema.ts';
import type { ModuleContext, ModuleLifecycle } from './module.ts';
import { discoverPages } from './discovery.ts';
import { DuckDbDatabase } from './database/duckdb-database.ts';
import { HybridDuckDbDatabase } from './database/hybrid-duckdb-database.ts';
import { PostgresDatabase } from './database/postgres-database.ts';
import { openSqlDatabase } from './database/sql-database.ts';
import { YamlRepository } from './database/yaml-repository.ts';
import { resolveDuckDbEncryption } from './database/duckdb-encryption.ts';
import { bindNamedParams } from './database/sql.ts';
import { cleanDatabase, migrateDatabase } from '@core3/server/migrations';
import type { MigrationKind } from '@core3/server/migrations';
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
  catalogs?: Map<string, any>;
  actions: Map<string, any>;
  storage: any;
  reloadPages?: () => number;
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
  operations: unknown;
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
  return interpolateEnvironment(Bun.YAML.parse(readFileSync(join(root, file), 'utf8')), process.env);
}

export function loadYamlServiceDefinition(service: DiscoveredYamlService): YamlServiceDefinition {
  const { root, manifest } = service;
  return {
    ...service,
    pages: (manifest.pages || []).map((file) => ({ file: join(root, file), config: Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) })),
    permissions: readOptionalYaml(root, manifest.permissions),
    topics: readOptionalYaml(root, manifest.topics),
    events: readOptionalYaml(root, manifest.events),
    operations: readOptionalYaml(root, manifest.operations),
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
  const credentials = storage.credentials || {};
  const configuredPath = storage.path
    || credentials.path
    || (storage.path_env ? env[String(storage.path_env)] : undefined)
    || (credentials.path_env ? env[String(credentials.path_env)] : undefined)
    || env[`CORE3_${serviceId.toUpperCase()}_DB_PATH`]
    || env[`${serviceId.toUpperCase()}_DB_PATH`];
  return String(configuredPath || join(moduleRoot, '..', '..', 'coredb', `${serviceId}.duckdb`));
}

function resolveDatabaseUrl(database: any, env: Record<string, string | undefined>): string | undefined {
  const storage = database?.storage || database || {};
  const credentials = storage.credentials || {};
  const envName = storage.url_env || credentials.url_env;
  return String(storage.url || credentials.url || (envName ? env[String(envName)] : '') || '') || undefined;
}

async function ensureColumnstoreExtension(database: any, storage: any): Promise<string[]> {
  const tables = Array.isArray(storage?.columnstore?.tables) ? storage.columnstore.tables.map(String) : [];
  if (!tables.length) return [];
  const connection = database.connect();
  try {
    const extension = await connection.all("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_mooncake') AS installed");
    if (!extension[0]?.installed) throw new Error('pg_mooncake is required for configured columnstore tables');
    return tables;
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

  install(context: ModuleContext): void { void context; }

  async load(context: ModuleContext): Promise<void> {
    const declaredStorage = this.definition.storage as any;
    const databaseConfig = declaredStorage?.database || resolveServiceDatabase(this.manifest.database, context.serviceConfigs,);
    const migrationsRoot = this.manifest.migrations ? join(context.moduleRoot, this.manifest.migrations) : undefined;
    const configuredDriver = String(
      context.env[`CORE3_${this.id.toUpperCase().replace(/-/g, '_')}_DB_DRIVER`]
        || databaseConfig?.storage?.driver
        || databaseConfig?.driver
        || 'duckdb',
    );
    const storageDriver = configuredDriver === 'duckdb-memory' ? 'duckdb' : configuredDriver;
    if (storageDriver === 'postgres') {
      const url = resolveDatabaseUrl(databaseConfig, context.env);
      if (!url) throw new Error(`Postgres storage requires ${databaseConfig?.storage?.url_env || databaseConfig?.url_env || 'database.storage.url'}`);
      this.db = PostgresDatabase.open(url);
    } else if (storageDriver === 'duckdb') {
      const path = resolveDatabasePath(this.id, databaseConfig, context.env, context.moduleRoot);
      const encryption = resolveDuckDbEncryption(declaredStorage?.database || databaseConfig, context.env, this.id);
      if (encryption && configuredDriver === 'duckdb-memory') throw new Error(`DuckDB encryption requires durable storage for service ${this.id}`);
      this.db = configuredDriver === 'duckdb-memory'
        ? await DuckDbDatabase.open(':memory:')
        : await HybridDuckDbDatabase.open(String(path), encryption);
    } else if (storageDriver === 'mysql' || storageDriver === 'oracle' || storageDriver === 'sqlserver') {
      const url = resolveDatabaseUrl(databaseConfig, context.env);
      if (!url) throw new Error(`${storageDriver} storage requires ${databaseConfig?.storage?.url_env || databaseConfig?.url_env || 'database.storage.url'}`);
      this.db = await openSqlDatabase(storageDriver, url);
    } else {
      throw new Error(`Durable storage driver is not implemented yet: ${storageDriver}`);
    }
    this.repository = new YamlRepository(this.db, context.resolveService);
    const columnstoreTables = storageDriver === 'postgres' && context.env.CORE3_MOONCAKE_ENABLED === 'true'
      ? await ensureColumnstoreExtension(this.db, this.definition.storage)
      : [];
    if (this.manifest.migrations) {
      const schemaOnly = context.env.CORE3_SCHEMA_ONLY === 'true';
      const migrationKinds: MigrationKind[] = schemaOnly ? ['schema'] : ['schema', 'data'];
      if (context.env.CORE3_CLEAN_DB === 'true' || schemaOnly) {
        const migrationTable = `${this.id}_schema_migrations`.replace(/[^a-zA-Z0-9_]/g, '_');
        await cleanDatabase(this.repository, migrationsRoot!, migrationTable, ['schema', 'data']);
      }
      const migrationTable = `${this.id}_schema_migrations`.replace(/[^a-zA-Z0-9_]/g, '_');
      await migrateDatabase(this.repository, migrationsRoot!, undefined, migrationTable, migrationKinds, { columnstoreTables });
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
    const reloadPages = () => {
      const refreshed = discoverPages(context.appsRoot);
      const servicePages = [...refreshed.pages].filter(([, page]) => page.module === this.id);
      const servicePageIds = new Set(servicePages.map(([id]) => id));
      const serviceSources = [...refreshed.datasources].filter(([, source]) =>
        servicePages.some(([, page]) => (page.config.datasources || []).some((candidate: any) => candidate.id === source.id)));
      const replaceMap = (target: Map<string, any>, entries: Array<[string, any]>) => {
        target.clear();
        for (const [key, value] of entries) target.set(key, value);
      };
      replaceMap(pageMaps.pages, servicePages.map(([id, page]) => [id, page.config]));
      replaceMap(pageMaps.datasources, serviceSources);
      replaceMap(pageMaps.catalogs, [...refreshed.catalogs].filter(([key]) => key.startsWith(`${this.id}:`)));
      replaceMap(pageMaps.menus, [...refreshed.menus].filter(([key]) => key === this.id));
      replaceMap(pageMaps.workflows, [...refreshed.workflows]
        .filter(([, workflow]) => workflow.module === this.id)
        .map(([id, workflow]) => [id, workflow.config]));
      replaceMap(pageMaps.workflowFiles, [...refreshed.workflows]
        .filter(([, workflow]) => workflow.module === this.id)
        .map(([id, workflow]) => [id, workflow.file]));
      return servicePageIds.size;
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
      uploadRoot: context.env[`${this.id.toUpperCase()}_UPLOAD_ROOT`]
        || (String((declaredStorage?.files || {}).driver || 'local') === 'local' && (() => {
          const path = String(declaredStorage?.files?.path || declaredStorage?.files?.root || '');
          return path.startsWith('/') ? path : path ? join(context.moduleRoot, path) : undefined;
        })())
        || join(context.moduleRoot, '.data', 'uploads'),
      eventStore: context.eventBus,
      topics: this.topics,
      storage: this.definition.storage,
      reloadPages,
      resolveService: context.resolveService,
    });
    this.runtime = {
      id: this.id,
      api,
      pages: pageMaps.pages,
      datasources: pageMaps.datasources,
      menus: pageMaps.menus,
      catalogs: pageMaps.catalogs,
      actions: namedActions,
      storage: this.definition.storage,
    };
    // Expose declarative actions as an internal service contract. Domain
    // services can call another YAML service without importing its database
    // or growing a service-specific module implementation.
    context.registerService(`yaml.service.${this.id}`, {
      call: (operation: string, request: Record<string, unknown> = {}) => this.call(operation, request),
    });
  }

  private async call(operation: string, request: Record<string, unknown>): Promise<any> {
    if (!this.runtime || !this.repository) throw new Error(`YAML service is not ready: ${this.id}`);
    const action = this.runtime.actions.get(String(operation));
    if (action?.mutation) return this.repository.executeMutation(action.mutation, { ...request, view_scope: 'all' });
    const definition = (this.definition.operations as any)?.operations?.[String(operation)];
    if (!definition?.query) throw new Error(`YAML service operation is unavailable: ${this.id}.${operation}`);
    const bound = bindNamedParams(String(definition.query), request);
    const rows = await this.repository.query(bound.statement, bound.values);
    return { data: rows, ...(definition.result_key ? { [String(definition.result_key)]: rows } : {}) };
  }

  getRuntimeContext(): YamlRuntimeContext | null {
    return this.runtime;
  }

  async unload(context: ModuleContext): Promise<void> {
    void context;
    this.topics?.stop();
    this.topics = null;
    this.repository = null;
    this.runtime = null;
    if (this.db) await new Promise<void>((resolve) => this.db.close(() => resolve()));
    this.db = null;
  }

  uninstall(context: ModuleContext): void { void context; }
}

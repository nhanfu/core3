import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { discoverPages, translationMap } from '@core3/server/discovery';
import { requestLanguage } from '@core3/server/locale';
import { cleanDatabase, migrateDatabase } from '@core3/server/migrations';
import type { MigrationKind } from '@core3/server/migrations';
import { AuthRepository } from './auth-repository.ts';
import { AuthService } from './auth-service.ts';
import { DuckDbDatabase, HybridDuckDbDatabase, PostgresDatabase } from '@core3/server';
import { openSqlDatabase } from '@core3/server/database/sql-database';
import { AUTH_PASSWORD_CHANGE, AUTH_PERMISSION_CHECK, AUTH_USER_LOOKUP, AUTH_USER_RESOLVE } from './topics.ts';
import { TopicMediator } from '@core3/server/topics/mediator';
import { MediatorAuthAdapter } from './auth-adapter.ts';
import { interpolateEnvironment } from '@core3/server/application-config';
import { authJwtSecret } from '@core3/server/auth/jwt';
import { resolveDuckDbEncryption } from '@core3/server/database/duckdb-encryption';

export const AUTH_SERVICE_KEY = 'auth';
export const AUTH_ADAPTER_KEY = 'auth.adapter';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
}

function errorResponse(error: any): Response {
  return json({ error: error?.message || 'Authentication failed', ...(error?.code ? { code: error.code } : {}) }, error?.status || 401);
}

export default class AuthModule {
  readonly id = 'auth';
  private db: any;
  private service!: AuthService;
  private topics: TopicMediator | null = null;

  install(context: { moduleRoot: string }): void {
    mkdirSync(join(context.moduleRoot, '.data'), { recursive: true });
  }

  async load(context: any): Promise<void> {
    let declaredStorage: any = {};
    const storageFile = Bun.file(join(context.moduleRoot, 'storage.yaml'));
    if (await storageFile.exists()) declaredStorage = interpolateEnvironment(Bun.YAML.parse(await storageFile.text()) || {}, context.env);
    const database = declaredStorage.database || context.config?.database as any || {};
    const storage = database.storage || database;
    const credentials = storage.credentials || {};
    const configuredDriver = String(storage.driver || 'duckdb');
    const driver = configuredDriver === 'duckdb-memory' ? 'duckdb' : configuredDriver;
    if (driver === 'postgres') {
      const url = storage.url || credentials.url || (storage.url_env ? context.env[String(storage.url_env)] : undefined) || (credentials.url_env ? context.env[String(credentials.url_env)] : undefined);
      if (!url) throw new Error(`Auth Postgres storage requires ${storage.url_env || credentials.url_env || 'database.storage.url'}`);
      this.db = PostgresDatabase.open(String(url));
    } else if (driver === 'mysql' || driver === 'oracle' || driver === 'sqlserver') {
      const url = storage.url || credentials.url || (storage.url_env ? context.env[String(storage.url_env)] : undefined) || (credentials.url_env ? context.env[String(credentials.url_env)] : undefined);
      if (!url) throw new Error(`Auth ${driver} storage requires a database URL`);
      this.db = await openSqlDatabase(driver, String(url));
    } else {
      const memoryOnly = configuredDriver === 'duckdb-memory';
      const dbPath = storage.path || credentials.path || context.env.CORE3_AUTH_DB_PATH || context.env.AUTH_DB_PATH || join(context.moduleRoot, '..', '..', 'coredb', 'auth.duckdb');
      const encryption = resolveDuckDbEncryption(storage, context.env, this.id);
      if (encryption && memoryOnly) throw new Error('Auth DuckDB encryption requires durable storage');
      this.db = memoryOnly ? await DuckDbDatabase.open(':memory:') : await HybridDuckDbDatabase.open(String(dbPath), encryption);
    }
    const data = Bun.YAML.parse(await Bun.file(join(context.moduleRoot, 'data.yaml')).text()) as { queries?: Record<string, string> };
    const repository = new AuthRepository(this.db, data.queries || {});
    context.registerService('database', this.db);
    const migrationsRoot = join(context.moduleRoot, 'migrations');
    const schemaOnly = context.env.CORE3_SCHEMA_ONLY === 'true';
    const migrationKinds: MigrationKind[] = schemaOnly ? ['schema'] : ['schema', 'data'];
    if (context.env.CORE3_CLEAN_DB === 'true' || schemaOnly) {
      await cleanDatabase(repository, migrationsRoot, 'auth_schema_migrations');
    }
    await migrateDatabase(repository, migrationsRoot, undefined, 'auth_schema_migrations', migrationKinds);
    const jwtSecret = authJwtSecret(context.env);
    this.service = new AuthService(repository, jwtSecret);
    context.registerService(AUTH_SERVICE_KEY, this.service);
    this.topics = new TopicMediator(context.eventBus, `auth-${process.pid}`);
    this.topics.register({
      definition: AUTH_USER_RESOLVE,
      handle: ({ token }) => this.service.introspect(String(token)),
    });
    this.topics.register({
      definition: AUTH_USER_LOOKUP,
      handle: ({ email }) => this.serviceUserLookup(repository, email),
    });
    this.topics.register({
      definition: AUTH_PERMISSION_CHECK,
      handle: ({ user, permission }) => ({ allowed: this.service.hasPermission(user, permission) }),
    });
    this.topics.register({
      definition: AUTH_PASSWORD_CHANGE,
      handle: ({ userId, currentPassword, newPassword }) => this.service.changePassword(userId, currentPassword, newPassword).then(() => ({ ok: true as const })),
    });
    this.topics.start();
    context.registerService('auth.topic', this.topics);
    context.registerService(AUTH_ADAPTER_KEY, new MediatorAuthAdapter(this.topics, jwtSecret));

    let pages = discoverPages(context.appsRoot);
    const profileApi = pages.pages.get('profile')?.config?.api || {};
    const profileEndpoint = String(profileApi.endpoint || '/api/v1/profile');
    const profileFields = new Set(Array.isArray(profileApi.fields) ? profileApi.fields.map(String) : []);
    context.registerApi(async (request: Request, url: URL) => {
      if (url.pathname === '/api/auth/login' && request.method === 'POST') {
        try {
          const body = await request.json() as any;
          if (!body.email || !body.password) return json({ error: 'email and password required' }, 400);
          return json(await this.service.login({ email: String(body.email), password: String(body.password), ip: request.headers.get('x-forwarded-for') || undefined, user_agent: request.headers.get('user-agent') || undefined }));
        } catch (error) { return errorResponse(error); }
      }
      if (url.pathname === '/api/auth/me' && request.method === 'GET') {
        try { return json(await this.service.getCurrentUser(request)); } catch (error) { return errorResponse(error); }
      }
      if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
        try {
          const user = await this.service.getCurrentUser(request);
          await this.service.logout(String(user.sub));
          return json({ ok: true });
        } catch (error) { return errorResponse(error); }
      }
      if (url.pathname === '/api/auth/introspect' && request.method === 'POST') {
        const body = await request.json() as any;
        const claims = body.token ? await this.service.introspect(String(body.token)) : null;
        return claims ? json({ active: true, ...claims }) : json({ active: false }, 401);
      }
      if (url.pathname === '/api/auth/change-password' && request.method === 'POST') {
        try {
          const user = await this.service.getCurrentUser(request);
          const body = await request.json() as any;
          await this.service.changePassword(String(user.sub), String(body.current_password || ''), String(body.new_password || ''));
          return json({ ok: true });
        } catch (error) { return errorResponse(error); }
      }
      if (url.pathname === profileEndpoint && (request.method === 'GET' || request.method === 'PATCH')) {
        try {
          const user = await this.service.getCurrentUser(request);
          if (request.method === 'GET') {
            const profile = await repository.profile(String(user.sub));
            return profile ? json(profile) : json({ error: 'User not found' }, 404);
          }
          const body = await request.json() as Record<string, unknown>;
          if (body.new_password) {
            if (!body.current_password) return json({ error: 'current_password required' }, 400);
            await this.service.changePassword(String(user.sub), String(body.current_password), String(body.new_password));
          }
          const fields = Object.fromEntries([...profileFields]
            .filter((field) => body[field] !== undefined)
            .map((field) => [field, body[field]]));
          if (Object.keys(fields).length) {
            if (body.expected_row_version === undefined || body.expected_row_version === null || body.expected_row_version === '') {
              return json({ error: 'expected_row_version is required' }, 400);
            }
            await repository.updateProfile(String(user.sub), { ...fields, expected_row_version: body.expected_row_version });
          }
          return json({ ok: true });
        } catch (error) { return errorResponse(error); }
      }
      if (url.pathname === '/api/pages/login' && request.method === 'GET') {
        pages = discoverPages(context.appsRoot);
        const page = pages.pages.get('login');
        if (!page || page.module !== 'auth') return json({ error: 'Unknown page: login' }, 404);
        return json({ ...page.config, i18n: translationMap(pages.catalogs, requestLanguage(url), 'login') });
      }
      if (url.pathname === '/api/pages/profile' && request.method === 'GET') {
        pages = discoverPages(context.appsRoot);
        const page = pages.pages.get('profile');
        if (!page || page.module !== 'auth') return json({ error: 'Unknown page: profile' }, 404);
        return json({ ...page.config, i18n: translationMap(pages.catalogs, requestLanguage(url), 'profile') });
      }
      return null;
    });
  }

  private serviceUserLookup(repository: AuthRepository, email: string): Promise<any | null> {
    return repository.lookupUser(String(email));
  }

  async unload(): Promise<void> {
    this.topics?.stop();
    this.topics = null;
    if (!this.db) return;
    await new Promise<void>((resolve) => this.db.close(() => resolve()));
    this.db = null;
  }

  uninstall(): void {}
}

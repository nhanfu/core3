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
import { DirectAuthAdapter } from './auth-adapter.ts';
import { interpolateEnvironment } from '@core3/server/application-config';
import { AuthJwtKeyRing, authJwtSecret } from '@core3/server/auth/jwt';
import { resolveDuckDbEncryption } from '@core3/server/database/duckdb-encryption';
import { DispatchAuthority, DispatchSigningKeyRing } from '@core3/server';

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

function structuredError(message: string, messageKey: string, status: number, params?: Record<string, unknown>): Response {
  return json({ error: message, message_key: messageKey, ...(params ? { message_params: params } : {}) }, status);
}

function errorResponse(error: any): Response {
  return json({
    error: error?.message || 'Authentication failed',
    ...(error?.code ? { code: error.code } : {}),
    message_key: error?.message_key || (error?.code ? `errors.${String(error.code).toLowerCase()}` : `errors.http_${error?.status || 401}`),
    ...(error?.message_params ? { message_params: error.message_params } : {}),
  }, error?.status || 401);
}

export default class AuthModule {
  readonly id = 'auth';
  private db: any;
  private service!: AuthService;
  private authority!: DispatchAuthority;
  private clientKeyRing!: AuthJwtKeyRing;

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
    const permissionCatalog = [...discoverPages(context.appsRoot).permissions.values()]
      .flatMap((entry: any) => Array.isArray(entry.config?.permissions) ? entry.config.permissions.map(String) : []);
    mkdirSync(join(context.moduleRoot, '.data'), { recursive: true });
    this.clientKeyRing = await AuthJwtKeyRing.load(join(context.moduleRoot, '.data', 'client-key.json'));
    this.service = new AuthService(repository, jwtSecret, permissionCatalog, join(context.moduleRoot, '.data', 'refresh-tokens.json'), this.clientKeyRing);
    this.authority = new DispatchAuthority(Date.now, DispatchSigningKeyRing.load(join(context.moduleRoot, '.data', 'dispatch-key-ring.json')), (request) => this.servicePermissions(String(request.subject || request.userId || '')), join(context.moduleRoot, '.data', 'auth-authority.json'));
    this.service.setSessionActivityChecker((sessionId, userId) => this.authority.sessionStatus(sessionId, userId));
    this.service.setAuthorizationChangeHandler((userId) => { this.authority.bumpAuthorization(userId); });
    const declaredPolicies = Bun.YAML.parse(await Bun.file(join(context.moduleRoot, 'policies.yaml')).text()) as any;
    for (const policy of Array.isArray(declaredPolicies?.policies) ? declaredPolicies.policies : []) {
      if (policy?.source_service && policy?.target_service && policy?.command_class) this.authority.allow(String(policy.source_service), String(policy.target_service), String(policy.command_class), policy.required_permission ? String(policy.required_permission) : undefined);
    }
    for (const policy of String(context.env.CORE3_DISPATCH_POLICIES || '').split(',').map((item) => item.trim()).filter(Boolean)) {
      const [source, target, command] = policy.split(':');
      if (source && target && command) this.authority.allow(source, target, command);
    }
    context.registerService(AUTH_SERVICE_KEY, this.service);
    context.registerService('auth.authority', this.authority);
    context.registerService(AUTH_ADAPTER_KEY, new DirectAuthAdapter(this.service));

    let pages = discoverPages(context.appsRoot);
    const profileApi = pages.pages.get('profile')?.config?.api || {};
    const profileEndpoint = String(profileApi.endpoint || '/api/v1/profile');
    const profileFields = new Set(Array.isArray(profileApi.fields) ? profileApi.fields.map(String) : []);
    context.registerApi(async (request: Request, url: URL) => {
      if (url.pathname === '/api/auth/login' && request.method === 'POST') {
        try {
          const body = await request.json() as any;
          if (!body.email || !body.password) return structuredError('email and password required', 'auth.credentials_required', 400);
          const result = await this.service.login({ email: String(body.email), password: String(body.password), client_id: body.client_id ? String(body.client_id) : undefined, ip: request.headers.get('x-forwarded-for') || undefined, user_agent: request.headers.get('user-agent') || undefined });
          const claims = await this.service.introspect(result.token);
          if (claims?.sid && claims.jti && claims.did) this.authority.registerSession({ userId: String(claims.sub), deviceId: String(claims.did), sessionId: String(claims.sid), userSecurityRevision: Number(claims.user_security_revision || 0), sessionRevision: Number(claims.session_revision || 0), authzVersion: this.authority.authorizationVersion(String(claims.sub)), expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
          return json(result);
        } catch (error) { return errorResponse(error); }
      }
      if (url.pathname === '/api/auth/me' && request.method === 'GET') {
          try { const user = await this.service.getCurrentUser(request); return json({ ...user, authz_version: this.authority.authorizationVersion(String(user.sub)) }); } catch (error) { return errorResponse(error); }
      }
      if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
        try {
          const user = await this.service.getCurrentUser(request);
          await this.service.logout(String(user.sub));
          if (user.sid) this.authority.revokeSession(String(user.sid));
          return json({ ok: true });
        } catch (error) { return errorResponse(error); }
      }
      if (url.pathname === '/api/auth/logout-all' && request.method === 'POST') {
        try { const user = await this.service.getCurrentUser(request); this.authority.revokeUser(String(user.sub)); return json({ ok: true }); } catch (error) { return errorResponse(error); }
      }
      if (url.pathname === '/api/auth/introspect' && request.method === 'POST') {
        const body = await request.json() as any;
        const claims = body.token ? await this.service.introspect(String(body.token)) : null;
        return claims ? json({ active: true, ...claims }) : json({ active: false }, 401);
      }
      if (url.pathname === '/api/auth/refresh' && request.method === 'POST') {
        try { const body = await request.json() as any; if (!body.refresh_token) return structuredError('refresh_token is required', 'auth.refresh_required', 400); const result = await this.service.refresh(String(body.refresh_token)); const claims = await this.service.introspect(result.token); if (claims?.sid && claims.did) this.authority.registerSession({ userId: String(claims.sub), deviceId: String(claims.did), sessionId: String(claims.sid), userSecurityRevision: Number(claims.user_security_revision || 0), sessionRevision: Number(claims.session_revision || 0), authzVersion: this.authority.authorizationVersion(String(claims.sub)), expiresAt: Date.now() + 8 * 60 * 60 * 1000 }); return json(result); } catch (error) { return errorResponse(error); }
      }
      if ((url.pathname === '/api/auth/.well-known/jwks.json' || url.pathname === '/api/auth/jwks') && request.method === 'GET') return json({ keys: [...(await this.authority.jwks()).keys, ...(await this.clientKeyRing.jwks())] });
      if (url.pathname === '/api/auth/dispatch' && request.method === 'POST') {
        try {
          const workloadToken = String(context.env.CORE3_AUTH_WORKLOAD_TOKEN || '');
          const suppliedToken = String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
          if ((workloadToken && suppliedToken !== workloadToken) || (!workloadToken && context.env.CORE3_ENV === 'production')) throw { status: 401, code: 'WORKLOAD_UNAUTHORIZED', message: 'Auth workload credential required' };
          const body = await request.json() as any;
          const token = await this.authority.issue({ subject: body.subject, userId: body.user_id, deviceId: body.device_id, sessionId: body.session_id, parentJti: body.parent_jti, sourceService: String(body.source_service || 'gateway'), targetService: String(body.target_service || ''), commandClass: String(body.command_class || ''), requiredPermission: body.required_permission ? String(body.required_permission) : undefined, permissions: [], correlationId: body.correlation_id, causationId: body.causation_id });
          return json({ token, token_type: 'internal_dispatch', expires_in: 60 });
        } catch (error) { return errorResponse(error); }
      }
      if (url.pathname === '/api/auth/change-password' && request.method === 'POST') {
        try {
          const user = await this.service.getCurrentUser(request);
          const body = await request.json() as any;
          await this.service.changePassword(String(user.sub), String(body.current_password || ''), String(body.new_password || ''));
          return json({ ok: true });
        } catch (error) { return errorResponse(error); }
      }
      if (url.pathname === '/api/v1/companies' && request.method === 'GET') {
        try {
          const user = await this.service.getCurrentUser(request);
          return json({ companies: await repository.companiesForUser(String(user.sub)), current_company_id: (user as any).company_id || null });
        } catch (error) { return errorResponse(error); }
      }
      if (url.pathname === '/api/v1/company' && request.method === 'GET') {
        try {
          const user = await this.service.getCurrentUser(request);
          const profile = await repository.profile(String(user.sub));
          return json(profile?.current_company_id ? await repository.companyForUser(String(user.sub), String(profile.current_company_id)) : null);
        } catch (error) { return errorResponse(error); }
      }
      if (url.pathname === '/api/v1/company/switch' && request.method === 'POST') {
        try {
          const user = await this.service.getCurrentUser(request);
          const body = await request.json() as any;
          const companyId = String(body.company_id || '');
          if (!companyId) return structuredError('company_id is required', 'base.company_required', 400);
          const company = await repository.setCurrentCompany(String(user.sub), companyId);
          if (!company) return structuredError('You do not have access to this company', 'base.company_forbidden', 403);
          return json({ ok: true, company });
        } catch (error) { return errorResponse(error); }
      }
      if (url.pathname === profileEndpoint && (request.method === 'GET' || request.method === 'PATCH')) {
        try {
          const user = await this.service.getCurrentUser(request);
          if (request.method === 'GET') {
            const profile = await repository.profile(String(user.sub));
            return profile ? json(profile) : structuredError('User not found', 'auth.user_not_found', 404);
          }
          const body = await request.json() as Record<string, unknown>;
          if (body.new_password) {
            if (!body.current_password) return structuredError('current_password required', 'auth.current_password_required', 400);
            await this.service.changePassword(String(user.sub), String(body.current_password), String(body.new_password));
          }
          const fields = Object.fromEntries([...profileFields]
            .filter((field) => body[field] !== undefined)
            .map((field) => [field, body[field]]));
          if (Object.keys(fields).length) {
            if (body.expected_row_version === undefined || body.expected_row_version === null || body.expected_row_version === '') {
              return structuredError('expected_row_version is required', 'errors.row_version_required', 400);
            }
            await repository.updateProfile(String(user.sub), { ...fields, expected_row_version: body.expected_row_version });
          }
          return json({ ok: true });
        } catch (error) { return errorResponse(error); }
      }
      if (url.pathname === '/api/pages/login' && request.method === 'GET') {
        pages = discoverPages(context.appsRoot);
        const page = pages.pages.get('login');
        if (!page || page.module !== 'auth') return structuredError('Unknown page: login', 'errors.page_not_found', 404, { page: 'login' });
        const lang = requestLanguage(url);
        return json({ ...page.config, i18n: { lang, page: translationMap(pages.catalogs, lang, 'login'), global: translationMap(pages.catalogs, lang, '*') } });
      }
      if (url.pathname === '/api/pages/profile' && request.method === 'GET') {
        pages = discoverPages(context.appsRoot);
        const page = pages.pages.get('profile');
        if (!page || page.module !== 'auth') return structuredError('Unknown page: profile', 'errors.page_not_found', 404, { page: 'profile' });
        const lang = requestLanguage(url);
        return json({ ...page.config, i18n: { lang, page: translationMap(pages.catalogs, lang, 'profile'), global: translationMap(pages.catalogs, lang, '*') } });
      }
      return null;
    });
  }

  private servicePermissions(userId: string): Promise<string[]> { return this.service.permissionsFor(userId); }

  private serviceUserLookup(repository: AuthRepository, email: string): Promise<any | null> {
    return repository.lookupUser(String(email));
  }

  async unload(): Promise<void> {
    if (!this.db) return;
    await new Promise<void>((resolve) => this.db.close(() => resolve()));
    this.db = null;
  }

  uninstall(): void {}
}

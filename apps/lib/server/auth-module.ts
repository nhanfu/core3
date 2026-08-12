import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { discoverPages, translationMap } from './discovery.ts';
import { requestLanguage } from './locale.ts';
import { migrateDatabase } from './migrations.ts';
import { AuthRepository } from './auth-repository.ts';
import { AuthService } from './auth-service.ts';
import { AUTH_SERVICE_KEY } from '../interfaces/auth.ts';
import { HybridDuckDbDatabase } from './hybrid-database.ts';
import { AUTH_PASSWORD_CHANGE, AUTH_PERMISSION_CHECK, AUTH_USER_RESOLVE } from '../topics/auth.ts';
import { TopicMediator } from '../topics/mediator.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
}

function errorResponse(error: any): Response {
  return json({ error: error?.message || 'Authentication failed' }, error?.status || 401);
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
    const database = context.config?.database as { path?: string } | undefined;
    const dbPath = database?.path || context.env.AUTH_DB_PATH || join(context.moduleRoot, '..', '..', 'coredb', 'auth.duckdb');
    this.db = await HybridDuckDbDatabase.open(dbPath);
    const data = Bun.YAML.parse(await Bun.file(join(context.moduleRoot, 'data.yaml')).text()) as { queries?: Record<string, string> };
    const repository = new AuthRepository(this.db, data.queries || {});
    context.registerService('database', this.db);
    await this.db.withDurableWrites(() => migrateDatabase(repository, join(context.appsRoot, 'db', 'migrations')));
    this.service = new AuthService(repository, new TextEncoder().encode(context.env.AUTH_JWT_SECRET || context.env.JWT_SECRET || 'core3-auth-dev-secret-32chars!!!!'));
    context.registerService(AUTH_SERVICE_KEY, this.service);
    this.topics = new TopicMediator(context.eventBus, `auth-${process.pid}`);
    this.topics.register({
      definition: AUTH_USER_RESOLVE,
      handle: ({ token }) => this.service.introspect(String(token)),
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
          if (Object.keys(fields).length) await repository.updateProfile(String(user.sub), fields);
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

  async unload(): Promise<void> {
    this.topics?.stop();
    this.topics = null;
    if (!this.db) return;
    await new Promise<void>((resolve) => this.db.close(() => resolve()));
    this.db = null;
  }

  uninstall(): void {}
}

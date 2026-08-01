import duckdb from 'duckdb';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { discoverPages, translationMap } from '../lib/server/discovery.ts';
import { requestLanguage } from '../lib/server/locale.ts';
import { migrateDatabase } from '../lib/server/migrations.ts';
import { AuthRepository } from './repository.ts';
import { AuthService } from './service.ts';
import { AUTH_SERVICE_KEY } from '../lib/interfaces/auth.ts';

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

  install(context: { moduleRoot: string }): void {
    mkdirSync(join(context.moduleRoot, '.data'), { recursive: true });
  }

  async load(context: any): Promise<void> {
    const database = context.config?.database as { path?: string } | undefined;
    const dbPath = database?.path || context.env.AUTH_DB_PATH || join(context.moduleRoot, 'auth.duckdb');
    this.db = new duckdb.Database(dbPath);
    const repository = new AuthRepository(this.db);
    await migrateDatabase(repository, join(context.moduleRoot, 'db', 'migrations'));
    this.service = new AuthService(repository, new TextEncoder().encode(context.env.AUTH_JWT_SECRET || context.env.JWT_SECRET || 'core3-auth-dev-secret-32chars!!!!'));
    context.registerService(AUTH_SERVICE_KEY, this.service);

    let pages = discoverPages(context.appsRoot);
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
      if (url.pathname === '/api/pages/login' && request.method === 'GET') {
        pages = discoverPages(context.appsRoot);
        const page = pages.pages.get('login');
        if (!page || page.module !== 'auth') return json({ error: 'Unknown page: login' }, 404);
        return json({ ...page.config, i18n: translationMap(pages.catalogs, requestLanguage(url), 'login') });
      }
      return null;
    });
  }

  async unload(): Promise<void> {
    if (!this.db) return;
    await new Promise<void>((resolve) => this.db.close(() => resolve()));
    this.db = null;
  }

  uninstall(): void {}
}

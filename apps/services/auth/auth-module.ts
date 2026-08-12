import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { discoverPages, translationMap } from '../../lib/server/discovery.ts';
import { requestLanguage } from '../../lib/server/locale.ts';
import { migrateDatabase } from '../../lib/server/migrations.ts';
import { AuthRepository } from './auth-repository.ts';
import { AuthService } from './auth-service.ts';
import { HybridDuckDbDatabase } from '../../lib/server/hybrid-database.ts';
import { AUTH_PASSWORD_CHANGE, AUTH_PERMISSION_CHECK, AUTH_USER_LIST, AUTH_USER_LOOKUP, AUTH_USER_RESOLVE } from './topics.ts';
import { TopicMediator } from '../../lib/topics/mediator.ts';
import { MediatorAuthAdapter } from './auth-adapter.ts';

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
  return json({ error: error?.message || 'Authentication failed' }, error?.status || 401);
}

function safeLocalRedirect(value: string | null): string | null {
  if (!value) return null;
  try {
    const target = new URL(value, 'http://core3.local');
    if (target.origin !== 'http://core3.local' || !target.pathname.startsWith('/') || target.pathname.startsWith('//')) return null;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch { return null; }
}

export default class AuthModule {
  readonly id = 'auth';
  private db: any;
  private service!: AuthService;
  private topics: TopicMediator | null = null;
  private readonly googleStates = new Map<string, { expiresAt: number; redirect: string }>();

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
    await this.db.withDurableWrites(() => migrateDatabase(repository, join(context.moduleRoot, 'migrations'), undefined, 'auth_schema_migrations'));
    this.service = new AuthService(repository, new TextEncoder().encode(context.env.AUTH_JWT_SECRET || context.env.JWT_SECRET || 'core3-auth-dev-secret-32chars!!!!'));
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
      definition: AUTH_USER_LIST,
      handle: () => repository.listUsers(),
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
    context.registerService(AUTH_ADAPTER_KEY, new MediatorAuthAdapter(this.topics));

    let pages = discoverPages(context.appsRoot);
    const profileApi = pages.pages.get('profile')?.config?.api || {};
    const profileEndpoint = String(profileApi.endpoint || '/api/v1/profile');
    const profileFields = new Set(Array.isArray(profileApi.fields) ? profileApi.fields.map(String) : []);
    context.registerApi(async (request: Request, url: URL) => {
      if (url.pathname === '/api/auth/google/start' && request.method === 'GET') {
        const clientId = String(context.env.GOOGLE_CLIENT_ID || '');
        const clientSecret = String(context.env.GOOGLE_CLIENT_SECRET || '');
        if (!clientId || !clientSecret) return json({ error: 'Google login is not configured' }, 503);
        const state = crypto.randomUUID();
        this.googleStates.set(state, {
          expiresAt: Date.now() + 10 * 60 * 1000,
          redirect: safeLocalRedirect(url.searchParams.get('redirect')) || '/',
        });
        const callback = String(context.env.GOOGLE_REDIRECT_URI || `${url.origin}/api/auth/google/callback`);
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: callback,
          response_type: 'code',
          scope: 'openid email profile',
          state,
          access_type: 'online',
          prompt: 'select_account',
        });
        return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302);
      }
      if (url.pathname === '/api/auth/google/callback' && request.method === 'GET') {
        const state = url.searchParams.get('state') || '';
        const stateData = this.googleStates.get(state);
        this.googleStates.delete(state);
        if (!stateData || stateData.expiresAt < Date.now()) return json({ error: 'Invalid or expired Google login state' }, 400);
        const code = url.searchParams.get('code');
        if (!code) return json({ error: url.searchParams.get('error') || 'Google login was cancelled' }, 400);
        const clientId = String(context.env.GOOGLE_CLIENT_ID || '');
        const clientSecret = String(context.env.GOOGLE_CLIENT_SECRET || '');
        const callback = String(context.env.GOOGLE_REDIRECT_URI || `${url.origin}/api/auth/google/callback`);
        try {
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: callback, grant_type: 'authorization_code' }),
          });
          if (!tokenResponse.ok) throw new Error('Google token exchange failed');
          const token = await tokenResponse.json() as { access_token?: string };
          if (!token.access_token) throw new Error('Google did not return an access token');
          const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
            headers: { Authorization: `Bearer ${token.access_token}` },
          });
          if (!profileResponse.ok) throw new Error('Google profile lookup failed');
          const profile = await profileResponse.json() as { email?: string; email_verified?: boolean; name?: string; picture?: string };
          if (!profile.email || profile.email_verified !== true) throw { status: 403, message: 'Google email is not verified' };
          const result = await this.service.loginExternal({ email: profile.email, name: profile.name, avatar_url: profile.picture });
          return new Response(null, {
            status: 302,
            headers: { Location: `${stateData.redirect}#oauth_token=${encodeURIComponent(result.token)}` },
          });
        } catch (error) { return errorResponse(error); }
      }
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

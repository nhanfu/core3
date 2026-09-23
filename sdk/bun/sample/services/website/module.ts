import { loadYamlServiceManifest, YamlServiceModule } from '@core3/server/yaml-service';
import type { ModuleContext, ModuleLifecycle } from '@core3/server/module';

type WebsiteService = { call(operation: string, request?: Record<string, unknown>): Promise<any> };
const WEBSITE_CONSENT_COOKIE = 'website_cookies_bar';
const WEBSITE_CONSENT_MAX_AGE = 999 * 24 * 60 * 60;

type WebsiteConsent = { required: true; optional: boolean; ts: number };

export default class WebsiteModule implements ModuleLifecycle {
  readonly id = 'website';
  private delegate: YamlServiceModule | null = null;

  private getDelegate(context: ModuleContext): YamlServiceModule {
    this.delegate ??= new YamlServiceModule(loadYamlServiceManifest(context.moduleRoot));
    return this.delegate;
  }

  install(context: ModuleContext): void { this.getDelegate(context).install(context); }

  async load(context: ModuleContext): Promise<void> {
    const delegate = this.getDelegate(context);
    await delegate.load(context);
    const service = context.resolveService<WebsiteService>('yaml.service.website');
    const yamlApi = delegate.getRuntimeContext()?.api;
    context.registerApi(async (request, url, server) => {
      const publicResponse = await this.handlePublicRoute(request, url, service);
      if (publicResponse) return publicResponse;
      return yamlApi ? (await yamlApi(request, url, server)) || null : null;
    });
  }

  async unload(context: ModuleContext): Promise<void> { await this.delegate?.unload(context); this.delegate = null; }
  uninstall(context: ModuleContext): void { this.delegate?.uninstall(context); }

  async handlePublicRoute(request: Request, url: URL, service: WebsiteService): Promise<Response | null> {
    if (url.pathname === '/api/public/website/cookie-consent') {
      return this.handlePublicCookieConsent(request, url, service);
    }
    if (url.pathname === '/api/public/website/pages') {
      if (request.method !== 'GET') return this.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
      const result = await service.call('website.public.pages', { q: url.searchParams.get('q')?.trim() || null, website_id: url.searchParams.get('website_id')?.trim() || null, preview_theme_id: url.searchParams.get('theme_id')?.trim() || null });
      return this.json({ pages: result?.pages || [] });
    }
    if (url.pathname === '/api/public/website/page') {
      if (request.method !== 'GET') return this.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
      const path = url.searchParams.get('path') || '/';
      const result = await service.call('website.public.page_by_path', { url: path, website_id: url.searchParams.get('website_id')?.trim() || null, preview_theme_id: url.searchParams.get('theme_id')?.trim() || null });
      const page = result?.pages?.[0];
      if (!page) return this.json({ error: 'Page not found', code: 'WEBSITE_PUBLIC_PAGE_NOT_FOUND' }, 404);
      return this.json({ page: { ...page, asset_url: page.asset_id ? `/api/public/website/assets/${encodeURIComponent(String(page.asset_id))}` : null } });
    }
    const assetMatch = url.pathname.match(/^\/api\/public\/website\/assets\/([^/]+)$/);
    if (assetMatch) {
      if (request.method !== 'GET') return this.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
      const result = await service.call('website.public.asset', { id: decodeURIComponent(assetMatch[1]) });
      const asset = result?.asset?.[0];
      if (!asset) return this.json({ error: 'Asset not found', code: 'WEBSITE_PUBLIC_ASSET_NOT_FOUND' }, 404);
      try {
        const bytes = Uint8Array.from(atob(String(asset.content_base64)), (char) => char.charCodeAt(0));
        return new Response(bytes, { status: 200, headers: { 'Content-Type': String(asset.mime_type), 'Content-Length': String(bytes.byteLength), 'Cache-Control': 'public, max-age=300', 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(String(asset.file_name))}` } });
      } catch {
        return this.json({ error: 'Asset content is invalid', code: 'WEBSITE_PUBLIC_ASSET_INVALID' }, 500);
      }
    }
    const match = url.pathname.match(/^\/api\/public\/website\/pages\/([^/]+)$/);
    if (!match) return null;
    if (request.method !== 'GET') return this.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
    const result = await service.call('website.public.page', { id: decodeURIComponent(match[1]), website_id: url.searchParams.get('website_id')?.trim() || null, preview_theme_id: url.searchParams.get('theme_id')?.trim() || null });
    const page = result?.pages?.[0];
    return page ? this.json({ page: { ...page, asset_url: page.asset_id ? `/api/public/website/assets/${encodeURIComponent(String(page.asset_id))}` : null } }) : this.json({ error: 'Page not found', code: 'WEBSITE_PUBLIC_PAGE_NOT_FOUND' }, 404);
  }

  private async handlePublicCookieConsent(request: Request, url: URL, service: WebsiteService): Promise<Response> {
    const websiteId = url.searchParams.get('website_id')?.trim() || null;
    if (request.method === 'GET') {
      const result = await service.call('website.public.cookie_consent', { website_id: websiteId });
      const website = result?.websites?.[0];
      if (!website) return this.json({ error: 'Website not found', code: 'WEBSITE_PUBLIC_CONSENT_WEBSITE_NOT_FOUND' }, 404);
      const parsed = this.readConsent(request.headers.get('cookie'));
      const consent = parsed.value;
      const cookiesBar = Boolean(website.cookies_bar);
      const response = this.json({
        website: { id: website.id, name: website.name },
        cookie_name: WEBSITE_CONSENT_COOKIE,
        cookies_bar: cookiesBar,
        block_third_party_domains: Boolean(website.block_third_party_domains),
        optional_cookies_allowed: !cookiesBar || consent?.optional === true,
        show_banner: cookiesBar && !consent,
        consent,
        banner: this.cookieBanner(),
      });
      if (parsed.invalid) response.headers.set('Set-Cookie', this.expireConsentCookie());
      return response;
    }
    if (request.method !== 'POST') return this.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);

    let body: any;
    try { body = await request.json(); } catch { return this.json({ error: 'Choose a cookie preference', code: 'WEBSITE_PUBLIC_CONSENT_REQUIRED' }, 422); }
    const choice = String(body?.choice || '').trim().toLowerCase();
    if (choice !== 'all' && choice !== 'essential') {
      return this.json({ error: 'Choose all cookies or essential cookies', code: 'WEBSITE_PUBLIC_CONSENT_INVALID' }, 422);
    }
    const result = await service.call('website.public.cookie_consent.save', { website_id: websiteId });
    const website = result?.websites?.[0];
    if (!website) return this.json({ error: 'Website not found', code: 'WEBSITE_PUBLIC_CONSENT_WEBSITE_NOT_FOUND' }, 404);
    if (!website.cookies_bar) return this.json({ error: 'Cookie consent is disabled for this website', code: 'WEBSITE_PUBLIC_CONSENT_DISABLED' }, 409);
    const consent: WebsiteConsent = { required: true, optional: choice === 'all', ts: Date.now() };
    const response = this.json({
      website: { id: website.id, name: website.name },
      cookie_name: WEBSITE_CONSENT_COOKIE,
      cookies_bar: true,
      block_third_party_domains: Boolean(website.block_third_party_domains),
      optional_cookies_allowed: consent.optional,
      show_banner: false,
      consent,
      banner: this.cookieBanner(),
    });
    response.headers.set('Set-Cookie', this.setConsentCookie(consent));
    return response;
  }

  private cookieBanner() {
    return {
      title: 'Respecting your privacy is our priority.',
      message: 'We use cookies to provide you a better user experience on this website.',
      policy_url: '/cookie-policy',
      essential_label: 'Only essentials',
      all_label: 'I agree',
    };
  }

  private readConsent(header: string | null): { value: WebsiteConsent | null; invalid: boolean } {
    const match = header?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${WEBSITE_CONSENT_COOKIE}=`));
    if (!match) return { value: null, invalid: false };
    try {
      const parsed = JSON.parse(decodeURIComponent(match.slice(WEBSITE_CONSENT_COOKIE.length + 1)));
      if (parsed?.required !== true || typeof parsed.optional !== 'boolean' || !Number.isFinite(parsed.ts)) return { value: null, invalid: true };
      return { value: { required: true, optional: parsed.optional, ts: Number(parsed.ts) }, invalid: false };
    } catch {
      return { value: null, invalid: true };
    }
  }

  private setConsentCookie(consent: WebsiteConsent): string {
    return `${WEBSITE_CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; Path=/; SameSite=Lax; Max-Age=${WEBSITE_CONSENT_MAX_AGE}`;
  }

  private expireConsentCookie(): string {
    return `${WEBSITE_CONSENT_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`;
  }

  private json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}

import { loadYamlServiceManifest, YamlServiceModule } from '@core3/server/yaml-service';
import type { ModuleContext, ModuleLifecycle } from '@core3/server/module';

type WebsiteService = { call(operation: string, request?: Record<string, unknown>): Promise<any> };

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
    if (url.pathname === '/api/public/website/pages') {
      if (request.method !== 'GET') return this.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
      const result = await service.call('website.public.pages', { q: url.searchParams.get('q')?.trim() || null, website_id: url.searchParams.get('website_id')?.trim() || null });
      return this.json({ pages: result?.pages || [] });
    }
    if (url.pathname === '/api/public/website/page') {
      if (request.method !== 'GET') return this.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
      const path = url.searchParams.get('path') || '/';
      const result = await service.call('website.public.page_by_path', { url: path, website_id: url.searchParams.get('website_id')?.trim() || null });
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
    const result = await service.call('website.public.page', { id: decodeURIComponent(match[1]), website_id: url.searchParams.get('website_id')?.trim() || null });
    const page = result?.pages?.[0];
    return page ? this.json({ page: { ...page, asset_url: page.asset_id ? `/api/public/website/assets/${encodeURIComponent(String(page.asset_id))}` : null } }) : this.json({ error: 'Page not found', code: 'WEBSITE_PUBLIC_PAGE_NOT_FOUND' }, 404);
  }

  private json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}

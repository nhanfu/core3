import { loadYamlServiceManifest, YamlServiceModule } from '@core3/server/yaml-service';
import type { ModuleContext, ModuleLifecycle } from '@core3/server/module';

type EcommerceService = { call(operation: string, request?: Record<string, unknown>): Promise<any> };

export default class EcommerceModule implements ModuleLifecycle {
  readonly id = 'ecommerce';
  private delegate: YamlServiceModule | null = null;

  private getDelegate(context: ModuleContext): YamlServiceModule {
    this.delegate ??= new YamlServiceModule(loadYamlServiceManifest(context.moduleRoot));
    return this.delegate;
  }

  install(context: ModuleContext): void { this.getDelegate(context).install(context); }

  async load(context: ModuleContext): Promise<void> {
    const delegate = this.getDelegate(context);
    await delegate.load(context);
    const service = context.resolveService<EcommerceService>('yaml.service.ecommerce');
    const yamlApi = delegate.getRuntimeContext()?.api;
    context.registerApi(async (request, url, server) => {
      const publicResponse = await this.handlePublicRoute(request, url, service);
      if (publicResponse) return publicResponse;
      return yamlApi ? (await yamlApi(request, url, server)) || null : null;
    });
  }

  async unload(context: ModuleContext): Promise<void> {
    await this.delegate?.unload(context);
    this.delegate = null;
  }

  uninstall(context: ModuleContext): void { this.delegate?.uninstall(context); }

  async handlePublicRoute(request: Request, url: URL, service: EcommerceService): Promise<Response | null> {
    if (url.pathname !== '/api/public/ecommerce/shop') return null;
    if (request.method !== 'GET') return this.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
    const q = url.searchParams.get('q')?.trim() || null;
    const result = await service.call('ecommerce.public.shop', { q });
    return this.json({ products: result?.products || [] });
  }

  private json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

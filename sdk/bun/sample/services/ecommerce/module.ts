import { loadYamlServiceManifest, YamlServiceModule } from '@core3/server/yaml-service';
import type { ModuleContext, ModuleLifecycle } from '@core3/server/module';

type EcommerceService = { call(operation: string, request?: Record<string, unknown>): Promise<any> };
const ANONYMOUS_CART_COOKIE = 'core3_ecommerce_cart';

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
    if (url.pathname === '/api/public/ecommerce/shop') {
      if (request.method !== 'GET') return this.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
      const q = url.searchParams.get('q')?.trim() || null;
      const result = await service.call('ecommerce.public.shop', { q });
      return this.json({ products: result?.products || [] });
    }
    if (url.pathname !== '/api/public/ecommerce/cart') return null;
    const cartId = this.anonymousCartId(request.headers.get('cookie'));
    if (request.method === 'GET') {
      const result = await service.call('ecommerce.public.cart', { cart_id: cartId });
      const lines = result?.lines || result?.data || [];
      return this.json({ cart_id: cartId, lines, amount_total: lines[0]?.amount_total || 0 });
    }
    if (request.method !== 'POST') return this.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
    let body: any;
    try { body = await request.json(); } catch { return this.json({ error: 'A product is required', code: 'ECOMMERCE_PUBLIC_CART_PRODUCT_REQUIRED' }, 422); }
    const productId = String(body?.product_id || '').trim();
    if (!productId) return this.json({ error: 'A product is required', code: 'ECOMMERCE_PUBLIC_CART_PRODUCT_REQUIRED' }, 422);
    const createdCart = !cartId;
    const effectiveCartId = cartId || `ecommerce-cart-anon-${crypto.randomUUID()}`;
    const result = await service.call('ecommerce.cart.anonymous_add', { values: { cart_id: effectiveCartId, line_id: `${effectiveCartId}-${productId}`, product_id: productId } });
    const response = this.json({ cart_id: effectiveCartId, line: result });
    if (createdCart) response.headers.set('Set-Cookie', `${ANONYMOUS_CART_COOKIE}=${effectiveCartId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    return response;
  }

  private anonymousCartId(cookie: string | null): string | null {
    const value = cookie?.match(new RegExp(`(?:^|;\\s*)${ANONYMOUS_CART_COOKIE}=([^;]+)`))?.[1] || '';
    return /^ecommerce-cart-anon-[0-9a-f-]+$/i.test(value) ? value : null;
  }

  private json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

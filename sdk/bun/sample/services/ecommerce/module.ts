import { loadYamlServiceManifest, YamlServiceModule } from '@core3/server/yaml-service';
import type { ModuleContext, ModuleLifecycle } from '@core3/server/module';
import { EcommerceTemporalDispatcher } from './temporal-dispatcher';

type EcommerceService = { call(operation: string, request?: Record<string, unknown>): Promise<any> };
const ANONYMOUS_CART_COOKIE = 'core3_ecommerce_cart';
const ANONYMOUS_WISHLIST_COOKIE = 'core3_ecommerce_wishlist';

export default class EcommerceModule implements ModuleLifecycle {
  readonly id = 'ecommerce';
  private delegate: YamlServiceModule | null = null;
  private temporalDispatcher = new EcommerceTemporalDispatcher();

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
    if (context.env.TEMPORAL_ADDRESS) await this.temporalDispatcher.start(context.eventBus, context.env.TEMPORAL_ADDRESS);
    context.registerApi(async (request, url, server) => {
      const publicResponse = await this.handlePublicRoute(request, url, service);
      if (publicResponse) return publicResponse;
      return yamlApi ? (await yamlApi(request, url, server)) || null : null;
    });
  }

  async unload(context: ModuleContext): Promise<void> {
    await this.temporalDispatcher.stop();
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
    if (url.pathname === '/api/public/ecommerce/checkout') return this.handlePublicCheckout(request, service);
    if (url.pathname === '/api/public/ecommerce/wishlist') return this.handlePublicWishlist(request, service);
    const wishlistItemMatch = url.pathname.match(/^\/api\/public\/ecommerce\/wishlist\/([^/]+)$/);
    if (wishlistItemMatch) return this.handlePublicWishlistItem(request, service, decodeURIComponent(wishlistItemMatch[1]));
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
    const variantId = String(body?.variant_id || '').trim() || null;
    const createdCart = !cartId;
    const effectiveCartId = cartId || `ecommerce-cart-anon-${crypto.randomUUID()}`;
    const result = await service.call('ecommerce.cart.anonymous_add', { values: { cart_id: effectiveCartId, line_id: `${effectiveCartId}-${variantId || productId}`, product_id: productId, variant_id: variantId } });
    const response = this.json({ cart_id: effectiveCartId, line: result });
    if (createdCart) response.headers.set('Set-Cookie', `${ANONYMOUS_CART_COOKIE}=${effectiveCartId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    return response;
  }

  private async handlePublicWishlist(request: Request, service: EcommerceService): Promise<Response> {
    const wishlistId = this.anonymousWishlistId(request.headers.get('cookie'));
    if (request.method === 'GET') {
      const result = wishlistId ? await service.call('ecommerce.public.wishlist', { wishlist_id: wishlistId }) : { items: [] };
      return this.json({ wishlist_id: wishlistId, items: result?.items || result?.data || [] });
    }
    if (request.method !== 'POST') return this.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
    let body: any;
    try { body = await request.json(); } catch { return this.json({ error: 'A product is required', code: 'ECOMMERCE_PUBLIC_WISHLIST_PRODUCT_REQUIRED' }, 422); }
    const productId = String(body?.product_id || '').trim();
    if (!productId) return this.json({ error: 'A product is required', code: 'ECOMMERCE_PUBLIC_WISHLIST_PRODUCT_REQUIRED' }, 422);
    const variantId = String(body?.variant_id || '').trim();
    const createdWishlist = !wishlistId;
    const effectiveWishlistId = wishlistId || `ecommerce-wishlist-anon-${crypto.randomUUID()}`;
    const result = await service.call('ecommerce.wishlist.public_add', { values: { wishlist_id: effectiveWishlistId, session_key: effectiveWishlistId, item_id: `${effectiveWishlistId}-${variantId || productId}`, owner_type: 'anonymous', product_id: productId, variant_id: variantId || null, variant_key: variantId, company_name: 'My Company', website_id: 'core3-main-website', currency: 'USD' } });
    const response = this.json({ wishlist_id: effectiveWishlistId, item: result });
    if (createdWishlist) response.headers.set('Set-Cookie', `${ANONYMOUS_WISHLIST_COOKIE}=${effectiveWishlistId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    return response;
  }

  private async handlePublicWishlistItem(request: Request, service: EcommerceService, itemId: string): Promise<Response> {
    if (request.method !== 'DELETE') return this.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
    const wishlistId = this.anonymousWishlistId(request.headers.get('cookie'));
    if (!wishlistId) return this.json({ error: 'An anonymous wishlist is required', code: 'ECOMMERCE_PUBLIC_WISHLIST_REQUIRED' }, 422);
    let body: any = {};
    try { body = await request.json(); } catch { /* expected when the caller supplies no optional body */ }
    const result = await service.call('ecommerce.wishlist.public_remove', { values: { id: itemId, wishlist_id: wishlistId, session_key: wishlistId, company_name: 'My Company', expected_row_version: body?.expected_row_version || 1 } });
    return this.json({ removed: result });
  }

  private async handlePublicCheckout(request: Request, service: EcommerceService): Promise<Response> {
    if (request.method !== 'POST') return this.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
    const cartId = this.anonymousCartId(request.headers.get('cookie'));
    if (!cartId) return this.json({ error: 'An anonymous cart is required', code: 'ECOMMERCE_PUBLIC_CHECKOUT_CART_REQUIRED' }, 422);
    let body: any;
    try { body = await request.json(); } catch { return this.json({ error: 'Checkout details are required', code: 'ECOMMERCE_PUBLIC_CHECKOUT_INPUT_REQUIRED' }, 422); }
    const result = await service.call('ecommerce.checkout.anonymous_confirm', { values: { ...body, cart_id: cartId } });
    const response = this.json({ order: result });
    response.headers.set('Set-Cookie', `${ANONYMOUS_CART_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    return response;
  }

  private anonymousCartId(cookie: string | null): string | null {
    const value = cookie?.match(new RegExp(`(?:^|;\\s*)${ANONYMOUS_CART_COOKIE}=([^;]+)`))?.[1] || '';
    return /^ecommerce-cart-anon-[0-9a-f-]+$/i.test(value) ? value : null;
  }

  private anonymousWishlistId(cookie: string | null): string | null {
    const value = cookie?.match(new RegExp(`(?:^|;\\s*)${ANONYMOUS_WISHLIST_COOKIE}=([^;]+)`))?.[1] || '';
    return /^ecommerce-wishlist-anon-[0-9a-f-]+$/i.test(value) ? value : null;
  }

  private json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

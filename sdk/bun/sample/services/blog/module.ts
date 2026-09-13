import { loadYamlServiceManifest, YamlServiceModule } from '@core3/server/yaml-service';
import type { ModuleContext, ModuleLifecycle } from '@core3/server/module';

type BlogService = { call(operation: string, request?: Record<string, unknown>): Promise<any> };

export default class BlogModule implements ModuleLifecycle {
  readonly id = 'blog';
  private delegate: YamlServiceModule | null = null;

  private getDelegate(context: ModuleContext): YamlServiceModule {
    this.delegate ??= new YamlServiceModule(loadYamlServiceManifest(context.moduleRoot));
    return this.delegate;
  }

  install(context: ModuleContext): void { this.getDelegate(context).install(context); }

  async load(context: ModuleContext): Promise<void> {
    const delegate = this.getDelegate(context);
    await delegate.load(context);
    const service = context.resolveService<BlogService>('yaml.service.blog');
    const yamlApi = delegate.getRuntimeContext()?.api;
    context.registerApi(async (request, url, server) => {
      const publicResponse = await this.handlePublicRoute(request, url, service);
      if (publicResponse) return publicResponse;
      return yamlApi ? (await yamlApi(request, url, server)) || null : null;
    });
  }

  async unload(context: ModuleContext): Promise<void> { await this.delegate?.unload(context); this.delegate = null; }
  uninstall(context: ModuleContext): void { this.delegate?.uninstall(context); }

  async handlePublicRoute(request: Request, url: URL, service: BlogService): Promise<Response | null> {
    if (url.pathname === '/api/public/blog/posts') {
      if (request.method !== 'GET') return this.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
      const q = url.searchParams.get('q')?.trim() || null;
      const blogId = url.searchParams.get('blog_id')?.trim() || null;
      const result = await service.call('blog.public.posts', { q, blog_id: blogId });
      return this.json({ posts: result?.posts || result?.data || [] });
    }
    const match = url.pathname.match(/^\/api\/public\/blog\/posts\/([^/]+)$/);
    if (!match) return null;
    if (request.method !== 'GET') return this.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
    const blogId = url.searchParams.get('blog_id')?.trim() || null;
    const result = await service.call('blog.public.post', { id: decodeURIComponent(match[1]), blog_id: blogId });
    const posts = result?.posts || result?.data || [];
    if (!posts.length) return this.json({ error: 'Post not found', code: 'BLOG_PUBLIC_POST_NOT_FOUND' }, 404);
    return this.json({ post: posts[0] });
  }

  private json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}

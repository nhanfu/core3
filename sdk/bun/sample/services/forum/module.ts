import { loadYamlServiceManifest, YamlServiceModule } from '@core3/server/yaml-service';
import type { ModuleContext, ModuleLifecycle } from '@core3/server/module';

type ForumService = { call(operation: string, request?: Record<string, unknown>): Promise<any> };

export default class ForumModule implements ModuleLifecycle {
  readonly id = 'forum';
  private delegate: YamlServiceModule | null = null;

  private getDelegate(context: ModuleContext): YamlServiceModule {
    this.delegate ??= new YamlServiceModule(loadYamlServiceManifest(context.moduleRoot));
    return this.delegate;
  }

  install(context: ModuleContext): void { this.getDelegate(context).install(context); }

  async load(context: ModuleContext): Promise<void> {
    const delegate = this.getDelegate(context);
    await delegate.load(context);
    const service = context.resolveService<ForumService>('yaml.service.forum');
    const yamlApi = delegate.getRuntimeContext()?.api;
    context.registerApi(async (request, url, server) => {
      const publicResponse = await this.handlePublicRoute(request, url, service);
      if (publicResponse) return publicResponse;
      return yamlApi ? (await yamlApi(request, url, server)) || null : null;
    });
  }

  async unload(context: ModuleContext): Promise<void> { await this.delegate?.unload(context); this.delegate = null; }
  uninstall(context: ModuleContext): void { this.delegate?.uninstall(context); }

  async handlePublicRoute(request: Request, url: URL, service: ForumService): Promise<Response | null> {
    if (url.pathname === '/api/public/forum/questions') {
      if (request.method !== 'GET') return this.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
      const result = await service.call('forum.public.questions', { q: url.searchParams.get('q')?.trim() || null });
      return this.json({ questions: result?.questions || [] });
    }
    const match = url.pathname.match(/^\/api\/public\/forum\/questions\/([^/]+)$/);
    if (!match) return null;
    if (request.method !== 'GET') return this.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
    const result = await service.call('forum.public.question', { id: decodeURIComponent(match[1]) });
    const questions = result?.questions || [];
    if (!questions.length) return this.json({ error: 'Question not found', code: 'FORUM_PUBLIC_QUESTION_NOT_FOUND' }, 404);
    return this.json({ question: questions[0] });
  }

  private json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}

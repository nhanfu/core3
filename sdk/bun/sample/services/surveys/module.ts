import { loadYamlServiceManifest, YamlServiceModule } from '@core3/server/yaml-service';
import type { ModuleContext, ModuleLifecycle } from '@core3/server/module';

type PublicService = { call(operation: string, request?: Record<string, unknown>): Promise<any> };

export default class SurveysModule implements ModuleLifecycle {
  readonly id = 'surveys';
  private delegate: YamlServiceModule | null = null;

  private getDelegate(context: ModuleContext): YamlServiceModule {
    if (!this.delegate) this.delegate = new YamlServiceModule(loadYamlServiceManifest(context.moduleRoot));
    return this.delegate;
  }

  install(context: ModuleContext): void {
    this.getDelegate(context).install(context);
  }

  async load(context: ModuleContext): Promise<void> {
    const delegate = this.getDelegate(context);
    await delegate.load(context);
    const service = context.resolveService<PublicService>('yaml.service.surveys');
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

  uninstall(context: ModuleContext): void {
    this.delegate?.uninstall(context);
  }

  private async handlePublicRoute(request: Request, url: URL, service: PublicService): Promise<Response | null> {
    const match = url.pathname.match(/^\/api\/public\/surveys\/([A-Za-z0-9_-]+)(?:\/(start|submit))?$/);
    if (!match) return null;
    const token = match[1];
    const operation = match[2];
    const detail = (await service.call('survey.public.detail', { access_token: token }))?.survey?.[0];
    if (!detail) return this.json({ error: 'Survey is unavailable' }, 404);

    if (request.method === 'GET' && !operation) {
      const questions = (await service.call('survey.public.questions', { survey_id: detail.id }))?.questions || [];
      return this.json({ survey: detail, questions });
    }
    if (request.method !== 'POST' || !operation) return this.json({ error: 'Method not allowed' }, 405);

    const body = await request.json().catch(() => ({})) as Record<string, any>;
    if (operation === 'start') {
      const result = await service.call('surveys.public.start', {
        values: {
          survey_id: detail.id,
          survey_name: detail.name,
          answer_data: '{}',
          access_token: crypto.randomUUID(),
        },
      });
      return this.json({ survey: detail, answer: result });
    }

    const answerToken = String(body.answer_token || '');
    if (!/^[A-Za-z0-9-]{16,100}$/.test(answerToken)) return this.json({ error: 'A valid answer token is required' }, 400);
    const response = (await service.call('survey.public.response', { access_token: answerToken, survey_id: detail.id }))?.response?.[0];
    if (!response) return this.json({ error: 'Survey response is unavailable' }, 404);
    if (response.state === 'Submitted') return this.json({ error: 'This survey response is already submitted' }, 409);
    const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
    const result = await service.call('surveys.public.submit', {
      id: response.id,
      survey_id: response.survey_id,
      values: {
        answer_data: JSON.stringify(answers),
        respondent_name: typeof body.respondent_name === 'string' ? body.respondent_name.trim() : undefined,
        respondent_email: typeof body.respondent_email === 'string' ? body.respondent_email.trim() : undefined,
      },
    });
    return this.json({ survey: detail, answer: result });
  }

  private json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

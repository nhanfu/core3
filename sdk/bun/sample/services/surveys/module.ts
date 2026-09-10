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
    const match = url.pathname.match(/^\/api\/public\/surveys\/([A-Za-z0-9_-]+)(?:\/(start|progress|submit|print))?$/);
    if (!match) return null;
    const token = match[1];
    const operation = match[2];
    const detail = (await service.call('survey.public.detail', { access_token: token }))?.survey?.[0];
    const printDetail = operation === 'print'
      ? (await service.call('survey.public.print.detail', { access_token: token }))?.survey?.[0]
      : undefined;
    if (operation === 'print') {
      if (request.method !== 'GET') return this.json({ error: 'Method not allowed' }, 405);
      if (!printDetail) return this.json({ error: 'This survey is unavailable for printing' }, 404);
      const questions = (await service.call('survey.public.print.questions', { survey_id: printDetail.id }))?.questions || [];
      const answerToken = url.searchParams.get('answer_token') || '';
      if (!answerToken) return this.json({ survey: printDetail, questions, answer: null, review: url.searchParams.get('review') === '1' });
      if (!this.isToken(answerToken)) return this.json({ error: 'A valid answer token is required' }, 422);
      const answer = (await service.call('survey.public.print.response', {
        access_token: answerToken,
        survey_id: printDetail.id,
      }))?.response?.[0];
      if (!answer) return this.json({ error: 'Survey response is unavailable' }, 404);
      return this.json({ survey: printDetail, questions, answer, review: url.searchParams.get('review') === '1' });
    }
    if (!detail) return this.json({ error: 'Survey is unavailable' }, 404);

    const readResponse = async (answerToken: string) => (await service.call('survey.public.response', {
      access_token: answerToken,
      survey_id: detail.id,
    }))?.response?.[0];

    if (request.method === 'GET' && !operation) {
      const questions = (await service.call('survey.public.questions', { survey_id: detail.id }))?.questions || [];
      const answerToken = url.searchParams.get('answer_token') || '';
      if (answerToken && !this.isToken(answerToken)) return this.json({ error: 'A valid answer token is required' }, 400);
      const answer = answerToken ? await readResponse(answerToken) : undefined;
      if (answerToken && !answer) return this.json({ error: 'Survey response is unavailable' }, 404);
      return this.json({ survey: detail, questions, ...(answer ? { answer } : {}) });
    }
    if (request.method !== 'POST' || !operation) return this.json({ error: 'Method not allowed' }, 405);

    const body = await request.json().catch(() => ({})) as Record<string, any>;
    if (operation === 'start') {
      const existingToken = String(body.answer_token || '');
      if (existingToken) {
        if (!this.isToken(existingToken)) return this.json({ error: 'A valid answer token is required' }, 400);
        const answer = await readResponse(existingToken);
        if (!answer) return this.json({ error: 'Survey response is unavailable' }, 404);
        return this.json({ survey: detail, answer });
      }
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
    if (!this.isToken(answerToken)) return this.json({ error: 'A valid answer token is required' }, 400);
    const response = await readResponse(answerToken);
    if (!response) return this.json({ error: 'Survey response is unavailable' }, 404);
    if (response.state === 'Submitted') return this.json({ error: 'This survey response is already submitted' }, 409);
    const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
    if (operation === 'progress') {
      const result = await service.call('surveys.public.progress', {
        id: response.id,
        survey_id: detail.id,
        access_token: answerToken,
        values: { answer_data: JSON.stringify(answers) },
      });
      return this.json({ survey: detail, answer: result });
    }
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

  private isToken(value: string): boolean {
    return /^[A-Za-z0-9-]{16,100}$/.test(value);
  }

  private json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

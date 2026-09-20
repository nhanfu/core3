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
    const sessionMatch = url.pathname.match(/^\/api\/public\/surveys\/session\/([A-Za-z0-9-]+)$/);
    if (sessionMatch) return this.handlePublicSessionRoute(request, sessionMatch[1], service);
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
      if (!answer || answer.state !== 'Submitted') return this.json({ error: 'Survey response is unavailable' }, 404);
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
        if (answer.state === 'Submitted') return this.json({ error: 'This survey response is already submitted' }, 409);
        if (answer.state !== 'In Progress') return this.json({ error: 'This survey response is no longer available for editing' }, 409);
        return this.json({ survey: detail, answer });
      }
      const idempotencyKey = this.idempotencyKey(body.idempotency_key);
      if (idempotencyKey) {
        const existing = (await service.call('survey.public.response_by_idempotency_key', {
          idempotency_key: idempotencyKey,
          survey_id: detail.id,
        }))?.response?.[0];
        if (existing) return this.json({ survey: detail, answer: existing });
      }
      let result;
      try {
        result = await service.call('surveys.public.start', {
          values: {
            survey_id: detail.id,
            survey_name: detail.name,
            answer_data: '{}',
            access_token: crypto.randomUUID(),
            idempotency_key: idempotencyKey || null,
          },
        });
      } catch (error) {
        // A concurrent retry can win the unique-key race between the lookup
        // above and the insert. Replay that committed response instead of
        // leaking a database constraint error to the public client.
        if (!idempotencyKey) throw error;
        const existing = (await service.call('survey.public.response_by_idempotency_key', {
          idempotency_key: idempotencyKey,
          survey_id: detail.id,
        }))?.response?.[0];
        if (!existing) throw error;
        result = existing;
      }
      return this.json({ survey: detail, answer: result });
    }

    const answerToken = String(body.answer_token || '');
    if (!this.isToken(answerToken)) return this.json({ error: 'A valid answer token is required' }, 400);
    const response = await readResponse(answerToken);
    if (!response) return this.json({ error: 'Survey response is unavailable' }, 404);
    const idempotencyKey = this.idempotencyKey(body.idempotency_key);
    if (response.state === 'Submitted') {
      if (idempotencyKey && response.idempotency_key === idempotencyKey) {
        return this.json({ survey: detail, answer: response });
      }
      return this.json({ error: 'This survey response is already submitted' }, 409);
    }
    if (response.state !== 'In Progress') return this.json({ error: 'This survey response is no longer available for editing' }, 409);
    const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
    if (operation === 'progress') {
      try {
        const result = await service.call('surveys.public.progress', {
          id: response.id,
          survey_id: detail.id,
          access_token: answerToken,
          values: { answer_data: JSON.stringify(answers) },
        });
        return this.json({ survey: detail, answer: result });
      } catch (error: any) {
        return this.publicMutationError(error);
      }
    }
    const questions = (await service.call('survey.public.questions', { survey_id: detail.id }))?.questions || [];
    const missingRequired = questions
      .filter((question: any) => question.required && (answers[question.id] === undefined || answers[question.id] === null || String(answers[question.id]).trim() === ''))
      .map((question: any) => question.question_text || question.id);
    if (missingRequired.length) return this.json({ error: `Required answers are missing: ${missingRequired.join(', ')}` }, 422);
    try {
      const result = await service.call('surveys.public.submit', {
        id: response.id,
        survey_id: response.survey_id,
        access_token: answerToken,
        values: {
          answer_data: JSON.stringify(answers),
          respondent_name: typeof body.respondent_name === 'string' ? body.respondent_name.trim() : undefined,
          respondent_email: typeof body.respondent_email === 'string' ? body.respondent_email.trim() : undefined,
          idempotency_key: idempotencyKey || undefined,
        },
      });
      return this.json({ survey: detail, answer: result });
    } catch (error: any) {
      return this.publicMutationError(error);
    }
  }

  private async handlePublicSessionRoute(request: Request, sessionCode: string, service: PublicService): Promise<Response> {
    const session = (await service.call('survey.public.session', { session_code: sessionCode }))?.session?.[0];
    if (!session) return this.json({ error: 'The live session is unavailable', code: 'SURVEY_SESSION_NOT_FOUND' }, 404);
    if (session.session_state === 'Closed') return this.json({ error: 'The live session is no longer open', code: 'SURVEY_SESSION_CLOSED' }, 409);
    const question = session.session_state === 'In Progress'
      ? (await service.call('survey.public.session.question', { session_code: sessionCode }))?.question?.[0] || null
      : null;
    if (request.method === 'GET') return this.json({ session, question });
    if (request.method !== 'POST') return this.json({ error: 'Method not allowed' }, 405);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const attendeeName = typeof body.attendee_name === 'string' ? body.attendee_name.trim() : '';
    if (!attendeeName || attendeeName.length > 120) return this.json({ error: 'Enter a name to join the live session', code: 'SURVEY_SESSION_ATTENDEE_NAME_REQUIRED' }, 422);
    const normalized = attendeeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const joinKey = `session:${session.id}:name:${normalized}`;
    const existing = (await service.call('survey.public.session.attendee', { join_key: joinKey }))?.attendee?.[0];
    if (existing) return this.json({ ...existing, survey_name: session.survey_name, session_code: session.session_code, session_state: session.session_state, question });
    try {
      const attendee = await service.call('surveys.sessions.join', { session_code: sessionCode, attendee_name: attendeeName });
      return this.json({ ...(attendee || {}), survey_name: session.survey_name, session_code: session.session_code, session_state: session.session_state, question });
    } catch (error: any) {
      return this.publicMutationError(error);
    }
  }

  private publicMutationError(error: any): Response {
    const status = Number(error?.status);
    if (status >= 400 && status < 500) {
      return this.json({ error: String(error?.message || 'This survey response is no longer available for editing'), ...(error?.code ? { code: error.code } : {}) }, status);
    }
    throw error;
  }

  private isToken(value: string): boolean {
    return /^[A-Za-z0-9-]{16,100}$/.test(value);
  }

  private idempotencyKey(value: unknown): string {
    const key = typeof value === 'string' ? value.trim() : '';
    return key && key.length <= 200 ? key : '';
  }

  private json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

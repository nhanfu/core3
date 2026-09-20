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
    const sessionMatch = url.pathname.match(/^\/api\/public\/surveys\/session\/([A-Za-z0-9-]+)(\/answer)?$/);
    if (sessionMatch) return this.handlePublicSessionRoute(request, sessionMatch[1], service, Boolean(sessionMatch[2]));
    const match = url.pathname.match(/^\/api\/public\/surveys\/([A-Za-z0-9_-]+)(?:\/(start|progress|submit|retry|next_question|previous_question|print))?$/);
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
    const firstQuestion = async () => (await service.call('survey.public.first_question', {
      survey_id: detail.id,
    }))?.question?.[0] || null;

    if (request.method === 'GET' && !operation) {
      const questions = (await service.call('survey.public.questions', { survey_id: detail.id }))?.questions || [];
      const explicitAnswerToken = url.searchParams.get('answer_token') || '';
      const cookieAnswerToken = explicitAnswerToken ? '' : this.surveyCookie(request, token);
      const answerToken = explicitAnswerToken || cookieAnswerToken;
      if (explicitAnswerToken && !this.isToken(explicitAnswerToken)) return this.json({ error: 'A valid answer token is required' }, 400);
      const answer = answerToken ? await readResponse(answerToken) : undefined;
      if (explicitAnswerToken && !answer) return this.json({ error: 'Survey response is unavailable' }, 404);
      if (answer && this.publicResponseExpired(answer)) return this.expiredResponse();
      return this.json({ survey: detail, questions, ...(answer ? { answer } : {}) });
    }
    if (request.method !== 'POST' || !operation) return this.json({ error: 'Method not allowed' }, 405);

    const body = await request.json().catch(() => ({})) as Record<string, any>;
    if (operation === 'start') {
      const explicitAnswerToken = String(body.answer_token || '');
      const cookieAnswerToken = explicitAnswerToken ? '' : this.surveyCookie(request, token);
      let existingToken = explicitAnswerToken || cookieAnswerToken;
      if (existingToken) {
        if (!this.isToken(existingToken)) {
          if (explicitAnswerToken) return this.json({ error: 'A valid answer token is required' }, 400);
          existingToken = '';
        }
        const answer = await readResponse(existingToken);
        if (!answer && explicitAnswerToken) return this.json({ error: 'Survey response is unavailable' }, 404);
        if (!answer) existingToken = '';
        if (answer && this.publicResponseExpired(answer)) return this.expiredResponse();
        if (answer?.state === 'Submitted') return this.withSurveyCookie(this.json({ error: 'This survey response is already submitted' }, 409), token, existingToken);
        if (answer?.state === 'New') {
          const question = await firstQuestion();
          if (!question) return this.json({ error: 'The first survey question is unavailable', code: 'SURVEY_PUBLIC_BEGIN_QUESTION' }, 422);
          try {
            const begun = await service.call('surveys.public.begin', {
              id: answer.id,
              survey_id: detail.id,
              access_token: existingToken,
              values: { state: 'In Progress', current_question_id: question.id },
              current_question_id: question.id,
            });
            return this.withSurveyCookie(this.json({ survey: detail, answer: begun }), token, existingToken);
          } catch (error: any) {
            // DuckDB can reject the losing writer before the winning
            // transaction is visible to the follow-up read. Retry the
            // token-scoped begin once, then replay the committed response.
            for (let attempt = 0; attempt < 3; attempt += 1) {
              await new Promise((resolve) => setTimeout(resolve, 10));
              const replay = await readResponse(existingToken);
              if (replay?.state === 'In Progress') return this.withSurveyCookie(this.json({ survey: detail, answer: replay, replayed: true }), token, existingToken);
              if (replay?.state !== 'New' || attempt === 2) break;
              try {
                const retried = await service.call('surveys.public.begin', {
                  id: answer.id,
                  survey_id: detail.id,
                  access_token: existingToken,
                  values: { state: 'In Progress', current_question_id: question.id },
                  current_question_id: question.id,
                });
                return this.withSurveyCookie(this.json({ survey: detail, answer: retried }), token, existingToken);
              } catch {
                // Another concurrent begin may still be committing; observe
                // it on the next iteration before surfacing the original error.
              }
            }
            throw error;
          }
        }
        if (answer && answer.state !== 'In Progress') return this.json({ error: 'This survey response is no longer available for editing' }, 409);
        if (answer) return this.withSurveyCookie(this.json({ survey: detail, answer }), token, existingToken);
      }
      const idempotencyKey = this.idempotencyKey(body.idempotency_key);
      if (idempotencyKey) {
        const existing = (await service.call('survey.public.response_by_idempotency_key', {
          idempotency_key: idempotencyKey,
          survey_id: detail.id,
        }))?.response?.[0];
        if (existing) return this.publicResponseExpired(existing) ? this.expiredResponse() : this.withSurveyCookie(this.json({ survey: detail, answer: existing }), token, String(existing.access_token || ''));
      }
      let result;
      try {
        const question = await firstQuestion();
        result = await service.call('surveys.public.start', {
          values: {
            survey_id: detail.id,
            survey_name: detail.name,
            answer_data: '{}',
            current_question_id: question?.id || null,
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
      return this.withSurveyCookie(this.json({ survey: detail, answer: result }), token, String(result.access_token || ''));
    }

    if (operation === 'next_question') {
      const answerToken = String(body.answer_token || '');
      if (!this.isToken(answerToken)) return this.json({ error: 'A valid answer token is required' }, 400);
      const response = await readResponse(answerToken);
      if (!response) return this.json({ error: 'Survey response is unavailable' }, 404);
      if (this.publicResponseExpired(response)) return this.expiredResponse();
      if (response.state !== 'In Progress') return this.json({ error: 'This survey response is no longer available for navigation', code: 'SURVEY_PUBLIC_NEXT_NOT_IN_PROGRESS' }, 409);
      const expectedQuestionId = String(body.expected_question_id || response.current_question_id || '');
      if (!expectedQuestionId) return this.json({ error: 'The current survey question is unavailable', code: 'SURVEY_PUBLIC_NEXT_STALE' }, 409);
      const navigationKey = this.idempotencyKey(body.navigation_key || body.idempotency_key);
      if (navigationKey) {
        const replay = (await service.call('survey.public.navigation_idempotency', {
          access_token: answerToken,
          survey_id: detail.id,
          navigation_key: navigationKey,
        }))?.response?.[0];
        if (replay) return this.json({ survey: detail, answer: replay, question: replay.current_question_id ? (await service.call('survey.public.current_question', { survey_id: detail.id, question_id: replay.current_question_id }))?.question?.[0] || null : null, replayed: true });
      }
      const next = (await service.call('survey.public.next_question', {
        survey_id: detail.id,
        current_question_id: expectedQuestionId,
      }))?.question?.[0];
      if (!next) return this.json({ error: 'The survey has reached the final question', code: 'SURVEY_PUBLIC_NEXT_EXHAUSTED' }, 409);
      try {
        const result = await service.call('surveys.public.next_question', {
          id: response.id,
          survey_id: detail.id,
          access_token: answerToken,
          expected_question_id: expectedQuestionId,
          current_question_id: next.id,
          navigation_key: navigationKey || `next:${response.id}:${next.id}`,
          values: { current_question_id: next.id, navigation_key: navigationKey || `next:${response.id}:${next.id}` },
        });
        return this.json({ survey: detail, answer: result, question: next, replayed: false });
      } catch (error: any) {
        // Two browser tabs can submit the same section-skipping transition at
        // once. If DuckDB rejects the losing writer before the winner is
        // visible, observe the token/key row and replay the committed cursor.
        for (let attempt = 0; attempt < 3 && navigationKey; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 10));
          const replay = (await service.call('survey.public.navigation_idempotency', {
            access_token: answerToken,
            survey_id: detail.id,
            navigation_key: navigationKey,
          }))?.response?.[0];
          if (replay) {
            const replayQuestion = replay.current_question_id
              ? (await service.call('survey.public.current_question', { survey_id: detail.id, question_id: replay.current_question_id }))?.question?.[0] || null
              : null;
            return this.json({ survey: detail, answer: replay, question: replayQuestion, replayed: true });
          }
        }
        return this.publicMutationError(error);
      }
    }

    if (operation === 'previous_question') {
      const answerToken = String(body.answer_token || '');
      if (!this.isToken(answerToken)) return this.json({ error: 'A valid answer token is required' }, 400);
      const response = await readResponse(answerToken);
      if (!response) return this.json({ error: 'Survey response is unavailable' }, 404);
      if (this.publicResponseExpired(response)) return this.expiredResponse();
      if (response.state !== 'In Progress') return this.json({ error: 'This survey response is no longer available for navigation', code: 'SURVEY_PUBLIC_PREVIOUS_NOT_IN_PROGRESS' }, 409);
      const expectedQuestionId = String(body.expected_question_id || response.current_question_id || '');
      if (!expectedQuestionId) return this.json({ error: 'The current survey question is unavailable', code: 'SURVEY_PUBLIC_PREVIOUS_STALE' }, 409);
      const navigationKey = this.idempotencyKey(body.navigation_key || body.idempotency_key);
      if (navigationKey) {
        const replay = (await service.call('survey.public.navigation_idempotency', {
          access_token: answerToken,
          survey_id: detail.id,
          navigation_key: navigationKey,
        }))?.response?.[0];
        if (replay) return this.json({ survey: detail, answer: replay, question: replay.current_question_id ? (await service.call('survey.public.current_question', { survey_id: detail.id, question_id: replay.current_question_id }))?.question?.[0] || null : null, replayed: true });
      }
      const previous = (await service.call('survey.public.previous_question', {
        survey_id: detail.id,
        current_question_id: expectedQuestionId,
      }))?.question?.[0];
      if (!previous) return this.json({ error: 'The survey is already at its first question', code: 'SURVEY_PUBLIC_PREVIOUS_EXHAUSTED' }, 409);
      try {
        const result = await service.call('surveys.public.previous_question', {
          id: response.id,
          survey_id: detail.id,
          access_token: answerToken,
          expected_question_id: expectedQuestionId,
          current_question_id: previous.id,
          navigation_key: navigationKey || `previous:${response.id}:${previous.id}`,
          values: { current_question_id: previous.id, navigation_key: navigationKey || `previous:${response.id}:${previous.id}` },
        });
        return this.json({ survey: detail, answer: result, question: previous, replayed: false });
      } catch (error: any) {
        return this.publicMutationError(error);
      }
    }

    if (operation === 'retry') {
      const sourceToken = String(body.answer_token || '');
      if (!this.isToken(sourceToken)) return this.json({ error: 'A valid answer token is required' }, 400);
      const source = (await service.call('survey.public.retry.source', {
        access_token: sourceToken,
        survey_id: detail.id,
      }))?.response?.[0];
      if (!source) return this.json({ error: 'Survey response is unavailable' }, 404);
      if (this.publicResponseExpired(source)) return this.expiredResponse();
      if (source.state !== 'Submitted') return this.json({ error: 'Only a submitted survey response can be retried', code: 'SURVEY_PUBLIC_RETRY_SOURCE_STATE' }, 409);
      const idempotencyKey = this.idempotencyKey(body.idempotency_key);
      if (idempotencyKey) {
        const existing = (await service.call('survey.public.retry.idempotency', {
          idempotency_key: idempotencyKey,
          survey_id: detail.id,
        }))?.response?.[0];
        if (existing) return this.json({ survey: detail, answer: existing, retry_of: source.id, replayed: true });
      }
      const count = Number((await service.call('survey.public.retry.count', {
        survey_id: detail.id,
        source_id: source.id,
      }))?.attempts?.[0]?.count || 0);
      const attempt = count + 1;
      const retryId = `retry-response-${source.id}-${attempt}`;
      const retryToken = `retry-answer-${source.access_token}-${attempt}`;
      try {
        const question = await firstQuestion();
        const answer = await service.call('surveys.public.retry', {
          values: {
            source_id: source.id,
            source_access_token: sourceToken,
            survey_token: token,
            id: retryId,
            survey_id: detail.id,
            survey_name: detail.name,
            respondent_name: source.respondent_name || null,
            respondent_email: source.respondent_email || null,
            answer_data: '{}',
            current_question_id: question?.id || null,
            access_token: retryToken,
            test_entry: source.test_entry || false,
            idempotency_key: idempotencyKey || null,
          },
        });
        return this.json({
          survey: detail,
          answer,
          retry_of: source.id,
          attempt_no: attempt,
          start_url: `/survey/start/${encodeURIComponent(token)}?answer_token=${encodeURIComponent(retryToken)}`,
          replayed: false,
        });
      } catch (error: any) {
        if (idempotencyKey) {
          const existing = (await service.call('survey.public.retry.idempotency', {
            idempotency_key: idempotencyKey,
            survey_id: detail.id,
          }))?.response?.[0];
          if (existing) return this.json({ survey: detail, answer: existing, retry_of: source.id, replayed: true });
        }
        return this.publicMutationError(error);
      }
    }

    const answerToken = String(body.answer_token || '');
    if (!this.isToken(answerToken)) return this.json({ error: 'A valid answer token is required' }, 400);
    const response = await readResponse(answerToken);
    if (!response) return this.json({ error: 'Survey response is unavailable' }, 404);
    if (this.publicResponseExpired(response)) return this.expiredResponse();
    const idempotencyKey = this.idempotencyKey(body.idempotency_key);
    if (response.state === 'Submitted') {
      if (idempotencyKey && response.idempotency_key === idempotencyKey) {
        return this.json({ survey: detail, answer: response });
      }
      return this.json({ error: 'This survey response is already submitted' }, 409);
    }
    if (response.state !== 'In Progress') return this.json({ error: 'This survey response is no longer available for editing' }, 409);
    const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
    const questions = (await service.call('survey.public.questions', { survey_id: detail.id }))?.questions || [];
    const invalidAnswers = this.invalidPublicAnswers(questions, answers);
    if (invalidAnswers.length) {
      return this.json({ error: `Invalid answers: ${invalidAnswers.join(', ')}`, code: 'SURVEY_PUBLIC_ANSWER_INVALID' }, 422);
    }
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
    const missingRequired = questions
      .filter((question: any) => question.required && (answers[question.id] === undefined || answers[question.id] === null || String(answers[question.id]).trim() === ''))
      .map((question: any) => question.question_text || question.id);
    if (missingRequired.length) return this.json({ error: `Required answers are missing: ${missingRequired.join(', ')}` }, 422);
    const scoring = await this.publicScore(service, detail.id, answers);
    try {
      const result = await service.call('surveys.public.submit', {
        id: response.id,
        survey_id: response.survey_id,
        access_token: answerToken,
        values: {
          answer_data: JSON.stringify(answers),
          ...(typeof body.respondent_name === 'string' ? { respondent_name: body.respondent_name.trim() } : {}),
          ...(typeof body.respondent_email === 'string' ? { respondent_email: body.respondent_email.trim() } : {}),
          ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
          score: scoring.score,
          quiz_passed: scoring.quiz_passed,
        },
      });
      return this.json({ survey: detail, answer: result });
    } catch (error: any) {
      if (idempotencyKey) {
        // DuckDB may reject the losing concurrent writer before the winner's
        // commit becomes visible. Observe the idempotency row and replay it.
        for (let attempt = 0; attempt < 3; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 10));
          const replay = (await service.call('survey.public.response_by_idempotency_key', {
            idempotency_key: idempotencyKey,
            survey_id: detail.id,
          }))?.response?.[0];
          if (replay?.state === 'Submitted') return this.json({ survey: detail, answer: replay, replayed: true });
        }
      }
      return this.publicMutationError(error);
    }
  }

  private async handlePublicSessionRoute(request: Request, sessionCode: string, service: PublicService, answerRoute = false): Promise<Response> {
    const session = (await service.call('survey.public.session', { session_code: sessionCode }))?.session?.[0];
    if (!session) return this.json({ error: 'The live session is unavailable', code: 'SURVEY_SESSION_NOT_FOUND' }, 404);
    if (session.session_state === 'Closed') return this.json({ error: 'The live session is no longer open', code: 'SURVEY_SESSION_CLOSED' }, 409);
    const question = session.session_state === 'In Progress'
      ? (await service.call('survey.public.session.question', { session_code: sessionCode }))?.question?.[0] || null
      : null;
    const attendeeToken = urlSearchToken(request.url);
    if (request.method === 'GET') {
      if (!attendeeToken) return this.json({ session, question });
      const attendee = (await service.call('survey.public.session.attendee_by_token', { session_code: sessionCode, attendee_token: attendeeToken }))?.attendee?.[0];
      if (!attendee) return this.json({ error: 'This attendee session is no longer available', code: 'SURVEY_SESSION_ATTENDEE_NOT_FOUND' }, 404);
      const answer = question
        ? (await service.call('survey.public.session.answer', { session_code: sessionCode, attendee_id: attendee.id }))?.answer?.[0] || null
        : null;
      return this.json({ session, question, attendee, answer });
    }
    if (request.method !== 'POST') return this.json({ error: 'Method not allowed' }, 405);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    if (answerRoute) {
      if (session.session_state !== 'In Progress' || !question) return this.json({ error: 'The live session is not accepting answers', code: 'SURVEY_SESSION_NOT_IN_PROGRESS' }, 409);
      const token = typeof body.attendee_token === 'string' ? body.attendee_token.trim() : '';
      const answerValue = typeof body.answer_value === 'string' || typeof body.answer_value === 'number'
        ? String(body.answer_value).trim()
        : '';
      if (!token || !answerValue) return this.json({ error: 'Select or enter an answer before submitting', code: 'SURVEY_SESSION_ANSWER_REQUIRED' }, 422);
      const attendee = (await service.call('survey.public.session.attendee_by_token', { session_code: sessionCode, attendee_token: token }))?.attendee?.[0];
      if (!attendee) return this.json({ error: 'This attendee session is no longer available', code: 'SURVEY_SESSION_ATTENDEE_NOT_FOUND' }, 404);
      const existing = (await service.call('survey.public.session.answer', { session_code: sessionCode, attendee_id: attendee.id }))?.answer?.[0];
      if (existing) return this.json({ session, question, attendee, answer: existing, replayed: true });
      try {
        const answer = await service.call('surveys.sessions.answer', {
          session_code: sessionCode,
          attendee_token: token,
          answer_value: answerValue,
        });
        return this.json({ session, question, attendee, answer, replayed: false });
      } catch (error: any) {
        return this.publicMutationError(error);
      }
    }
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

  private expiredResponse(): Response {
    return this.json({ error: 'This survey response has expired', code: 'SURVEY_PUBLIC_RESPONSE_EXPIRED' }, 410);
  }

  private publicResponseExpired(response: any): boolean {
    if (!response?.deadline) return false;
    const deadline = new Date(String(response.deadline).replace(' ', 'T') + (String(response.deadline).includes('Z') ? '' : 'Z'));
    return Number.isFinite(deadline.getTime()) && deadline.getTime() <= Date.now();
  }

  private invalidPublicAnswers(questions: any[], answers: Record<string, unknown>): string[] {
    const invalid: string[] = [];
    for (const question of questions) {
      const value = answers[question.id];
      const values = Array.isArray(value) ? value.map((entry) => String(entry).trim()) : [String(value ?? '').trim()];
      if (!values.some(Boolean)) continue;
      const options = String(question.answer_options || '').split(',').map((entry) => entry.trim()).filter(Boolean);
      const questionType = String(question.question_type || '');
      if (['Choice', 'Rating'].includes(questionType) && (values.length !== 1 || !options.includes(values[0]))) {
        invalid.push(String(question.question_text || question.id));
        continue;
      }
      if (questionType === 'Multiple Choice' && (!values.every((entry) => options.includes(entry)) || new Set(values).size !== values.length)) {
        invalid.push(String(question.question_text || question.id));
        continue;
      }
      if (['Numerical', 'Number'].includes(questionType) && (values.length !== 1 || !Number.isFinite(Number(values[0])))) {
        invalid.push(String(question.question_text || question.id));
      }
    }
    return invalid;
  }

  private async publicScore(service: PublicService, surveyId: string, answers: Record<string, unknown>): Promise<{ score: number; quiz_passed: boolean }> {
    const rows = (await service.call('survey.public.scoring_answers', { survey_id: surveyId }))?.answers || [];
    const grouped = new Map<string, any[]>();
    for (const row of rows) {
      const questionId = String(row.question_id || '');
      if (!questionId) continue;
      const entries = grouped.get(questionId) || [];
      entries.push(row);
      grouped.set(questionId, entries);
    }
    let possible = 0;
    let earned = 0;
    for (const [questionId, entries] of grouped) {
      const scored = entries.filter((row) => row.value != null && Number(row.score || 0) > 0);
      if (!scored.length) continue;
      const questionType = String(entries[0]?.question_type || '');
      const maximum = questionType === 'Multiple Choice'
        ? scored.reduce((sum, row) => sum + Number(row.score || 0), 0)
        : Math.max(...scored.map((row) => Number(row.score || 0)));
      possible += maximum;
      const raw = answers[questionId];
      const selected = Array.isArray(raw) ? raw.map((entry) => String(entry)) : raw == null ? [] : [String(raw)];
      if (questionType === 'Multiple Choice') {
        earned += scored.filter((row) => selected.includes(String(row.value))).reduce((sum, row) => sum + Number(row.score || 0), 0);
      } else {
        const match = scored.find((row) => String(row.value) === selected[0]);
        if (match) earned += Number(match.score || 0);
      }
    }
    const score = possible > 0 ? Math.round((earned / possible) * 10000) / 100 : 0;
    return { score, quiz_passed: possible > 0 && score >= 80 };
  }

  private isToken(value: string): boolean {
    return /^[A-Za-z0-9-]{16,100}$/.test(value);
  }

  private idempotencyKey(value: unknown): string {
    const key = typeof value === 'string' ? value.trim() : '';
    return key && key.length <= 200 ? key : '';
  }

  private surveyCookie(request: Request, surveyToken: string): string {
    const cookie = request.headers.get('cookie') || '';
    const name = `survey_${surveyToken}`;
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const value = cookie.match(new RegExp(`(?:^|;\\s*)${escapedName}=([^;]+)`))?.[1] || '';
    try {
      return decodeURIComponent(value).trim();
    } catch {
      return value.trim();
    }
  }

  private withSurveyCookie(response: Response, surveyToken: string, answerToken: string): Response {
    if (this.isToken(answerToken)) response.headers.set('Set-Cookie', `survey_${surveyToken}=${encodeURIComponent(answerToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    return response;
  }

  private json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

function urlSearchToken(rawUrl: string): string {
  return new URL(rawUrl).searchParams.get('attendee_token')?.trim() || '';
}

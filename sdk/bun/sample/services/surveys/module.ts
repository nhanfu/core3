import { loadYamlServiceManifest, YamlServiceModule } from '@core3/server/yaml-service';
import type { ModuleContext, ModuleLifecycle } from '@core3/server/module';

type PublicService = { call(operation: string, request?: Record<string, unknown>): Promise<any> };

const PUBLIC_SURVEY_BACKGROUND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-label="Survey background"><defs><linearGradient id="survey-background" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f1e8f0"/><stop offset="0.52" stop-color="#e5eef4"/><stop offset="1" stop-color="#f7e8dd"/></linearGradient></defs><rect width="1600" height="900" fill="url(#survey-background)"/><circle cx="1260" cy="160" r="260" fill="#ffffff" fill-opacity=".24"/><circle cx="240" cy="780" r="320" fill="#ffffff" fill-opacity=".2"/></svg>`;

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

  getRuntimeContext() {
    return this.delegate?.getRuntimeContext() || null;
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
    const questionImageMatch = url.pathname.match(/^\/api\/public\/surveys\/([A-Za-z0-9_-]+)\/question-image\/([A-Za-z0-9-]+)\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)$/);
    if (questionImageMatch) return this.handlePublicQuestionImageRoute(request, questionImageMatch[1], questionImageMatch[2], questionImageMatch[3], questionImageMatch[4], service);
    const backgroundMatch = url.pathname.match(/^\/api\/public\/surveys\/([A-Za-z0-9_-]+)\/background$/);
    if (backgroundMatch) return this.handlePublicBackgroundRoute(request, backgroundMatch[1], service);
    const sessionMatch = url.pathname.match(/^\/api\/public\/surveys\/session\/([A-Za-z0-9-]+)(\/(answer|poll))?$/);
    if (sessionMatch) return this.handlePublicSessionRoute(request, sessionMatch[1], service, sessionMatch[3] === 'answer', sessionMatch[3] === 'poll');
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
    const publicAccessError = async (answerToken: string): Promise<Response | null> => {
      if (String(detail.access_mode || 'public') !== 'token') return null;
      if (!answerToken || !this.isToken(answerToken)) {
        return this.json({ error: 'An invitation answer token is required to access this survey.', code: 'SURVEY_PUBLIC_TOKEN_REQUIRED' }, 403);
      }
      const response = (await service.call('survey.public.access', {
        survey_token: token,
        answer_token: answerToken,
      }))?.response?.[0];
      if (!response) return this.json({ error: 'This survey invitation is no longer available.', code: 'SURVEY_PUBLIC_TOKEN_WRONG' }, 404);
      return null;
    };
    const orderedQuestions = async (answerData = '', questionOrder = '', seed = token) => {
      const allQuestions = await this.questionSettings(service, detail.id, (await service.call('survey.public.questions', { survey_id: detail.id }))?.questions || []);
      const visible = this.visibleQuestions(allQuestions, answerData);
      return String(detail.questions_selection || 'all') === 'random'
        ? this.orderPublicQuestions(visible, questionOrder, seed)
        : visible;
    };

    if (request.method === 'GET' && !operation) {
      const explicitAnswerToken = url.searchParams.get('answer_token') || '';
      const cookieAnswerToken = explicitAnswerToken ? '' : this.surveyCookie(request, token);
      const answerToken = explicitAnswerToken || cookieAnswerToken;
      if (explicitAnswerToken && !this.isToken(explicitAnswerToken)) return this.json({ error: 'A valid answer token is required' }, 400);
      const accessError = await publicAccessError(answerToken);
      if (accessError) return accessError;
      const answer = answerToken ? await readResponse(answerToken) : undefined;
      if (explicitAnswerToken && !answer) return this.json({ error: 'Survey response is unavailable' }, 404);
      if (answer && this.publicAttemptExpired(detail, answer)) return this.expiredResponse(detail, answer);
      const questions = await orderedQuestions(answer?.answer_data, answer?.question_order || '', answer?.access_token || token);
      return this.json({ survey: detail, questions, ...(answer ? { answer } : {}) });
    }
    if (request.method !== 'POST' || !operation) return this.json({ error: 'Method not allowed' }, 405);

    const body = await request.json().catch(() => ({})) as Record<string, any>;
    if (operation === 'start') {
      const requestedLanguage = this.normalizeLanguage(body.language_code);
      const languageError = this.publicLanguageError(detail, requestedLanguage);
      if (languageError) return languageError;
      const explicitAnswerToken = String(body.answer_token || '');
      const cookieAnswerToken = explicitAnswerToken ? '' : this.surveyCookie(request, token);
      let existingToken = explicitAnswerToken || cookieAnswerToken;
      const accessError = await publicAccessError(existingToken);
      if (accessError) return accessError;
      if (existingToken) {
        if (!this.isToken(existingToken)) {
          if (explicitAnswerToken) return this.json({ error: 'A valid answer token is required' }, 400);
          existingToken = '';
        }
        const answer = await readResponse(existingToken);
        if (!answer && explicitAnswerToken) return this.json({ error: 'Survey response is unavailable' }, 404);
        if (!answer) existingToken = '';
        if (answer && this.publicAttemptExpired(detail, answer)) return this.expiredResponse(detail, answer);
        if (answer?.language_code && requestedLanguage && answer.language_code !== requestedLanguage) {
          return this.json({ error: 'The response language is already fixed', code: 'SURVEY_PUBLIC_LANGUAGE_LOCKED' }, 409);
        }
        if (answer?.state === 'Submitted') return this.withSurveyCookie(this.json({ error: 'This survey response is already submitted' }, 409), token, existingToken);
        if (answer?.state === 'New') {
          const languageCode = answer.language_code || this.selectedLanguage(detail, requestedLanguage);
          const questionOrder = String(answer?.question_order || '');
          const order = await orderedQuestions(answer?.answer_data || '', questionOrder, existingToken);
          const persistedQuestionOrder = questionOrder || (String(detail.questions_selection || 'all') === 'random' ? order.map((candidate: any) => candidate.id).join('||') : '');
          const question = order[0] || null;
          if (!question) return this.json({ error: 'The first survey question is unavailable', code: 'SURVEY_PUBLIC_BEGIN_QUESTION' }, 422);
          try {
            const begun = await service.call('surveys.public.begin', {
              id: answer.id,
              survey_id: detail.id,
              access_token: existingToken,
              values: { state: 'In Progress', current_question_id: question.id, question_order: persistedQuestionOrder || null, language_code: languageCode || null, start_datetime: new Date().toISOString() },
              current_question_id: question.id,
              question_order: persistedQuestionOrder || null,
              language_code: languageCode || null,
              start_datetime: new Date().toISOString(),
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
                  values: { state: 'In Progress', current_question_id: question.id, question_order: persistedQuestionOrder || null, language_code: languageCode || null, start_datetime: new Date().toISOString() },
                  current_question_id: question.id,
                  question_order: persistedQuestionOrder || null,
                  language_code: languageCode || null,
                  start_datetime: new Date().toISOString(),
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
        if (existing) return this.publicAttemptExpired(detail, existing) ? this.expiredResponse(detail, existing) : this.withSurveyCookie(this.json({ survey: detail, answer: existing }), token, String(existing.access_token || ''));
      }
      const respondentEmail = typeof body.respondent_email === 'string' ? body.respondent_email.trim().toLowerCase() : '';
      const attemptError = await this.publicAttemptError(detail, respondentEmail, service);
      if (attemptError) return attemptError;
      let result;
      try {
        const accessToken = crypto.randomUUID();
        const order = await orderedQuestions('', '', accessToken);
        const questionOrder = String(detail.questions_selection || 'all') === 'random' ? order.map((candidate: any) => candidate.id).join('||') : null;
        const question = order[0] || null;
        result = await service.call('surveys.public.start', {
          values: {
            survey_id: detail.id,
            survey_name: detail.name,
            respondent_email: respondentEmail || null,
            language_code: this.selectedLanguage(detail, requestedLanguage) || null,
            answer_data: '{}',
            current_question_id: question?.id || null,
            access_token: accessToken,
            question_order: questionOrder,
            idempotency_key: idempotencyKey || null,
            start_datetime: new Date().toISOString(),
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
      if (this.publicAttemptExpired(detail, response)) return this.expiredResponse(detail, response);
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
      const answers = this.parseAnswerData(response.answer_data);
      let next;
      if (String(detail.questions_selection || 'all') === 'random') {
        const order = await orderedQuestions(response.answer_data, response.question_order || '', answerToken);
        const currentIndex = order.findIndex((candidate: any) => candidate.id === expectedQuestionId);
        next = currentIndex >= 0 ? order[currentIndex + 1] : null;
      } else {
        next = (await service.call('survey.public.next_question', {
          survey_id: detail.id,
          current_question_id: expectedQuestionId,
        }))?.question?.[0];
        while (next && !this.isQuestionVisible(next, answers)) {
          next = (await service.call('survey.public.next_question', {
            survey_id: detail.id,
            current_question_id: next.id,
          }))?.question?.[0];
        }
      }
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
      if (this.publicAttemptExpired(detail, response)) return this.expiredResponse(detail, response);
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
      const answers = this.parseAnswerData(response.answer_data);
      let previous;
      if (String(detail.questions_selection || 'all') === 'random') {
        const order = await orderedQuestions(response.answer_data, response.question_order || '', answerToken);
        const currentIndex = order.findIndex((candidate: any) => candidate.id === expectedQuestionId);
        previous = currentIndex > 0 ? order[currentIndex - 1] : null;
      } else {
        previous = (await service.call('survey.public.previous_question', {
          survey_id: detail.id,
          current_question_id: expectedQuestionId,
        }))?.question?.[0];
        while (previous && !this.isQuestionVisible(previous, answers)) {
          previous = (await service.call('survey.public.previous_question', {
            survey_id: detail.id,
            current_question_id: previous.id,
          }))?.question?.[0];
        }
      }
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
        const retryOrder = await orderedQuestions('', '', retryToken);
        const questionOrder = String(detail.questions_selection || 'all') === 'random' ? retryOrder.map((candidate: any) => candidate.id).join('||') : null;
        const question = retryOrder[0] || null;
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
            language_code: source.language_code || this.selectedLanguage(detail, '') || null,
            answer_data: '{}',
            current_question_id: question?.id || null,
            question_order: questionOrder,
            access_token: retryToken,
            test_entry: source.test_entry || false,
            idempotency_key: idempotencyKey || null,
            start_datetime: new Date().toISOString(),
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
    if (this.publicAttemptExpired(detail, response)) return this.expiredResponse(detail, response);
    const idempotencyKey = this.idempotencyKey(body.idempotency_key);
    if (response.state === 'Submitted') {
      if (idempotencyKey && response.idempotency_key === idempotencyKey) {
        return this.json({ survey: detail, answer: response });
      }
      return this.json({ error: 'This survey response is already submitted' }, 409);
    }
    if (response.state !== 'In Progress') return this.json({ error: 'This survey response is no longer available for editing' }, 409);
    const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
    const allQuestions = await this.questionSettings(service, detail.id, (await service.call('survey.public.questions', { survey_id: detail.id }))?.questions || []);
    const skippedFieldProvided = Object.prototype.hasOwnProperty.call(body, 'skipped_questions');
    const requestedSkippedQuestions = skippedFieldProvided
      ? this.parseSkippedQuestions(body.skipped_questions)
      : this.parseSkippedQuestions(response.skipped_questions);
    const questionById = new Map(allQuestions.map((question: any) => [String(question.id), question]));
    const invalidSkippedQuestion = requestedSkippedQuestions.find((questionId) => {
      const question = questionById.get(questionId);
      return !question || Boolean(question.required);
    });
    if (invalidSkippedQuestion) {
      return this.json({ error: 'Only existing optional questions can be skipped', code: 'SURVEY_PUBLIC_SKIP_INVALID' }, 422);
    }
    const skippedQuestions = requestedSkippedQuestions.filter((questionId) => {
      const value = answers[questionId];
      return value === undefined || value === null || (Array.isArray(value) ? value.length === 0 : !String(value).trim());
    });
    const questions = this.visibleQuestions(allQuestions, JSON.stringify(answers));
    const invalidAnswers = this.invalidPublicAnswers(questions, answers);
    if (invalidAnswers.length) {
      return this.json({ error: `Invalid answers: ${invalidAnswers.join(', ')}`, code: 'SURVEY_PUBLIC_ANSWER_INVALID' }, 422);
    }
    if (operation === 'progress') {
      try {
        const identity = this.respondentIdentity(questions, answers);
        const result = await service.call('surveys.public.progress', {
          id: response.id,
          survey_id: detail.id,
          access_token: answerToken,
          values: { answer_data: JSON.stringify(answers), skipped_questions: skippedQuestions.join('||'), ...identity },
        });
        return this.json({ survey: detail, answer: result });
      } catch (error: any) {
        return this.publicMutationError(error);
      }
    }
    const missingRequired = questions
      .filter((question: any) => {
        const value = answers[question.id];
        const comment = String(answers[`${question.id}__comment`] ?? '').trim();
        const commentCounts = question.comments_allowed && question.comment_count_as_answer && comment;
        const empty = value === undefined || value === null || (Array.isArray(value) ? value.length === 0 : !String(value).trim());
        return question.required && empty && !commentCounts;
      })
      .map((question: any) => question.question_text || question.id);
    if (missingRequired.length) return this.json({ error: `Required answers are missing: ${missingRequired.join(', ')}` }, 422);
    const scoring = await this.publicScore(service, detail.id, answers);
    try {
      const identity = this.respondentIdentity(questions, answers);
      const result = await service.call('surveys.public.submit', {
        id: response.id,
        survey_id: response.survey_id,
        access_token: answerToken,
        values: {
          answer_data: JSON.stringify(answers),
          skipped_questions: skippedQuestions.join('||'),
          ...(typeof body.respondent_name === 'string' ? { respondent_name: body.respondent_name.trim() } : {}),
          ...(typeof body.respondent_email === 'string' ? { respondent_email: body.respondent_email.trim() } : {}),
          ...identity,
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

  private async handlePublicBackgroundRoute(request: Request, token: string, service: PublicService): Promise<Response> {
    if (request.method !== 'GET') return this.json({ error: 'Method not allowed' }, 405);
    if (!this.isToken(token)) return this.json({ error: 'A valid survey token is required' }, 400);
    const background = (await service.call('survey.public.background', { access_token: token }))?.background?.[0];
    if (!background) return this.json({ error: 'Survey background is unavailable' }, 404);
    return new Response(String(background.background_image_content || PUBLIC_SURVEY_BACKGROUND_SVG), {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  private async handlePublicQuestionImageRoute(request: Request, surveyToken: string, answerToken: string, questionId: string, suggestedAnswerId: string, service: PublicService): Promise<Response> {
    if (request.method !== 'GET') return this.json({ error: 'Method not allowed' }, 405);
    if (!this.isToken(surveyToken) || !this.isToken(answerToken)) return this.json({ error: 'Valid survey and answer tokens are required' }, 400);
    const image = (await service.call('survey.public.question_image', {
      survey_token: surveyToken,
      answer_token: answerToken,
      question_id: questionId,
      suggested_answer_id: suggestedAnswerId,
    }))?.question_image?.[0];
    if (!image) return this.json({ error: 'Suggested answer image is unavailable' }, 404);
    return new Response(String(image.value_image_content), {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' },
    });
  }

  private async handlePublicSessionRoute(request: Request, sessionCode: string, service: PublicService, answerRoute = false, pollRoute = false): Promise<Response> {
    if (pollRoute && request.method !== 'GET') return this.json({ error: 'Method not allowed' }, 405);
    const sessionOperation = pollRoute ? 'survey.public.session.poll' : 'survey.public.session';
    const session = (await service.call(sessionOperation, { session_code: sessionCode }))?.session?.[0];
    if (!session) return this.json({ error: 'The live session is unavailable', code: 'SURVEY_SESSION_NOT_FOUND' }, 404);
    if (session.session_state === 'Closed') return this.json({ error: 'The live session is no longer open', code: 'SURVEY_SESSION_CLOSED' }, 409);
    const question = session.session_state === 'In Progress'
      ? (await service.call('survey.public.session.question', { session_code: sessionCode }))?.question?.[0] || null
      : null;
    const attendeeToken = urlSearchToken(request.url);
    if (request.method === 'GET') {
      if (pollRoute && !attendeeToken) return this.json({ error: 'An attendee token is required to poll this live session', code: 'SURVEY_SESSION_ATTENDEE_TOKEN_REQUIRED' }, 401);
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

  private parseAnswerData(value: unknown): Record<string, unknown> {
    if (typeof value !== 'string' || !value.trim()) return {};
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  private parseSkippedQuestions(value: unknown): string[] {
    if (Array.isArray(value)) return [...new Set(value.map((entry) => String(entry).trim()).filter(Boolean))];
    return [...new Set(String(value || '').split('||').map((entry) => entry.trim()).filter(Boolean))];
  }

  private normalizeLanguage(value: unknown): string {
    return typeof value === 'string' ? value.trim().replace(/[^A-Za-z0-9_-]/g, '') : '';
  }

  private supportedLanguages(detail: any): string[] {
    return [...new Set(String(detail?.languages || '').split('||').map((entry) => this.normalizeLanguage(entry)).filter(Boolean))];
  }

  private selectedLanguage(detail: any, requested: string): string {
    const supported = this.supportedLanguages(detail);
    return requested || supported[0] || '';
  }

  private publicLanguageError(detail: any, requested: string): Response | null {
    if (!requested) return null;
    const supported = this.supportedLanguages(detail);
    if (supported.length > 0 && !supported.includes(requested)) {
      return this.json({ error: 'Choose a language supported by this survey.', code: 'SURVEY_PUBLIC_LANGUAGE_INVALID' }, 422);
    }
    return null;
  }

  private isQuestionVisible(question: any, answers: Record<string, unknown>): boolean {
    const sourceQuestionId = String(question?.trigger_question_id || '').trim();
    if (!sourceQuestionId) return true;
    const expectedAnswer = String(question?.trigger_answer || '').trim();
    const value = answers[sourceQuestionId];
    if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).includes(expectedAnswer);
    return String(value ?? '').trim() === expectedAnswer;
  }

  private visibleQuestions(questions: any[], answerData: unknown): any[] {
    const answers = this.parseAnswerData(answerData);
    return questions.filter((question) => this.isQuestionVisible(question, answers));
  }

  private orderPublicQuestions(questions: any[], questionOrder: string, seed: string): any[] {
    const byId = new Map(questions.map((question) => [String(question.id), question]));
    const orderedIds = String(questionOrder || '').split('||').map((id) => id.trim()).filter(Boolean);
    if (orderedIds.length) {
      const used = new Set<string>();
      const ordered = orderedIds.map((id) => {
        const question = byId.get(id);
        if (!question || used.has(id)) return null;
        used.add(id);
        return question;
      }).filter(Boolean);
      return [...ordered, ...questions.filter((question) => !used.has(String(question.id)))];
    }
    return [...questions].sort((left, right) => {
      const leftHash = this.publicQuestionHash(`${seed}:${left.id}`);
      const rightHash = this.publicQuestionHash(`${seed}:${right.id}`);
      return leftHash - rightHash || String(left.id).localeCompare(String(right.id));
    });
  }

  private publicQuestionHash(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private async questionSettings(service: PublicService, surveyId: string, questions: any[]): Promise<any[]> {
    const settings = (await service.call('survey.public.comment_settings', { survey_id: surveyId }))?.comment_settings || [];
    const identity = (await service.call('survey.public.identity_settings', { survey_id: surveyId }))?.identity_settings || [];
    const byId = new Map(settings.map((setting: any) => [String(setting.id), setting]));
    for (const setting of identity) {
      byId.set(String(setting.id), { ...(byId.get(String(setting.id)) || {}), ...setting });
    }
    return questions.map((question) => ({ ...question, ...(byId.get(String(question.id)) || {}) }));
  }

  private respondentIdentity(questions: any[], answers: Record<string, unknown>): { respondent_name?: string; respondent_email?: string } {
    const identity: { respondent_name?: string; respondent_email?: string } = {};
    for (const question of questions) {
      const raw = answers[question.id];
      const value = Array.isArray(raw) ? raw.map((entry) => String(entry).trim()).filter(Boolean).join(', ') : String(raw ?? '').trim();
      if (!value) continue;
      if (question.save_as_email) identity.respondent_email = value;
      if (question.save_as_nickname) identity.respondent_name = value;
    }
    return identity;
  }

  private expiredResponse(detail?: any, response?: any): Response {
    if (detail && response && this.publicSurveyTimeExpired(detail, response)) {
      return this.json({ error: "This survey's time limit has expired", code: 'SURVEY_PUBLIC_TIME_LIMIT_EXPIRED' }, 410);
    }
    return this.json({ error: 'This survey response has expired', code: 'SURVEY_PUBLIC_RESPONSE_EXPIRED' }, 410);
  }

  private publicResponseExpired(response: any): boolean {
    if (!response?.deadline) return false;
    const deadline = new Date(String(response.deadline).replace(' ', 'T') + (String(response.deadline).includes('Z') ? '' : 'Z'));
    return Number.isFinite(deadline.getTime()) && deadline.getTime() <= Date.now();
  }

  private publicAttemptExpired(detail: any, response: any): boolean {
    return this.publicResponseExpired(response) || this.publicSurveyTimeExpired(detail, response);
  }

  private async publicAttemptError(detail: any, respondentEmail: string, service: PublicService): Promise<Response | null> {
    const limited = Boolean(detail?.is_attempts_limited)
      && (String(detail?.access_mode || 'public') !== 'public' || Boolean(detail?.users_login_required));
    if (!limited) return null;
    if (!respondentEmail) return this.json({ error: 'Enter an email address before starting this survey.', code: 'SURVEY_PUBLIC_LOGIN_REQUIRED' }, 401);
    const attempts = Number((await service.call('survey.public.attempts', {
      survey_id: detail.id,
      respondent_email: respondentEmail,
    }))?.attempts?.[0]?.count || 0);
    if (attempts >= Number(detail.attempts_limit || 1)) {
      return this.json({ error: 'You have no attempts left for this survey.', code: 'SURVEY_PUBLIC_ATTEMPTS_EXHAUSTED' }, 409);
    }
    return null;
  }

  private publicSurveyTimeExpired(detail: any, response: any): boolean {
    if (!detail?.is_time_limited || !response?.start_datetime || Number(detail.time_limit) <= 0) return false;
    const raw = String(response.start_datetime);
    const startedAt = new Date(raw.replace(' ', 'T') + (raw.includes('Z') ? '' : 'Z'));
    return Number.isFinite(startedAt.getTime()) && startedAt.getTime() + Number(detail.time_limit) * 60_000 <= Date.now();
  }

  private invalidPublicAnswers(questions: any[], answers: Record<string, unknown>): string[] {
    const invalid: string[] = [];
    for (const question of questions) {
      const value = answers[question.id];
      const values = Array.isArray(value) ? value.map((entry) => String(entry).trim()) : [String(value ?? '').trim()];
      const comment = String(answers[`${question.id}__comment`] ?? '').trim();
      if (comment && !question.comments_allowed) {
        invalid.push(String(question.question_text || question.id));
        continue;
      }
      if (!values.some(Boolean)) continue;
      const options = String(question.answer_options || '').split(',').map((entry) => entry.trim()).filter(Boolean);
      const questionType = String(question.question_type || '');
      if (questionType === 'Matrix') {
        const matrix = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
        const rows = String(question.matrix_rows || '').split('||').map((entry) => entry.trim()).filter(Boolean);
        const columns = String(question.matrix_columns || '').split('||').map((entry) => entry.trim()).filter(Boolean);
        const matrixRows = matrix ? Object.keys(matrix) : [];
        if (!matrix || matrixRows.length === 0) {
          if (question.required) invalid.push(String(question.question_text || question.id));
          continue;
        }
        const validRows = matrixRows.every((row) => rows.includes(row));
        const validSelections = validRows && matrixRows.every((row) => {
          const selection = matrix?.[row];
          const selected = Array.isArray(selection) ? selection.map((entry) => String(entry).trim()).filter(Boolean) : [];
          return selected.length > 0 && new Set(selected).size === selected.length && selected.every((entry) => columns.includes(entry));
        });
        if (!validRows || !validSelections || (question.required && (matrixRows.length !== rows.length || rows.some((row) => !matrixRows.includes(row))))) {
          invalid.push(String(question.question_text || question.id));
        }
        continue;
      }
      if (['Choice', 'Rating', 'Scale'].includes(questionType) && (values.length !== 1 || !options.includes(values[0]))) {
        invalid.push(String(question.question_text || question.id));
        continue;
      }
      if (questionType === 'Multiple Choice' && (!values.every((entry) => options.includes(entry)) || new Set(values).size !== values.length)) {
        invalid.push(String(question.question_text || question.id));
        continue;
      }
      if (['Char', 'Char Box'].includes(questionType)) {
        const textValue = values[0] || '';
        const minimum = Number(question.validation_length_min);
        const maximum = Number(question.validation_length_max);
        const invalidEmail = question.validation_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(textValue);
        const invalidLength = question.validation_required
          && Number.isFinite(minimum)
          && Number.isFinite(maximum)
          && (textValue.length < minimum || textValue.length > maximum);
        if (values.length !== 1 || invalidEmail || invalidLength) {
          invalid.push(String(question.question_text || question.id));
        }
      }
      if (['Text', 'Text Box'].includes(questionType) && Array.isArray(value)) {
        invalid.push(String(question.question_text || question.id));
      }
      if (['Numerical', 'Number'].includes(questionType)) {
        const numericValue = Number(values[0]);
        const minimum = Number(question.validation_min_float_value);
        const maximum = Number(question.validation_max_float_value);
        const outOfRange = question.validation_required
          && Number.isFinite(minimum)
          && Number.isFinite(maximum)
          && (numericValue < minimum || numericValue > maximum);
        if (values.length !== 1 || !Number.isFinite(numericValue) || outOfRange) {
          invalid.push(String(question.question_text || question.id));
        }
      }
      if (['Date', 'date'].includes(questionType) && (values.length !== 1 || !this.isIsoDate(values[0]))) {
        invalid.push(String(question.question_text || question.id));
      }
      if (['Datetime', 'datetime'].includes(questionType) && (values.length !== 1 || !this.isIsoDatetime(values[0]))) {
        invalid.push(String(question.question_text || question.id));
      }
    }
    return invalid;
  }

  private isIsoDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime())
      && parsed.getUTCFullYear() === Number(value.slice(0, 4))
      && parsed.getUTCMonth() + 1 === Number(value.slice(5, 7))
      && parsed.getUTCDate() === Number(value.slice(8, 10));
  }

  private isIsoDatetime(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) return false;
    const parsed = new Date(value.replace(' ', 'T') + 'Z');
    return Number.isFinite(parsed.getTime())
      && parsed.getUTCFullYear() === Number(value.slice(0, 4))
      && parsed.getUTCMonth() + 1 === Number(value.slice(5, 7))
      && parsed.getUTCDate() === Number(value.slice(8, 10))
      && parsed.getUTCHours() === Number(value.slice(11, 13))
      && parsed.getUTCMinutes() === Number(value.slice(14, 16))
      && parsed.getUTCSeconds() === Number(value.slice(17, 19));
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

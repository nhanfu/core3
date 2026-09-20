type SurveyQuestion = {
  id: string;
  question_text: string;
  question_type: string;
  sequence: number;
  required: boolean;
  answer_options?: string;
  matrix_rows?: string;
  matrix_columns?: string;
  matrix_subtype?: string;
  trigger_question_id?: string | null;
  trigger_answer?: string | null;
  comments_allowed?: boolean;
  comments_message?: string | null;
  comment_count_as_answer?: boolean;
};

type SurveyPayload = {
  survey: { id?: string; title: string; name: string; description?: string; description_done?: string };
  questions: SurveyQuestion[];
  answer?: {
    id: string;
    access_token: string;
    state: string;
    current_question_id?: string | null;
    test_entry?: boolean;
    answer_data?: string;
    score?: number | null;
    quiz_passed?: boolean | null;
  };
};

const STYLE_ID = 'core3-public-survey-style';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character));
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    body.core3-public-survey-body { margin:0; }
    .core3-public-survey { min-height:100vh; box-sizing:border-box; padding:0 12px; background:#fff; color:#2f2930; font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    .core3-public-survey__card { width:min(696px,100%); margin:0 auto; background:#fff; border-radius:0; overflow:visible; }
    .core3-public-survey__top { padding:38vh 0 0; }
    .core3-public-survey__brand { display:none; }
    .core3-public-survey__title { margin:0 0 16px; font-size:clamp(28px,3vw,34px); line-height:1.2; font-weight:400; color:#30262d; }
    .core3-public-survey__code { display:none; }
    .core3-public-survey__body { padding:0; }
    .core3-public-survey__description { color:#625a61; line-height:1.65; white-space:pre-wrap; }
    .core3-public-survey__question { margin:0 0 24px; font-size:clamp(20px,3vw,28px); line-height:1.35; font-weight:500; color:#30262d; }
    .core3-public-survey__required { color:#b45262; font-size:13px; margin-left:5px; }
    .core3-public-survey__options { display:grid; gap:10px; }
    .core3-public-survey__option { display:flex; align-items:center; gap:12px; padding:13px 14px; border:1px solid #d9d1d7; border-radius:5px; cursor:pointer; transition:border-color .15s,background .15s; }
    .core3-public-survey__option:hover { border-color:#714b67; background:#faf7f9; }
    .core3-public-survey__option input { accent-color:#714b67; width:17px; height:17px; }
    .core3-public-survey__matrix-wrap { overflow-x:auto; border:1px solid #d9d1d7; }
    .core3-public-survey__matrix { width:100%; min-width:620px; border-collapse:collapse; font-size:14px; }
    .core3-public-survey__matrix th, .core3-public-survey__matrix td { padding:12px 10px; border-bottom:1px solid #eee7eb; text-align:center; vertical-align:middle; }
    .core3-public-survey__matrix th:first-child { width:42%; text-align:left; font-weight:500; }
    .core3-public-survey__matrix input { accent-color:#714b67; width:17px; height:17px; }
    .core3-public-survey__input { width:100%; box-sizing:border-box; border:0; border-bottom:1px solid #aaa0a8; padding:12px 2px; font:inherit; font-size:17px; outline:0; }
    .core3-public-survey__input:focus { border-bottom:2px solid #714b67; }
    .core3-public-survey__comment { display:grid; gap:6px; margin-top:18px; color:#625a61; font-size:14px; }
    .core3-public-survey__footer { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:26px; }
    .core3-public-survey__footer-actions { display:flex; align-items:center; gap:10px; }
    .core3-public-survey__progress { color:#796f78; font-size:13px; }
    .core3-public-survey__button { border:0; border-radius:4px; padding:12px 25px; color:#fff; background:#714b67; font:600 15px inherit; cursor:pointer; }
    .core3-public-survey__button:hover { background:#5d3c55; }
    .core3-public-survey__button:disabled { opacity:.55; cursor:wait; }
    .core3-public-survey__error { padding:12px 14px; border:1px solid #e6b9c0; border-radius:4px; color:#8b3041; background:#fff4f5; }
    .core3-public-survey__test-banner { margin:0 -12px 24px; padding:10px 14px; color:#5b4c12; background:#fff3cd; border:1px solid #f1df9a; font-size:14px; text-align:center; }
    .core3-public-survey__test-banner a { margin-left:8px; color:#684c00; font-weight:600; text-decoration:underline; }
    .core3-public-survey__done { text-align:center; padding:32px 0 16px; }
    .core3-public-survey__done-mark { display:inline-grid; place-items:center; width:52px; height:52px; border-radius:50%; color:#fff; background:#55956d; font-size:28px; }
    @media (max-width:520px) { .core3-public-survey { padding:0 12px; } .core3-public-survey__card { min-height:100vh; } .core3-public-survey__top { padding-top:38vh; } .core3-public-survey__footer { align-items:flex-end; } }
  `;
  document.head.append(style);
}

function answerValue(container: HTMLElement, question: SurveyQuestion): string | string[] | Record<string, string[]> {
  if (question.question_type === 'Matrix') {
    const answer: Record<string, string[]> = {};
    for (const row of [...container.querySelectorAll<HTMLElement>('[data-matrix-row]')]) {
      answer[row.dataset.matrixRow || ''] = [...row.querySelectorAll<HTMLInputElement>('input:checked')].map((input) => input.value);
    }
    return answer;
  }
  if (question.question_type === 'Multiple Choice') {
    return [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')].map((input) => input.value);
  }
  return container.querySelector<HTMLInputElement | HTMLTextAreaElement>('input:not([type="radio"]):not([type="checkbox"]), textarea')?.value
    || container.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.value
    || '';
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime())
    && parsed.getUTCFullYear() === Number(value.slice(0, 4))
    && parsed.getUTCMonth() + 1 === Number(value.slice(5, 7))
    && parsed.getUTCDate() === Number(value.slice(8, 10));
}

function isIsoDatetime(value: string): boolean {
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

function renderQuestion(container: HTMLElement, question: SurveyQuestion, index: number, total: number, answer: string | string[] | Record<string, string[]> = '', comment = '') {
  const options = String(question.answer_options || '').split(',').map((value) => value.trim()).filter(Boolean);
  const matrixRows = String(question.matrix_rows || '').split('||').map((value) => value.trim()).filter(Boolean);
  const matrixColumns = String(question.matrix_columns || '').split('||').map((value) => value.trim()).filter(Boolean);
  const currentValues = Array.isArray(answer) ? answer : [answer];
  const matrixAnswer = answer && typeof answer === 'object' && !Array.isArray(answer) ? answer as Record<string, string[]> : {};
  const matrixInput = question.question_type === 'Matrix' && matrixRows.length > 0 && matrixColumns.length > 0
    ? `<div class="core3-public-survey__matrix-wrap"><table class="core3-public-survey__matrix"><thead><tr><th></th>${matrixColumns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody>${matrixRows.map((row) => `<tr data-matrix-row="${escapeHtml(row)}"><th>${escapeHtml(row)}</th>${matrixColumns.map((column) => { const checked = Array.isArray(matrixAnswer[row]) && matrixAnswer[row].includes(column) ? ' checked' : ''; return `<td><input type="${question.matrix_subtype === 'multiple' ? 'checkbox' : 'radio'}" name="matrix-${escapeHtml(question.id)}-${escapeHtml(row)}" value="${escapeHtml(column)}"${checked}></td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`
    : '';
  const input = question.question_type === 'Text'
    ? `<textarea class="core3-public-survey__input" rows="3" data-answer>${escapeHtml(currentValues[0])}</textarea>`
    : matrixInput
      ? matrixInput
      : ['Choice', 'Multiple Choice', 'Rating', 'Scale'].includes(question.question_type) && options.length
      ? `<div class="core3-public-survey__options" data-answer>${options.map((option) => {
        const type = question.question_type === 'Multiple Choice' ? 'checkbox' : 'radio';
        const checked = currentValues.includes(option) ? ' checked' : '';
        return `<label class="core3-public-survey__option"><input type="${type}" name="question-${escapeHtml(question.id)}" value="${escapeHtml(option)}"${checked}><span>${escapeHtml(option)}</span></label>`;
      }).join('')}</div>`
      : `<input class="core3-public-survey__input" data-answer type="text" inputmode="${question.question_type === 'Numerical' ? 'decimal' : 'numeric'}"${['Date', 'date'].includes(question.question_type) ? ' pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}" autocomplete="bday"' : ''}${['Datetime', 'datetime'].includes(question.question_type) ? ' pattern="[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}"' : ''} value="${escapeHtml(currentValues[0])}" placeholder="${['Date', 'date'].includes(question.question_type) ? 'YYYY-MM-DD' : ['Datetime', 'datetime'].includes(question.question_type) ? 'YYYY-MM-DD HH:MM:SS' : 'Your answer'}">`;
  const commentInput = question.comments_allowed
    ? `<label class="core3-public-survey__comment"><span>${escapeHtml(question.comments_message || 'Comment')}</span><textarea class="core3-public-survey__input" rows="2" data-comment>${escapeHtml(comment)}</textarea></label>`
    : '';
  container.innerHTML = `
    <div class="core3-public-survey__question">${escapeHtml(question.question_text)}${question.required ? '<span class="core3-public-survey__required">*</span>' : ''}</div>
    ${input}
    ${commentInput}
    <div class="core3-public-survey__footer"><span class="core3-public-survey__progress">Question ${index + 1} of ${total}</span><div class="core3-public-survey__footer-actions">${index > 0 ? '<button class="core3-public-survey__button" data-back type="button">Back</button>' : ''}<button class="core3-public-survey__button" data-next type="button">${index === total - 1 ? 'Submit' : 'Next'}</button></div></div>
  `;
}

export async function mount(outlet: HTMLElement, token: string, initialAnswerToken = '') {
  installStyles();
  document.body.classList.add('core3-public-survey-body');
  outlet.className = '';
  outlet.innerHTML = '<div class="core3-public-survey"><div class="core3-public-survey__card"><div class="core3-public-survey__body">Loading survey…</div></div></div>';
  let payload: SurveyPayload;
  try {
    const answerQuery = initialAnswerToken ? `?answer_token=${encodeURIComponent(initialAnswerToken)}` : '';
    const response = await fetch(`/api/public/surveys/${encodeURIComponent(token)}${answerQuery}`, { cache: 'no-store' });
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(errorPayload.error || (response.status === 404 ? 'This survey is no longer available.' : `Survey could not be loaded (${response.status}).`));
    }
    payload = await response.json() as SurveyPayload;
  } catch (error) {
    outlet.innerHTML = `<div class="core3-public-survey"><div class="core3-public-survey__card"><div class="core3-public-survey__body"><div class="core3-public-survey__error">${escapeHtml(error instanceof Error ? error.message : error)}</div></div></div></div>`;
    return;
  }

  const survey = payload.survey;
  const questions = [...payload.questions].sort((left, right) => Number(left.sequence) - Number(right.sequence));
  let answerToken = String(payload.answer?.access_token || initialAnswerToken || '');
  let currentQuestionId = String(payload.answer?.current_question_id || '');
  let questionIndex = 0;
  const answers: Record<string, string | string[] | Record<string, string[]>> = {};
  try {
    const persisted = payload.answer?.answer_data ? JSON.parse(payload.answer.answer_data) : {};
    if (persisted && typeof persisted === 'object' && !Array.isArray(persisted)) Object.assign(answers, persisted);
  } catch {
    // Treat malformed historical answer data as an empty in-progress attempt.
  }
  const testBanner = payload.answer?.test_entry
    ? `<div class="core3-public-survey__test-banner">This is a Test Survey Entry.${survey.id ? ` <a href="/surveys/detail?id=${encodeURIComponent(survey.id)}">Go to Survey</a>` : ''}</div>`
    : '';
  const frame = () => `<div class="core3-public-survey"><div class="core3-public-survey__card">${testBanner}<div class="core3-public-survey__top"><div class="core3-public-survey__brand">Core3 Survey</div><div class="core3-public-survey__title">${escapeHtml(survey.title)}</div><div class="core3-public-survey__code">${escapeHtml(survey.name)}</div></div><div class="core3-public-survey__body" data-body></div></div></div>`;
  outlet.innerHTML = frame();
  const body = outlet.querySelector<HTMLElement>('[data-body]')!;
  const renderDone = (result: SurveyPayload['answer'] = payload.answer) => {
    const score = typeof result?.score === 'number' ? `<p class="core3-public-survey__description">Score: ${result.score}% · ${result.quiz_passed ? 'Passed' : 'Not passed'}</p>` : '';
    const completionMessage = survey.description_done || 'Your answers have been submitted.';
    body.innerHTML = `<div class="core3-public-survey__done"><div class="core3-public-survey__done-mark">✓</div><h2>Thank you for your response</h2><p class="core3-public-survey__description">${escapeHtml(completionMessage)}</p>${score}</div>`;
  };

  const firstUnanswered = () => questions.findIndex((question) => {
    const value = answers[question.id];
    return value === undefined || (Array.isArray(value) ? value.length === 0 : !String(value).trim());
  });

  if (payload.answer?.state === 'Submitted') {
    renderDone();
  } else if (payload.answer && payload.answer.state !== 'New') {
    const cursorIndex = currentQuestionId ? questions.findIndex((question) => question.id === currentQuestionId) : -1;
    questionIndex = cursorIndex >= 0
      ? cursorIndex
      : Math.max(0, firstUnanswered() === -1 ? questions.length - 1 : firstUnanswered());
    renderCurrentQuestion();
  } else {
    body.innerHTML = `<p class="core3-public-survey__description">${escapeHtml(survey.description || 'Please take a moment to complete this survey.')}</p><div class="core3-public-survey__footer"><button class="core3-public-survey__button" data-start type="button">${payload.answer?.test_entry ? 'Start Test' : 'Start Survey'}</button><span class="core3-public-survey__progress">or press Enter</span></div>`;
  }

  body.querySelector<HTMLButtonElement>('[data-start]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    button.disabled = true;
    try {
      const response = await fetch(`/api/public/surveys/${encodeURIComponent(token)}/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(answerToken ? { answer_token: answerToken } : {}) });
      if (!response.ok) throw new Error(`Survey could not be started (${response.status}).`);
      const started = await response.json();
      answerToken = String(started.answer?.access_token || '');
      if (!answerToken) throw new Error('The survey did not return an answer token.');
      currentQuestionId = String(started.answer?.current_question_id || questions[0]?.id || '');
      window.history.replaceState({}, '', `/survey/${encodeURIComponent(token)}/${encodeURIComponent(answerToken)}`);
      questionIndex = Math.max(0, questions.findIndex((question) => question.id === currentQuestionId));
      renderCurrentQuestion();
    } catch (error) {
      button.disabled = false;
      const message = document.createElement('div');
      message.className = 'core3-public-survey__error';
      message.textContent = error instanceof Error ? error.message : String(error);
      body.prepend(message);
    }
  });

  function renderCurrentQuestion() {
    if (!questions.length) {
      body.innerHTML = '<div class="core3-public-survey__done"><div class="core3-public-survey__done-mark">✓</div><h2>There are no questions in this survey.</h2></div>';
      return;
    }
    const currentQuestion = questions[questionIndex];
    renderQuestion(body, currentQuestion, questionIndex, questions.length, answers[currentQuestion.id], String(answers[`${currentQuestion.id}__comment`] || ''));
    body.querySelector<HTMLButtonElement>('[data-back]')?.addEventListener('click', async (event) => {
      const backButton = event.currentTarget as HTMLButtonElement;
      backButton.disabled = true;
      const question = questions[questionIndex];
      const progressResponse = await fetch(`/api/public/surveys/${encodeURIComponent(token)}/progress`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer_token: answerToken, answers }) });
      if (!progressResponse.ok) {
        backButton.disabled = false;
        const message = document.createElement('div');
        message.className = 'core3-public-survey__error';
        message.textContent = `Survey progress could not be saved (${progressResponse.status}).`;
        body.prepend(message);
        return;
      }
      await progressResponse.text();
      const navigationKey = `public-previous:${answerToken}:${question.id}`;
      const previousResponse = await fetch(`/api/public/surveys/${encodeURIComponent(token)}/previous_question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer_token: answerToken, expected_question_id: question.id, navigation_key: navigationKey }),
      });
      if (!previousResponse.ok) {
        backButton.disabled = false;
        const message = document.createElement('div');
        message.className = 'core3-public-survey__error';
        message.textContent = `The previous survey question could not be loaded (${previousResponse.status}). Reload before continuing.`;
        body.prepend(message);
        return;
      }
      const previousPayload = await previousResponse.json() as { question?: SurveyQuestion; answer?: { current_question_id?: string | null } };
      currentQuestionId = String(previousPayload.question?.id || previousPayload.answer?.current_question_id || '');
      if (previousPayload.question?.id && !questions.some((candidate) => candidate.id === previousPayload.question!.id)) {
        questions.push(previousPayload.question);
        questions.sort((left, right) => Number(left.sequence) - Number(right.sequence));
      }
      const previousIndex = questions.findIndex((candidate) => candidate.id === currentQuestionId);
      if (previousIndex < 0) {
        backButton.disabled = false;
        const message = document.createElement('div');
        message.className = 'core3-public-survey__error';
        message.textContent = 'The previous survey question is unavailable. Reload before continuing.';
        body.prepend(message);
        return;
      }
      questionIndex = previousIndex;
      renderCurrentQuestion();
    });
    body.querySelector<HTMLButtonElement>('[data-next]')!.addEventListener('click', async (event) => {
      const actionButton = event.currentTarget as HTMLButtonElement;
      actionButton.disabled = true;
      const question = questions[questionIndex];
      const value = answerValue(body, question);
      const empty = value && typeof value === 'object' && !Array.isArray(value)
        ? Object.values(value).every((selection) => selection.length === 0)
        : Array.isArray(value) ? value.length === 0 : !value.trim();
      if (question.required && empty) {
        actionButton.disabled = false;
        const error = document.createElement('div');
        error.className = 'core3-public-survey__error';
        error.textContent = 'Please answer this question before continuing.';
        body.prepend(error);
        return;
      }
      if (!empty && ['Date', 'date'].includes(question.question_type) && !isIsoDate(String(value))) {
        actionButton.disabled = false;
        const error = document.createElement('div');
        error.className = 'core3-public-survey__error';
        error.textContent = 'Enter a valid date in YYYY-MM-DD format.';
        body.prepend(error);
        return;
      }
      if (!empty && ['Datetime', 'datetime'].includes(question.question_type) && !isIsoDatetime(String(value))) {
        actionButton.disabled = false;
        const error = document.createElement('div');
        error.className = 'core3-public-survey__error';
        error.textContent = 'Enter a valid datetime in YYYY-MM-DD HH:MM:SS format.';
        body.prepend(error);
        return;
      }
      answers[question.id] = value;
      const comment = body.querySelector<HTMLTextAreaElement>('[data-comment]')?.value.trim() || '';
      if (question.comments_allowed && comment) answers[`${question.id}__comment`] = comment;
      else delete answers[`${question.id}__comment`];
      if (questionIndex < questions.length - 1) {
        const progressResponse = await fetch(`/api/public/surveys/${encodeURIComponent(token)}/progress`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer_token: answerToken, answers }) });
        if (!progressResponse.ok) {
          actionButton.disabled = false;
          const message = document.createElement('div');
          message.className = 'core3-public-survey__error';
          message.textContent = `Survey progress could not be saved (${progressResponse.status}).`;
          body.prepend(message);
          return;
        }
        await progressResponse.text();
        const cursorIndex = currentQuestionId ? questions.findIndex((candidate) => candidate.id === currentQuestionId) : -1;
        if (cursorIndex > questionIndex) {
          questionIndex = cursorIndex;
          renderCurrentQuestion();
          return;
        }
        const navigationKey = `public-next:${answerToken}:${question.id}`;
        const nextResponse = await fetch(`/api/public/surveys/${encodeURIComponent(token)}/next_question`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer_token: answerToken, expected_question_id: question.id, navigation_key: navigationKey }),
        });
        if (!nextResponse.ok) {
          actionButton.disabled = false;
          const message = document.createElement('div');
          message.className = 'core3-public-survey__error';
          message.textContent = `The next survey question could not be loaded (${nextResponse.status}). Reload before continuing.`;
          body.prepend(message);
          return;
        }
        const nextPayload = await nextResponse.json() as { question?: SurveyQuestion; answer?: { current_question_id?: string | null } };
        currentQuestionId = String(nextPayload.question?.id || nextPayload.answer?.current_question_id || '');
        if (nextPayload.question?.id && !questions.some((candidate) => candidate.id === nextPayload.question!.id)) {
          questions.push(nextPayload.question);
          questions.sort((left, right) => Number(left.sequence) - Number(right.sequence));
        }
        const nextIndex = questions.findIndex((candidate) => candidate.id === currentQuestionId);
        if (nextIndex < 0) {
          actionButton.disabled = false;
          const message = document.createElement('div');
          message.className = 'core3-public-survey__error';
          message.textContent = 'The next survey question is unavailable. Reload before continuing.';
          body.prepend(message);
          return;
        }
        questionIndex = nextIndex;
        renderCurrentQuestion();
        return;
      }
      try {
        const response = await fetch(`/api/public/surveys/${encodeURIComponent(token)}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer_token: answerToken, answers }) });
        if (!response.ok) throw new Error(`Survey could not be submitted (${response.status}).`);
        const submitted = await response.json() as { answer?: SurveyPayload['answer'] };
        renderDone(submitted.answer);
      } catch (error) {
        actionButton.disabled = false;
        const message = document.createElement('div');
        message.className = 'core3-public-survey__error';
        message.textContent = error instanceof Error ? error.message : String(error);
        body.prepend(message);
      }
    });
  }
}

type SessionQuestion = {
  id: string;
  question_text: string;
  question_type: string;
  required?: boolean;
  answer_options?: string;
  is_time_limited?: boolean;
  time_limit?: number | null;
  question_started_at?: string | null;
};

type SessionPayload = {
  session: {
    session_code: string;
    survey_name: string;
    session_state: string;
    current_question_text?: string;
    question_started_at?: string | null;
    current_question_time_limited?: boolean;
    current_question_time_limit?: number | null;
  };
  question?: SessionQuestion | null;
  attendee?: {
    attendee_name: string;
    attendee_token: string;
    state: string;
  } | null;
  answer?: { answer_value: string; question_id: string } | null;
};

const STYLE_ID = 'core3-public-live-session-style';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character));
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    body.core3-public-live-session-body { margin:0; background:#f7f5f7; color:#30262d; }
    .core3-live-session { box-sizing:border-box; min-height:100vh; padding:10vh 12px 48px; font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    .core3-live-session__card { width:min(696px,100%); margin:0 auto; padding:32px; box-sizing:border-box; background:#fff; border:1px solid #e2dbe1; border-radius:10px; box-shadow:0 8px 24px rgba(48,38,45,.08); }
    .core3-live-session__eyebrow { margin:0 0 8px; color:#796f78; font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
    .core3-live-session__title { margin:0 0 8px; font-size:clamp(26px,4vw,36px); line-height:1.2; font-weight:500; }
    .core3-live-session__copy { color:#625a61; line-height:1.55; }
    .core3-live-session__state { display:inline-block; margin:12px 0 20px; padding:5px 9px; border-radius:999px; background:#eee7ef; color:#684c63; font-size:13px; font-weight:600; }
    .core3-live-session__label { display:block; margin:20px 0 7px; font-size:14px; font-weight:600; }
    .core3-live-session__input { width:100%; box-sizing:border-box; padding:12px 13px; border:1px solid #cfc4ce; border-radius:5px; font:inherit; }
    .core3-live-session__input:focus { outline:2px solid #c4a8bd; outline-offset:1px; }
    .core3-live-session__button { border:0; border-radius:5px; padding:12px 20px; color:#fff; background:#714b67; font:600 15px inherit; cursor:pointer; }
    .core3-live-session__button:hover { background:#5d3c55; }
    .core3-live-session__button:disabled { opacity:.55; cursor:wait; }
    .core3-live-session__actions { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-top:22px; }
    .core3-live-session__secondary { color:#714b67; background:#f1ebf0; }
    .core3-live-session__question { margin:24px 0 12px; font-size:22px; line-height:1.35; font-weight:500; }
    .core3-live-session__options { display:grid; gap:9px; }
    .core3-live-session__option { display:flex; align-items:center; gap:10px; padding:12px 13px; border:1px solid #d9d1d7; border-radius:5px; cursor:pointer; }
    .core3-live-session__option input { accent-color:#714b67; width:17px; height:17px; }
    .core3-live-session__answer { margin-top:18px; padding:14px; border:1px solid #bdd8c6; border-radius:5px; color:#356444; background:#f2faf4; }
    .core3-live-session__timer { margin:18px 0 0; padding:10px 12px; border:1px solid #e3c886; border-radius:5px; color:#705313; background:#fff8df; font-weight:600; }
    .core3-live-session__error { margin:18px 0; padding:12px 14px; border:1px solid #e6b9c0; border-radius:5px; color:#8b3041; background:#fff4f5; }
    @media (max-width:520px) { .core3-live-session { padding-top:24px; } .core3-live-session__card { padding:24px 18px; } }
  `;
  document.head.append(style);
}

function sessionPath(code: string): string {
  return `/s/${encodeURIComponent(code)}`;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function answerInput(question: SessionQuestion): string {
  const options = String(question.answer_options || '').split(',').map((value) => value.trim()).filter(Boolean);
  if (options.length && ['Choice', 'Multiple Choice', 'Rating'].includes(question.question_type)) {
    return `<div class="core3-live-session__options" data-answer>${options.map((option) => `<label class="core3-live-session__option"><input type="radio" name="session-answer" value="${escapeHtml(option)}"><span>${escapeHtml(option)}</span></label>`).join('')}</div>`;
  }
  return `<input class="core3-live-session__input" data-answer type="${question.question_type === 'Numerical' ? 'number' : 'text'}" placeholder="Your answer">`;
}

export async function mount(outlet: HTMLElement, initialSessionCode = '', initialAttendeeToken = '') {
  installStyles();
  document.body.classList.add('core3-public-live-session-body');
  let sessionCode = String(initialSessionCode || '').trim();
  let attendeeToken = String(initialAttendeeToken || '').trim();
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  outlet.className = '';

  const render = (content: string) => {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    outlet.innerHTML = `<main class="core3-live-session"><section class="core3-live-session__card">${content}</section></main>`;
  };

  const timerMarkup = (question: SessionQuestion) => question.is_time_limited && Number(question.time_limit) > 0 && question.question_started_at
    ? '<div class="core3-live-session__timer" role="timer" data-question-timer>Time remaining: <strong data-question-timer-value>--:--</strong></div>'
    : '';

  const startTimer = (question: SessionQuestion) => {
    if (!question.is_time_limited || Number(question.time_limit) <= 0 || !question.question_started_at) return;
    const timerValue = outlet.querySelector<HTMLElement>('[data-question-timer-value]');
    const submit = outlet.querySelector<HTMLButtonElement>('[data-answer-form] button[type="submit"]');
    if (!timerValue) return;
    const startedAt = String(question.question_started_at);
    const deadline = new Date(startedAt.replace(' ', 'T') + (startedAt.includes('Z') ? '' : 'Z')).getTime() + Number(question.time_limit) * 1000;
    const update = () => {
      const remaining = Math.max(0, deadline - Date.now());
      const seconds = Math.ceil(remaining / 1000);
      timerValue.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      if (remaining <= 0) {
        timerValue.textContent = 'Time expired';
        if (submit) submit.disabled = true;
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
      }
    };
    update();
    if (deadline > Date.now()) timerInterval = setInterval(update, 1000);
  };

  const load = async () => {
    if (!sessionCode) {
      render(`<p class="core3-live-session__eyebrow">Surveys</p><h1 class="core3-live-session__title">Join a live session</h1><p class="core3-live-session__copy">Enter the session code from your host to participate.</p><form data-code-form><label class="core3-live-session__label" for="session-code">Session code</label><input id="session-code" class="core3-live-session__input" name="session_code" inputmode="numeric" autocomplete="off" required><div class="core3-live-session__actions"><button class="core3-live-session__button" type="submit">Continue</button></div></form>`);
      outlet.querySelector<HTMLFormElement>('[data-code-form]')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const value = String(new FormData(event.currentTarget as HTMLFormElement).get('session_code') || '').trim();
        if (!value) return;
        sessionCode = value;
        window.history.pushState({}, '', sessionPath(sessionCode));
        void load();
      });
      return;
    }
    try {
      const query = attendeeToken ? `?attendee_token=${encodeURIComponent(attendeeToken)}` : '';
      const response = await fetch(`/api/public/surveys/session/${encodeURIComponent(sessionCode)}${query}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({})) as SessionPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error || `The live session could not be loaded (${response.status}).`);
      if (payload.attendee?.attendee_token) attendeeToken = payload.attendee.attendee_token;
      const session = payload.session;
      const question = payload.question;
      const stateLabel = session.session_state === 'In Progress' ? 'Live now' : session.session_state === 'Ready' ? 'Waiting for host' : session.session_state;
      const header = `<p class="core3-live-session__eyebrow">Live Survey · ${escapeHtml(session.session_code)}</p><h1 class="core3-live-session__title">${escapeHtml(session.survey_name)}</h1><span class="core3-live-session__state">${escapeHtml(stateLabel)}</span>`;
      if (!payload.attendee) {
        render(`${header}<p class="core3-live-session__copy">Join with your name to see the host's current question.</p><form data-join-form><label class="core3-live-session__label" for="attendee-name">Your name</label><input id="attendee-name" class="core3-live-session__input" name="attendee_name" autocomplete="name" required maxlength="120"><div class="core3-live-session__actions"><button class="core3-live-session__button" type="submit">Join session</button><button class="core3-live-session__button core3-live-session__secondary" type="button" data-refresh>Refresh</button></div></form>`);
        outlet.querySelector<HTMLFormElement>('[data-join-form]')?.addEventListener('submit', async (event) => {
          event.preventDefault();
          const form = event.currentTarget as HTMLFormElement;
          const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
          if (button) button.disabled = true;
          try {
            const name = String(new FormData(form).get('attendee_name') || '').trim();
            const joinedResponse = await fetch(`/api/public/surveys/session/${encodeURIComponent(sessionCode)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attendee_name: name }) });
            const joined = await joinedResponse.json().catch(() => ({}));
            if (!joinedResponse.ok) throw new Error(joined.error || `The live session could not be joined (${joinedResponse.status}).`);
            attendeeToken = String(joined.attendee_token || '');
            window.history.replaceState({}, '', `${sessionPath(sessionCode)}?attendee_token=${encodeURIComponent(attendeeToken)}`);
            await load();
          } catch (error) {
            render(`${header}<div class="core3-live-session__error">${escapeHtml(errorText(error))}</div>`);
          }
        });
      } else if (session.session_state !== 'In Progress' || !question) {
        render(`${header}<p class="core3-live-session__copy">Hi ${escapeHtml(payload.attendee.attendee_name)}. The host has not started the next question yet.</p><div class="core3-live-session__actions"><button class="core3-live-session__button" type="button" data-refresh>Refresh</button></div>`);
      } else if (payload.answer) {
        render(`${header}<p class="core3-live-session__copy">Hi ${escapeHtml(payload.attendee.attendee_name)}.</p><h2 class="core3-live-session__question">${escapeHtml(question.question_text)}</h2><div class="core3-live-session__answer">Answer submitted: <strong>${escapeHtml(payload.answer.answer_value)}</strong></div><div class="core3-live-session__actions"><button class="core3-live-session__button" type="button" data-refresh>Refresh</button></div>`);
      } else {
        render(`${header}<p class="core3-live-session__copy">Hi ${escapeHtml(payload.attendee.attendee_name)}. Submit one answer for the current question.</p><h2 class="core3-live-session__question">${escapeHtml(question.question_text)}${question.required ? ' *' : ''}</h2>${timerMarkup(question)}<form data-answer-form>${answerInput(question)}<div class="core3-live-session__actions"><button class="core3-live-session__button" type="submit">Submit answer</button><button class="core3-live-session__button core3-live-session__secondary" type="button" data-refresh>Refresh</button></div></form>`);
        startTimer(question);
        outlet.querySelector<HTMLFormElement>('[data-answer-form]')?.addEventListener('submit', async (event) => {
          event.preventDefault();
          const form = event.currentTarget as HTMLFormElement;
          const answerValue = String(new FormData(form).get('session-answer') || form.querySelector<HTMLInputElement>('[data-answer]')?.value || '').trim();
          const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
          if (button) button.disabled = true;
          try {
            const submittedResponse = await fetch(`/api/public/surveys/session/${encodeURIComponent(sessionCode)}/answer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attendee_token: attendeeToken, answer_value: answerValue }) });
            const submitted = await submittedResponse.json().catch(() => ({}));
            if (!submittedResponse.ok) throw new Error(submitted.error || `The answer could not be submitted (${submittedResponse.status}).`);
            await load();
          } catch (error) {
            render(`${header}<div class="core3-live-session__error">${escapeHtml(errorText(error))}</div>`);
          }
        });
      }
      outlet.querySelectorAll<HTMLButtonElement>('[data-refresh]').forEach((button) => button.addEventListener('click', () => void load()));
    } catch (error) {
      render(`<h1 class="core3-live-session__title">Live session unavailable</h1><div class="core3-live-session__error">${escapeHtml(errorText(error))}</div><div class="core3-live-session__actions"><button class="core3-live-session__button" type="button" data-refresh>Try again</button></div>`);
      outlet.querySelector<HTMLButtonElement>('[data-refresh]')?.addEventListener('click', () => void load());
    }
  };

  await load();
}

import { appendIcon } from '@core3/client/components/Icon';

type PrintQuestion = {
  id: string;
  question_text: string;
  question_type: string;
  sequence: number;
  required: boolean;
  answer_options?: string;
};

type PrintPayload = {
  survey: {
    id?: string;
    title: string;
    name: string;
    description?: string;
    state?: string;
    certification?: boolean;
    scoring_type?: string;
  };
  questions: PrintQuestion[];
  answer?: {
    state?: string;
    answer_data?: string;
    respondent_name?: string;
    respondent_email?: string;
    submitted_at?: string;
    test_entry?: boolean;
  } | null;
  review?: boolean;
};

const STYLE_ID = 'core3-public-survey-print-style';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character));
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    body.core3-public-survey-print-body { margin:0; background:#fff; color:#212529; }
    .core3-survey-print { box-sizing:border-box; width:min(696px,100%); margin:0 auto; padding:80px 0 48px; font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    .core3-survey-print__title { margin:0 0 10px; color:#171b1f; font-size:36px; line-height:1.2; font-weight:400; letter-spacing:-.02em; }
    .core3-survey-print__description { margin:0; color:#20262c; font-size:15px; line-height:1.45; white-space:pre-wrap; }
    .core3-survey-print__actions { display:flex; align-items:center; gap:8px; margin:16px 0 62px; }
    .core3-survey-print__button { border:0; border-radius:7px; padding:11px 17px; color:#fff; background:#714b67; font:500 16px/1.4 inherit; cursor:pointer; text-decoration:none; }
    .core3-survey-print__button:hover { background:#5d3c55; }
    .core3-survey-print__button--print { display:grid; place-items:center; width:50px; height:44px; padding:0; color:#1b1f22; background:#f2cfa9; font-size:22px; }
    .core3-survey-print__question { margin:0 0 26px; }
    .core3-survey-print__question-title { margin:0 0 9px; color:#171b1f; font-size:21px; line-height:1.3; font-weight:500; }
    .core3-survey-print__required { color:#d34f5e; }
    .core3-survey-print__answer { min-height:24px; padding:0 4px 5px; border-bottom:1px solid #6f7880; color:#171b1f; font-size:16px; line-height:1.45; white-space:pre-wrap; }
    .core3-survey-print__answer--empty { color:#7d858c; font-style:italic; }
    .core3-survey-print__options { display:grid; gap:8px; }
    .core3-survey-print__option { display:flex; align-items:center; justify-content:space-between; min-height:34px; box-sizing:border-box; padding:7px 24px; border-radius:5px; color:#fff; background:#adb5bd; font-size:14px; font-weight:600; }
    .core3-survey-print__option--selected { background:#6d7780; }
    .core3-survey-print__check { font-size:17px; line-height:1; }
    .core3-survey-print__meta { margin:0 0 34px; color:#687078; font-size:13px; }
    .core3-survey-print__error { margin:48px auto; padding:14px 16px; border:1px solid #e6b9c0; border-radius:5px; color:#8b3041; background:#fff4f5; }
    .core3-survey-print__empty { margin:48px 0; color:#687078; font-size:16px; }
    @media (max-width:720px) { .core3-survey-print { padding:78px 12px 36px; } .core3-survey-print__title { font-size:28px; } .core3-survey-print__actions { margin-bottom:64px; } .core3-survey-print__question-title { font-size:20px; } }
    @media print { .core3-survey-print { width:100%; padding:0; } .core3-survey-print__actions, .core3-survey-print__meta { display:none; } .core3-survey-print__question { break-inside:avoid; } }
  `;
  document.head.append(style);
}

function parseAnswers(answerData: string | undefined): Record<string, unknown> {
  if (!answerData) return {};
  try {
    const parsed = JSON.parse(answerData);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function answerText(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => String(item)).join(', ');
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return String(record.value ?? record.answer ?? '');
  }
  return String(value ?? '');
}

function renderQuestion(question: PrintQuestion, value: unknown): string {
  const selected = Array.isArray(value) ? value.map(String) : [answerText(value)];
  const options = String(question.answer_options || '').split(',').map((option) => option.trim()).filter(Boolean);
  if (options.length && ['Choice', 'Multiple Choice', 'Rating'].includes(question.question_type)) {
    return `<div class="core3-survey-print__options">${options.map((option) => {
      const isSelected = selected.includes(option);
      return `<div class="core3-survey-print__option${isSelected ? ' core3-survey-print__option--selected' : ''}"><span>${escapeHtml(option)}</span>${isSelected ? '<span class="core3-survey-print__check" aria-label="Selected">✓</span>' : '<span aria-hidden="true"></span>'}</div>`;
    }).join('')}</div>`;
  }
  const text = answerText(value);
  return `<div class="core3-survey-print__answer${text ? '' : ' core3-survey-print__answer--empty'}">${escapeHtml(text || 'No answer recorded')}</div>`;
}

function renderPayload(payload: PrintPayload, token: string): string {
  const answers = parseAnswers(payload.answer?.answer_data);
  const questions = [...(payload.questions || [])].sort((left, right) => Number(left.sequence) - Number(right.sequence));
  const questionsHtml = questions.length
    ? questions.map((question) => `<section class="core3-survey-print__question"><h2 class="core3-survey-print__question-title">${escapeHtml(question.question_text)}${question.required ? ' <span class="core3-survey-print__required">*</span>' : ''}</h2>${renderQuestion(question, answers[question.id])}</section>`).join('')
    : '<p class="core3-survey-print__empty">This survey has no questions yet.</p>';
  const reviewActions = payload.review
    ? `<a class="core3-survey-print__button" href="/survey/start/${encodeURIComponent(token)}">Take Again</a>`
    : '';
  const reviewMeta = payload.answer?.test_entry
    ? '<div class="core3-survey-print__meta">This is a Test Survey Entry.</div>'
    : '';
  return `<main class="core3-survey-print"><h1 class="core3-survey-print__title">${escapeHtml(payload.survey.title)}</h1><p class="core3-survey-print__description">${escapeHtml(payload.survey.description || '')}</p><div class="core3-survey-print__actions">${reviewActions}<button class="core3-survey-print__button core3-survey-print__button--print" type="button" data-print aria-label="Print Results" title="Print Results"></button></div>${reviewMeta}${questionsHtml}</main>`;
}

export async function mount(outlet: HTMLElement, token: string, answerToken = '') {
  installStyles();
  document.body.classList.add('core3-public-survey-print-body');
  outlet.className = '';
  outlet.innerHTML = '<main class="core3-survey-print"><p>Loading printable survey…</p></main>';
  try {
    const query = new URLSearchParams();
    if (answerToken) query.set('answer_token', answerToken);
    const review = new URLSearchParams(window.location.search).get('review') === '1';
    if (review) query.set('review', '1');
    const response = await fetch(`/api/public/surveys/${encodeURIComponent(token)}/print?${query.toString()}`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({})) as PrintPayload & { error?: string };
    if (!response.ok) throw new Error(payload.error || `Survey print could not be loaded (${response.status}).`);
    outlet.innerHTML = renderPayload(payload, token);
    const printButton = outlet.querySelector<HTMLButtonElement>('[data-print]');
    if (printButton) {
      appendIcon(printButton, 'printer');
      printButton.addEventListener('click', () => window.print());
    }
  } catch (error) {
    outlet.innerHTML = `<main class="core3-survey-print"><div class="core3-survey-print__error">${escapeHtml(error instanceof Error ? error.message : error)}</div></main>`;
  }
}

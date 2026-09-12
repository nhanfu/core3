import { html } from '@core3/client/html';

type ForumQuestion = {
  forum_name?: string;
  title?: string;
  content?: string;
  author_name?: string;
  tags?: string;
  views?: number;
  vote_count?: number;
  answer_count?: number;
  state?: string;
  closed_reason?: string;
};

function loadStyles() {
  if (document.querySelector('link[data-forum-public-style]')) return;
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = '/services/forum/styles/index.css';
  style.dataset.forumPublicStyle = 'true';
  document.head.append(style);
}

export async function mount(outlet: HTMLElement, questionId: string) {
  loadStyles();
  html.take(outlet).clear();
  const loading = html.take(outlet).add('main').className('forum-public forum-public-loading').ele();
  html.take(loading).p.text('Loading question…');
  const response = await fetch(`/api/public/forum/questions/${encodeURIComponent(questionId)}`);
  const payload = await response.json().catch(() => ({}));
  html.take(outlet).clear();
  if (!response.ok || !payload.question) {
    const error = html.take(outlet).add('main').className('forum-public forum-public-error').ele();
    html.take(error).h1.text('Question unavailable');
    html.take(error).p.text('This Forum question is not available.');
    return;
  }
  const question = payload.question as ForumQuestion;
  const root = html.take(outlet).add('main').className('forum-public').ele();
  const header = html.take(root).header.className('forum-public-header').ele();
  html.take(header).div.className('forum-public-brand').text(question.forum_name || 'Forum');
  html.take(header).a.className('forum-public-back').href('/forum').text('Forum');
  const article = html.take(root).article.className('forum-public-question').ele();
  html.take(article).div.className('forum-public-kicker').text('Question');
  html.take(article).h1.text(question.title || 'Untitled question');
  const meta = html.take(article).div.className('forum-public-meta').ele();
  if (question.author_name) html.take(meta).span.text(`By ${question.author_name}`);
  if (question.state) html.take(meta).span.text(question.state);
  const stats = html.take(article).div.className('forum-public-stats').ele();
  html.take(stats).span.text(`${question.vote_count || 0} votes`);
  html.take(stats).span.text(`${question.answer_count || 0} answers`);
  html.take(stats).span.text(`${question.views || 0} views`);
  if (question.content) html.take(article).p.className('forum-public-content').text(question.content);
  if (question.closed_reason) html.take(article).p.className('forum-public-closed').text(question.closed_reason);
  if (question.tags) html.take(article).div.className('forum-public-tags').text(question.tags);
}

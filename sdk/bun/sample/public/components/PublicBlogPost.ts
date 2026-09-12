import { html } from '@core3/client/html';

type BlogPost = {
  blog_name?: string;
  name?: string;
  subtitle?: string;
  author_name?: string;
  teaser?: string;
  content_html?: string;
  tags?: string;
  published_date?: string;
};

function loadStyles() {
  if (document.querySelector('link[data-blog-public-style]')) return;
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = '/services/blog/styles/index.css';
  style.dataset.blogPublicStyle = 'true';
  document.head.append(style);
}

const SAFE_TAGS = new Set(['P', 'H2', 'H3', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'A', 'BR']);

function sanitizePublicHtml(source: string | undefined): string {
  const parser = new DOMParser();
  const input = parser.parseFromString(source || '', 'text/html').body;
  const output = document.createElement('div');
  const copy = (parent: HTMLElement, node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) { parent.append(document.createTextNode(node.textContent || '')); return; }
    if (!(node instanceof HTMLElement)) return;
    if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED'].includes(node.tagName)) return;
    if (!SAFE_TAGS.has(node.tagName)) { [...node.childNodes].forEach((child) => copy(parent, child)); return; }
    const safe = document.createElement(node.tagName.toLowerCase());
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      if (/^(https?:|mailto:|\/)/i.test(href)) safe.setAttribute('href', href);
      if (node.getAttribute('target') === '_blank') { safe.setAttribute('target', '_blank'); safe.setAttribute('rel', 'noopener noreferrer'); }
    }
    parent.append(safe); [...node.childNodes].forEach((child) => copy(safe, child));
  };
  [...input.childNodes].forEach((node) => copy(output, node));
  return output.innerHTML;
}

export async function mount(outlet: HTMLElement, postId: string) {
  loadStyles();
  html.take(outlet).clear();
  const loading = html.take(outlet).add('main').className('blog-public blog-public-loading').ele();
  html.take(loading).p.text('Loading post…');

  const response = await fetch(`/api/public/blog/posts/${encodeURIComponent(postId)}`);
  const payload = await response.json().catch(() => ({}));
  html.take(outlet).clear();
  if (!response.ok || !payload.post) {
    const error = html.take(outlet).add('main').className('blog-public blog-public-error').ele();
    html.take(error).h1.text('Post unavailable');
    html.take(error).p.text('This published Blog post is not available.');
    return;
  }

  const post = payload.post as BlogPost;
  const root = html.take(outlet).add('main').className('blog-public').ele();
  const header = html.take(root).header.className('blog-public-header').ele();
  html.take(header).div.className('blog-public-brand').text(post.blog_name || 'Blog');
  html.take(header).a.className('blog-public-back').href('/blog').text('Blog');
  const article = html.take(root).article.className('blog-public-article').ele();
  html.take(article).div.className('blog-public-kicker').text('Published post');
  html.take(article).h1.text(post.name || 'Untitled post');
  if (post.subtitle) html.take(article).p.className('blog-public-subtitle').text(post.subtitle);
  const meta = html.take(article).div.className('blog-public-meta').ele();
  if (post.author_name) html.take(meta).span.text(`By ${post.author_name}`);
  if (post.published_date) html.take(meta).time.attr('datetime', post.published_date).text(`Published ${post.published_date}`);
  if (post.teaser) html.take(article).div.className('blog-public-teaser').text(post.teaser);
  if (post.content_html) html.take(article).div.className('blog-public-content').innerHTML(sanitizePublicHtml(post.content_html));
  if (post.tags) html.take(article).div.className('blog-public-tags').text(post.tags);
}

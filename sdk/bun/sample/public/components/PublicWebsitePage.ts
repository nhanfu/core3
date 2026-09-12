import { html } from '@core3/client/html';

type WebsitePage = {
  id: string;
  website_name?: string;
  name?: string;
  url?: string;
  content_html?: string;
  date_publish?: string;
};

const SAFE_TAGS = new Set(['P', 'H2', 'H3', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'A', 'BR']);

function sanitizePublicHtml(source: string | undefined): string {
  const parser = new DOMParser();
  const input = parser.parseFromString(source || '', 'text/html').body;
  const output = document.createElement('div');
  const copy = (parent: HTMLElement, node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.append(document.createTextNode(node.textContent || ''));
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED'].includes(node.tagName)) return;
    if (!SAFE_TAGS.has(node.tagName)) {
      [...node.childNodes].forEach((child) => copy(parent, child));
      return;
    }
    const safe = document.createElement(node.tagName.toLowerCase());
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      if (/^(https?:|mailto:|\/)/i.test(href)) safe.setAttribute('href', href);
      if (node.getAttribute('target') === '_blank') {
        safe.setAttribute('target', '_blank');
        safe.setAttribute('rel', 'noopener noreferrer');
      }
    }
    parent.append(safe);
    [...node.childNodes].forEach((child) => copy(safe, child));
  };
  [...input.childNodes].forEach((node) => copy(output, node));
  return output.innerHTML;
}

function loadStyles() {
  if (document.querySelector('link[data-website-public-style]')) return;
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = '/services/website/styles/index.css';
  style.dataset.websitePublicStyle = 'true';
  document.head.append(style);
}

export async function mount(outlet: HTMLElement, pagePath: string) {
  loadStyles();
  html.take(outlet).clear();
  const loading = html.take(outlet).add('main').className('website-public website-public-loading').ele();
  html.take(loading).p.text('Loading page…');

  const response = await fetch(`/api/public/website/page?path=${encodeURIComponent(pagePath)}`);
  const payload = await response.json().catch(() => ({}));
  html.take(outlet).clear();
  if (!response.ok || !payload.page) {
    const error = html.take(outlet).add('main').className('website-public website-public-error').ele();
    html.take(error).h1.text('Page unavailable');
    html.take(error).p.text('This published Website page is not available.');
    return;
  }

  const page = payload.page as WebsitePage;
  const root = html.take(outlet).add('main').className('website-public').ele();
  const header = html.take(root).header.className('website-public-header').ele();
  html.take(header).div.className('website-public-brand').text(page.website_name || 'Website');
  html.take(header).a.className('website-public-home').href('/website/page?path=%2F').text('Home');
  const article = html.take(root).article.className('website-public-article').ele();
  html.take(article).div.className('website-public-kicker').text('Published page');
  html.take(article).h1.text(page.name || 'Untitled page');
  html.take(article).p.className('website-public-path').text(page.url || pagePath);
  if (page.content_html) html.take(article).div.className('website-public-content').innerHTML(sanitizePublicHtml(page.content_html));
  if (page.date_publish) html.take(article).time.attr('datetime', page.date_publish).text(`Published ${page.date_publish}`);
}

import { html } from '@core3/client/html';

type WebsitePage = {
  id: string;
  website_name?: string;
  name?: string;
  url?: string;
  date_publish?: string;
};

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
  const loading = html.take(outlet).main.className('website-public website-public-loading').ele();
  html.take(loading).p.text('Loading page…');

  const response = await fetch(`/api/public/website/page?path=${encodeURIComponent(pagePath)}`);
  const payload = await response.json().catch(() => ({}));
  html.take(outlet).clear();
  if (!response.ok || !payload.page) {
    const error = html.take(outlet).main.className('website-public website-public-error').ele();
    html.take(error).h1.text('Page unavailable');
    html.take(error).p.text('This published Website page is not available.');
    return;
  }

  const page = payload.page as WebsitePage;
  const root = html.take(outlet).main.className('website-public').ele();
  const header = html.take(root).header.className('website-public-header').ele();
  html.take(header).div.className('website-public-brand').text(page.website_name || 'Website');
  html.take(header).a.className('website-public-home').href('/website/page?path=%2F').text('Home');
  const article = html.take(root).article.className('website-public-article').ele();
  html.take(article).div.className('website-public-kicker').text('Published page');
  html.take(article).h1.text(page.name || 'Untitled page');
  html.take(article).p.className('website-public-path').text(page.url || pagePath);
  if (page.date_publish) html.take(article).time.attr('datetime', page.date_publish).text(`Published ${page.date_publish}`);
}

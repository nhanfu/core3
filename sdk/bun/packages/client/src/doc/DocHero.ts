import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { navigate } from '@core3/client/navigate';

export type DocHeroStat = {
  value: string;
  label: string;
  href?: string;
  /** 'units' draws a compact unit grid sized to `value` (magnitude); 'chips' lists `items` (identity). */
  visual?: 'units' | 'chips';
  items?: string[];
};
export type DocBreadcrumbItem = { label: string; href?: string };

/** Microsoft Docs content-type taxonomy: what kind of article this page is. */
export type DocArticleType = 'Overview' | 'Concept' | 'Quickstart' | 'Tutorial' | 'How-to guide' | 'Reference';

export type DocHeroDef = {
  variant?: 'home' | 'page';
  eyebrow?: string;
  breadcrumb?: DocBreadcrumbItem[];
  articleType?: DocArticleType;
  title?: string;
  subtitle?: string;
  stats?: DocHeroStat[];
};

/** Page-top hero: breadcrumb + article-type badge, a large title + subtitle, with an optional stat rail on the home variant. */
export class DocHero extends BaseComponent {
  constructor(id: string, state: any = {}, private readonly def: DocHeroDef = {}) {
    super(id, state);
  }

  private renderBreadcrumb(container: HTMLElement, breadcrumb: DocBreadcrumbItem[]) {
    const nav = html.take(container).nav.className('doc-breadcrumb').attr('aria-label', 'Breadcrumb').ele() as HTMLElement;
    breadcrumb.forEach((item, index) => {
      if (index > 0) html.take(nav).span.className('doc-breadcrumb-sep').text('/');
      if (item.href) {
        const link = html.take(nav).a.className('doc-breadcrumb-link').attr('href', item.href).text(item.label).ele() as HTMLAnchorElement;
        html.take(link).event('click', (event: MouseEvent) => {
          event.preventDefault();
          navigate(item.href!);
        });
      } else {
        html.take(nav).span.className('doc-breadcrumb-current').text(item.label);
      }
    });
  }

  draw(container: HTMLElement) {
    const { variant = 'page', eyebrow, breadcrumb, articleType, title = '', subtitle, stats = [] } = this.def;
    const isHome = variant === 'home';

    const hero = html.take(container).div.className(isHome ? 'doc-hero' : 'doc-page-hero').ele() as HTMLElement;
    const copy = html.take(hero).div.className('doc-hero-copy').ele() as HTMLElement;
    if (breadcrumb?.length) this.renderBreadcrumb(copy, breadcrumb);
    const metaRow = html.take(copy).div.className('doc-hero-meta').ele() as HTMLElement;
    if (articleType) html.take(metaRow).span.className('doc-article-badge').text(articleType);
    if (eyebrow) html.take(metaRow).span.className('doc-eyebrow').text(eyebrow);
    html.take(copy).h1.className('doc-hero-title').text(title);
    if (subtitle) html.take(copy).p.className('doc-hero-sub').text(subtitle);

    if (isHome && stats.length) {
      const rail = html.take(hero).div.className('doc-stat-rail').ele() as HTMLElement;
      for (const stat of stats) {
        const item = html.take(rail).add(stat.href ? 'a' : 'div').className('doc-stat').ele() as HTMLElement;
        if (stat.href) html.take(item).attr('href', stat.href);
        html.take(item).strong.text(stat.value);
        html.take(item).span.text(stat.label);
        this.renderStatVisual(item, stat);
      }
    }
  }

  private renderStatVisual(container: HTMLElement, stat: DocHeroStat) {
    if (stat.visual === 'chips' && stat.items?.length) {
      const chips = html.take(container).div.className('doc-stat-chips').ele() as HTMLElement;
      for (const label of stat.items) html.take(chips).span.className('doc-stat-chip').text(label);
      return;
    }
    if (stat.visual === 'units') {
      const count = parseInt(stat.value, 10);
      if (!Number.isFinite(count) || count <= 0) return;
      const grid = html.take(container).div.className('doc-stat-units').attr('role', 'img').attr('aria-label', `${count} ${stat.label}`).ele() as HTMLElement;
      for (let i = 0; i < count; i++) html.take(grid).span.className('doc-stat-unit').ele();
    }
  }
}

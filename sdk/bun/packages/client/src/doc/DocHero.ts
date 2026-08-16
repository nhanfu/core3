import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export type DocHeroStat = { value: string; label: string; href?: string };

export type DocHeroDef = {
  variant?: 'home' | 'page';
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  stats?: DocHeroStat[];
};

/** Page-top hero: a large title + subtitle, with an optional stat rail on the home variant. */
export class DocHero extends BaseComponent {
  constructor(id: string, state: any = {}, private readonly def: DocHeroDef = {}) {
    super(id, state);
  }

  draw(container: HTMLElement) {
    const { variant = 'page', eyebrow, title = '', subtitle, stats = [] } = this.def;
    const isHome = variant === 'home';

    const hero = html.take(container).div.className(isHome ? 'doc-hero' : 'doc-page-hero').ele() as HTMLElement;
    const copy = html.take(hero).div.className('doc-hero-copy').ele() as HTMLElement;
    if (eyebrow) html.take(copy).span.className('doc-eyebrow').text(eyebrow);
    html.take(copy).h1.className('doc-hero-title').text(title);
    if (subtitle) html.take(copy).p.className('doc-hero-sub').text(subtitle);

    if (isHome && stats.length) {
      const rail = html.take(hero).div.className('doc-stat-rail').ele() as HTMLElement;
      for (const stat of stats) {
        const item = html.take(rail).add(stat.href ? 'a' : 'div').className('doc-stat').ele() as HTMLElement;
        if (stat.href) html.take(item).attr('href', stat.href);
        html.take(item).strong.text(stat.value);
        html.take(item).span.text(stat.label);
      }
    }
  }
}

import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { DocHero, type DocHeroDef } from '@core3/client/doc/DocHero';

export type DocBlock =
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'cardgrid'; cards: Array<{ tag?: string; title: string; body?: string; items?: string[] }> }
  | { type: 'panel'; title?: string; language?: string; code: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'flowstrip'; steps: Array<{ label: string; sub?: string }> }
  | { type: 'callout'; tone?: 'note' | 'warning'; title?: string; text: string };

export type DocSection = {
  id?: string;
  kicker?: string;
  title: string;
  lead?: string;
  blocks?: DocBlock[];
};

export type DocPageDef = {
  hero?: DocHeroDef;
  sections?: DocSection[];
};

function slug(value: string, index: number): string {
  const base = String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || `section-${index}`;
}

/**
 * Renders a whole doc/spec page from a declarative YAML tree: an optional
 * hero, then a list of sections made of small content blocks (paragraph,
 * list, card grid, code panel, table, flow strip). Registered under the
 * "DocPage" component type — see registerPageComponentSchema in the spec
 * server for the schema keys this accepts.
 */
export class DocPage extends BaseComponent {
  constructor(id: string, state: any = {}, private readonly def: DocPageDef = {}) {
    super(id, state);
  }

  private block(container: HTMLElement, block: DocBlock) {
    switch (block.type) {
      case 'p':
        html.take(container).p.text(block.text);
        break;
      case 'list': {
        const list = html.take(container).ul.ele() as HTMLElement;
        for (const item of block.items || []) html.take(list).li.text(item);
        break;
      }
      case 'cardgrid': {
        const grid = html.take(container).div.className('doc-cardgrid').ele() as HTMLElement;
        for (const card of block.cards || []) {
          const cardEl = html.take(grid).div.className('doc-card').ele() as HTMLElement;
          if (card.tag) html.take(cardEl).span.className('doc-card-tag').text(card.tag);
          html.take(cardEl).h4.text(card.title);
          if (card.body) html.take(cardEl).p.text(card.body);
          if (card.items?.length) {
            const list = html.take(cardEl).ul.ele() as HTMLElement;
            for (const item of card.items) html.take(list).li.text(item);
          }
        }
        break;
      }
      case 'panel': {
        const panel = html.take(container).div.className('doc-panel').ele() as HTMLElement;
        if (block.title) html.take(panel).div.className('doc-panel-title').text(block.title);
        const pre = html.take(panel).add('pre').ele() as HTMLElement;
        html.take(pre).add('code').className(block.language ? `language-${block.language}` : '').text(block.code);
        break;
      }
      case 'table': {
        const wrap = html.take(container).div.className('doc-table-wrap').ele() as HTMLElement;
        const table = html.take(wrap).table.className('doc-table').ele() as HTMLElement;
        const thead = html.take(table).thead.ele() as HTMLElement;
        const headRow = html.take(thead).trow.ele() as HTMLElement;
        for (const header of block.headers || []) html.take(headRow).th.text(header);
        const tbody = html.take(table).tbody.ele() as HTMLElement;
        for (const row of block.rows || []) {
          const tr = html.take(tbody).trow.ele() as HTMLElement;
          for (const cell of row) html.take(tr).tdata.text(cell);
        }
        break;
      }
      case 'flowstrip': {
        const strip = html.take(container).div.className('doc-flowstrip').ele() as HTMLElement;
        (block.steps || []).forEach((step, index) => {
          const cell = html.take(strip).div.className('doc-flowstep').ele() as HTMLElement;
          html.take(cell).span.className('doc-flowstep-num').text(String(index + 1));
          html.take(cell).div.className('doc-flowstep-label').text(step.label);
          if (step.sub) html.take(cell).div.className('doc-flowstep-sub').text(step.sub);
        });
        break;
      }
      case 'callout': {
        const callout = html.take(container).div.className(`doc-callout doc-callout-${block.tone || 'note'}`).ele() as HTMLElement;
        if (block.title) html.take(callout).div.className('doc-callout-title').text(block.title);
        html.take(callout).p.text(block.text);
        break;
      }
      default:
        console.error(`[DocPage] Unknown block type: ${(block as any).type}`);
    }
  }

  draw(container: HTMLElement) {
    const { hero, sections = [] } = this.def;
    this.children = [];

    if (hero) {
      const heroComponent = new DocHero(`${this.id}-hero`, {}, hero);
      heroComponent.parent = this;
      this.children.push(heroComponent);
      heroComponent.mount(html.take(container).div.ele() as HTMLElement);
    }

    const layout = html.take(container).div.className('doc-layout').ele() as HTMLElement;
    const sidebar = html.take(layout).aside.className('doc-sidebar').ele() as HTMLElement;
    const nav = html.take(sidebar).nav.ele() as HTMLElement;
    const main = html.take(layout).div.className('doc-main').ele() as HTMLElement;

    sections.forEach((section, index) => {
      const anchor = section.id || slug(section.title, index);
      this.link(nav, anchor, section.title);

      const el = html.take(main).section.attr('id', anchor).className('doc-section').ele() as HTMLElement;
      if (section.kicker) html.take(el).span.className('doc-kicker').text(section.kicker);
      html.take(el).h2.text(section.title);
      if (section.lead) html.take(el).p.className('doc-lead').text(section.lead);
      for (const block of section.blocks || []) this.block(el, block);
    });
  }

  private link(container: HTMLElement, anchor: string, label: string) {
    const item = html.take(container).a.className('doc-sidebar-link').attr('href', `#${anchor}`).text(label).ele() as HTMLAnchorElement;
    html.take(item).event('click', (event: MouseEvent) => {
      event.preventDefault();
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

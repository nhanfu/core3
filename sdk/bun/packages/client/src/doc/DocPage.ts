import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { DocHero, type DocHeroDef } from '@core3/client/doc/DocHero';
import hljs from 'highlight.js';

// highlight.js's default bundle already registers the "common" language set —
// json, yaml, javascript, typescript, sql, and ~30 others — no per-language
// registration needed.
const LANGUAGE_ALIAS: Record<string, string> = { yml: 'yaml', ts: 'typescript', js: 'javascript' };

export type DocBlock =
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'cardgrid'; cards: Array<{ tag?: string; title: string; body?: string; items?: string[] }> }
  | { type: 'panel'; title?: string; language?: string; code: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'flowstrip'; steps: Array<{ label: string; sub?: string }> }
  | { type: 'callout'; tone?: 'note' | 'tip' | 'important' | 'warning' | 'caution'; title?: string; text: string }
  | { type: 'diagram'; svg: string; caption?: string };

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

/** One glyph per Microsoft Docs alert type (Note/Tip/Important/Warning/Caution). */
const CALLOUT_ICON: Record<string, string> = {
  note: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="7.5" r="0.9" fill="currentColor" stroke="none"/>',
  tip: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3 11.2c.6.5 1 1.2 1 2.1v.2h4v-.2c0-.9.4-1.6 1-2.1A6 6 0 0012 3z"/>',
  important: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="7" x2="12" y2="13"/><circle cx="12" cy="16.5" r="0.9" fill="currentColor" stroke="none"/>',
  warning: '<path d="M12 4 L21 20 H3 Z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"/>',
  caution: '<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><line x1="12" y1="8" x2="12" y2="13"/><circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none"/>',
};

const CALLOUT_LABEL: Record<string, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
};

// A `query: |` or `sql: |` block scalar inside a YAML sample is real embedded
// SQL, not YAML — the yaml grammar alone can't know that, so it's tokenized
// (and highlighted) as its own sql segment instead.
const EMBEDDED_SQL_KEY_RE = /^(\s*)(?:query|sql)\s*:\s*[|>][+-]?\s*$/im;

function splitYamlWithEmbeddedSql(code: string): Array<{ lang: 'yaml' | 'sql'; text: string }> {
  const lines = code.split('\n');
  const segments: Array<{ lang: 'yaml' | 'sql'; text: string }> = [];
  let bucket: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const match = lines[i].match(EMBEDDED_SQL_KEY_RE);
    if (!match) {
      bucket.push(lines[i]);
      i++;
      continue;
    }
    bucket.push(lines[i]);
    segments.push({ lang: 'yaml', text: bucket.join('\n') });
    bucket = [];
    const keyIndent = match[1].length;
    const sqlLines: string[] = [];
    i++;
    while (i < lines.length) {
      const line = lines[i];
      const indent = (line.match(/^(\s*)/) as RegExpMatchArray)[1].length;
      if (line.trim() !== '' && indent <= keyIndent) break;
      sqlLines.push(line);
      i++;
    }
    segments.push({ lang: 'sql', text: sqlLines.join('\n') });
  }
  segments.push({ lang: 'yaml', text: bucket.join('\n') });
  return segments;
}

function highlightCode(code: string, language?: string): string | null {
  const lang = language && (LANGUAGE_ALIAS[language] || language);
  if (!lang || !hljs.getLanguage(lang)) return null;
  if (lang === 'yaml' && hljs.getLanguage('sql') && EMBEDDED_SQL_KEY_RE.test(code)) {
    return splitYamlWithEmbeddedSql(code)
      .map((seg) => hljs.highlight(seg.text, { language: seg.lang }).value)
      .join('\n');
  }
  return hljs.highlight(code, { language: lang }).value;
}

/**
 * Renders a whole doc/spec page from a declarative YAML tree: an optional
 * hero, then a list of sections made of small content blocks (paragraph,
 * list, card grid, code panel, table, flow strip). Registered under the
 * "DocPage" component type — see registerPageComponentSchema in the spec
 * server for the schema keys this accepts.
 */
export class DocPage extends BaseComponent {
  private tocLinks = new Map<string, HTMLAnchorElement>();
  private sectionIntersecting = new Map<string, boolean>();
  private activeAnchor: string | null = null;
  private sectionObserver: IntersectionObserver | null = null;

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
        const codeEl = html.take(pre).add('code').className(block.language ? `language-${block.language}` : '').ele() as HTMLElement;
        const highlighted = highlightCode(block.code, block.language);
        if (highlighted != null) codeEl.innerHTML = highlighted;
        else codeEl.textContent = block.code;
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
        const tone = block.tone || 'note';
        const callout = html.take(container).div.className(`doc-callout doc-callout-${tone}`).ele() as HTMLElement;
        const head = html.take(callout).div.className('doc-callout-head').ele() as HTMLElement;
        const iconWrap = html.take(head).span.className('doc-callout-icon').ele() as HTMLElement;
        iconWrap.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${CALLOUT_ICON[tone] || CALLOUT_ICON.note}</svg>`;
        html.take(head).span.className('doc-callout-title').text(block.title || CALLOUT_LABEL[tone] || CALLOUT_LABEL.note);
        html.take(callout).p.text(block.text);
        break;
      }
      case 'diagram': {
        const wrap = html.take(container).div.className('doc-diagram').ele() as HTMLElement;
        wrap.innerHTML = block.svg || '';
        if (block.caption) html.take(wrap).div.className('doc-diagram-caption').text(block.caption);
        break;
      }
      default:
        console.error(`[DocPage] Unknown block type: ${(block as any).type}`);
    }
  }

  draw(container: HTMLElement) {
    const { hero, sections = [] } = this.def;
    this.children = [];
    this.sectionObserver?.disconnect();
    this.tocLinks = new Map();
    this.sectionIntersecting = new Map();
    this.activeAnchor = null;

    if (hero) {
      const heroComponent = new DocHero(`${this.id}-hero`, {}, hero);
      heroComponent.parent = this;
      this.children.push(heroComponent);
      heroComponent.mount(html.take(container).div.ele() as HTMLElement);
    }

    // Content precedes the "In this article" nav in DOM order (Microsoft Docs
    // convention: readable content first, supplementary nav second) — the
    // right-rail placement is purely a CSS layout concern (see .doc-toc).
    const layout = html.take(container).div.className('doc-layout').ele() as HTMLElement;
    const main = html.take(layout).div.className('doc-main').ele() as HTMLElement;
    const toc = html.take(layout).aside.className('doc-toc').ele() as HTMLElement;
    html.take(toc).div.className('doc-toc-heading').text('In this article');
    const nav = html.take(toc).nav.ele() as HTMLElement;

    const usedAnchors = new Set<string>();
    const sectionEls: HTMLElement[] = [];
    sections.forEach((section, index) => {
      let anchor = section.id || slug(section.title, index);
      while (usedAnchors.has(anchor)) anchor = `${anchor}-${index}`;
      usedAnchors.add(anchor);
      this.tocLinks.set(anchor, this.link(nav, anchor, section.title));

      const el = html.take(main).section.attr('id', anchor).className('doc-section').ele() as HTMLElement;
      if (section.kicker) html.take(el).span.className('doc-kicker').text(section.kicker);
      html.take(el).h2.text(section.title);
      if (section.lead) html.take(el).p.className('doc-lead').text(section.lead);
      for (const block of section.blocks || []) this.block(el, block);
      sectionEls.push(el);
    });

    this.observeSections(sectionEls);
  }

  /**
   * Scrollspy: keeps the "In this article" link highlighted for whichever
   * section is currently under a band near the top of the viewport (below
   * the sticky topbar), not just the one clicked.
   */
  private observeSections(sectionEls: HTMLElement[]) {
    if (!sectionEls.length || typeof IntersectionObserver === 'undefined') return;

    const setActive = () => {
      let candidate: string | null = null;
      let candidateTop = Infinity;
      for (const el of sectionEls) {
        if (!this.sectionIntersecting.get(el.id)) continue;
        const top = el.getBoundingClientRect().top;
        if (top < candidateTop) {
          candidateTop = top;
          candidate = el.id;
        }
      }
      // Nothing is in the band right now (e.g. scrolled past the end of the
      // last section) — keep whatever was last active instead of resetting.
      if (candidate) this.activeAnchor = candidate;
      else if (this.activeAnchor == null) this.activeAnchor = sectionEls[0].id;
      for (const [anchor, link] of this.tocLinks) link.classList.toggle('is-active', anchor === this.activeAnchor);
    };

    this.sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) this.sectionIntersecting.set((entry.target as HTMLElement).id, entry.isIntersecting);
        setActive();
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );
    for (const el of sectionEls) this.sectionObserver.observe(el);
    setActive();
  }

  private link(container: HTMLElement, anchor: string, label: string): HTMLAnchorElement {
    const item = html.take(container).a.className('doc-toc-link').attr('href', `#${anchor}`).text(label).ele() as HTMLAnchorElement;
    html.take(item).event('click', (event: MouseEvent) => {
      event.preventDefault();
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return item;
  }

  dispose() {
    this.sectionObserver?.disconnect();
    this.sectionObserver = null;
    super.dispose();
  }
}

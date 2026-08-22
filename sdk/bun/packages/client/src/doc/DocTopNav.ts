import { html, SvgTag } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export type DocNavItem = {
  label: string;
  href?: string;
  items?: DocNavItem[];
};

export type DocTopNavDef = {
  brand?: string;
  eyebrow?: string;
  items?: DocNavItem[];
};

export type DocTopNavState = {
  active?: string;
  onNavigate?: (href: string) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
};

const SUN_PATH = 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z';
const MOON_PATH = 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z';

function containsActive(item: DocNavItem, active: string): boolean {
  if (item.href === active) return true;
  return (item.items || []).some((child) => containsActive(child, active));
}

/**
 * Global navigation bar shared by every doc/spec page. Mounted once by the
 * host shell (outside PageRuntime) so its YAML-declared items stay constant
 * while page content is swapped underneath it. Top-level items may declare a
 * nested `items` list, rendered as a click-to-open dropdown.
 */
export class DocTopNav extends BaseComponent {
  private closeOpenDropdown: (() => void) | null = null;

  constructor(id: string, state: DocTopNavState = {}, private readonly def: DocTopNavDef = {}) {
    super(id, state);
  }

  private go(href: string) {
    this.closeOpenDropdown?.();
    if (typeof this.state.onNavigate === 'function') this.state.onNavigate(href);
    else window.location.href = href;
  }

  private link(container: HTMLElement, className: string, href: string, label: string) {
    const anchor = html.take(container).a.className(className).attr('href', href).text(label).ele() as HTMLAnchorElement;
    html.take(anchor).event('click', (event: MouseEvent) => {
      event.preventDefault();
      this.go(href);
    });
    return anchor;
  }

  private dropdown(container: HTMLElement, item: DocNavItem, active: string) {
    const isActive = containsActive(item, active);
    const wrap = html.take(container).div.className('doc-topbar-dropdown').ele() as HTMLElement;
    const trigger = html.take(wrap).button.type('button')
      .className(`doc-topbar-link doc-topbar-dropdown-trigger${isActive ? ' is-active' : ''}`)
      .text(item.label)
      .ele() as HTMLButtonElement;
    const panel = html.take(wrap).div.className('doc-topbar-dropdown-panel').ele() as HTMLElement;
    for (const child of item.items || []) {
      this.link(panel, `doc-topbar-dropdown-item${child.href === active ? ' is-active' : ''}`, child.href || '#', child.label);
    }

    const close = () => {
      wrap.classList.remove('is-open');
      document.removeEventListener('click', onOutsideClick, true);
      if (this.closeOpenDropdown === close) this.closeOpenDropdown = null;
    };
    const onOutsideClick = (event: MouseEvent) => {
      if (!wrap.contains(event.target as Node)) close();
    };
    html.take(trigger).event('click', (event: MouseEvent) => {
      event.stopPropagation();
      const opening = !wrap.classList.contains('is-open');
      this.closeOpenDropdown?.();
      if (!opening) return;
      wrap.classList.add('is-open');
      this.closeOpenDropdown = close;
      document.addEventListener('click', onOutsideClick, true);
    });
  }

  private themeToggle(container: HTMLElement) {
    const theme = this.state.theme || 'light';
    const button = html.take(container).button.type('button')
      .className('doc-theme-toggle')
      .attr('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme')
      .ele() as HTMLButtonElement;
    const svg = html.take(button).svg(SvgTag.Svg).attr('viewBox', '0 0 24 24').ele() as unknown as SVGElement;
    html.take(svg).svg(SvgTag.Path).attr('d', theme === 'dark' ? SUN_PATH : MOON_PATH);
    html.take(button).event('click', () => this.state.onToggleTheme?.());
  }

  draw(container: HTMLElement) {
    const { brand = 'Core3', eyebrow, items = [] } = this.def;
    const active = this.state.active || '';
    this.closeOpenDropdown?.();
    this.closeOpenDropdown = null;

    const bar = html.take(container).div.className('doc-topbar').ele() as HTMLElement;

    const brandLink = this.link(bar, 'doc-topbar-brand', '/', '');
    html.take(brandLink).img.className('doc-topbar-logo').attr('src', '/favicon.svg').attr('alt', 'YShip').ele();
    html.take(brandLink).span.text(brand);

    if (eyebrow) html.take(bar).span.className('doc-topbar-meta').text(eyebrow);

    const nav = html.take(bar).nav.className('doc-topbar-nav').ele() as HTMLElement;
    for (const item of items) {
      if (item.items?.length) this.dropdown(nav, item, active);
      else this.link(nav, `doc-topbar-link${item.href === active ? ' is-active' : ''}`, item.href || '#', item.label);
    }
    this.themeToggle(nav);
  }

  dispose() {
    this.closeOpenDropdown?.();
    super.dispose();
  }
}

import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';
import { appendIcon } from '@core3/client/components/Icon';
import { getApps, navigate, selectApp } from '../app.ts';

type HomeApp = {
  id: string;
  label?: string;
  description?: string;
  icon?: string;
  route?: string;
  available?: boolean;
};

const PINNED_IDS = ['base', 'order', 'crm', 'accounting', 'inventory', 'helpdesk'];

export class WorkspaceHome extends BaseComponent {
  private _search: HTMLInputElement | null = null;
  private _shortcutHandler: ((event: KeyboardEvent) => void) | null = null;

  private appButton(parent: HTMLElement, app: HomeApp, compact = false) {
    const button = html.take(parent).button
      .className(`workspace-app${compact ? ' workspace-app-compact' : ''}${app.available ? '' : ' disabled'}`)
      .attr('type', 'button')
      .attr('aria-label', app.label || app.id)
      .ele();
    const icon = html.take(button).span.className('workspace-app-icon').ele();
    appendIcon(icon, app.icon || 'grid');
    const copy = html.take(button).span.className('workspace-app-copy').ele();
    html.take(copy).span.className('workspace-app-name').text(app.label || app.id);
    if (!compact && app.description) html.take(copy).span.className('workspace-app-description').text(app.description);
    if (!app.available) html.take(button).span.className('workspace-app-status').text('Coming soon');
    if (app.available) button.addEventListener('click', () => selectApp(app));
    return button;
  }

  draw(container: HTMLElement) {
    const apps = getApps() as HomeApp[];
    const available = apps.filter((app) => app.available);
    const pinned = PINNED_IDS.map((id) => available.find((app) => app.id === id)).filter(Boolean) as HomeApp[];
    const remaining = available.filter((app) => !pinned.some((item) => item.id === app.id));
    const root = html.take(container).div.className('workspace-home').ele();

    const hero = html.take(root).section.className('workspace-home-hero').ele();
    const heroCopy = html.take(hero).div.className('workspace-home-hero-copy').ele();
    html.take(heroCopy).div.className('workspace-home-kicker').text('CORE3 WORKSPACE');
    html.take(heroCopy).h1.className('workspace-home-title').text('Good to see you.');
    html.take(heroCopy).p.className('workspace-home-subtitle').text('Start with an application or continue where you left off.');
    const search = html.take(hero).div.className('workspace-home-search').ele();
    const searchIcon = html.take(search).span.className('workspace-home-search-icon').ele();
    appendIcon(searchIcon, 'search');
    this._search = html.take(search).input
      .type('search')
      .attr('placeholder', 'Search applications…')
      .attr('aria-label', 'Search applications')
      .ele() as HTMLInputElement;
    this._search.addEventListener('input', () => this.filter(this._search?.value || ''));
    html.take(search).node('kbd').className('workspace-home-shortcut').text('⌘ K');
    this._shortcutHandler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault();
        this._search?.focus();
      }
    };
    document.addEventListener('keydown', this._shortcutHandler);

    if (pinned.length) {
      const section = html.take(root).section.className('workspace-home-section').ele();
      const heading = html.take(section).div.className('workspace-home-section-heading').ele();
      html.take(heading).h2.text('Pinned applications');
      html.take(heading).button.className('workspace-home-link').attr('type', 'button').text('View all').event('click', () => navigate('/apps'));
      const grid = html.take(section).div.className('workspace-home-pinned').ele();
      pinned.forEach((app) => this.appButton(grid, app, true));
    }

    const section = html.take(root).section.className('workspace-home-section workspace-home-all').ele();
    const heading = html.take(section).div.className('workspace-home-section-heading').ele();
    html.take(heading).h2.text('Your applications');
    html.take(heading).span.className('workspace-home-count').text(`${remaining.length + pinned.length} available`);
    const grid = html.take(section).div.className('workspace-home-grid').ele();
    [...pinned, ...remaining].forEach((app) => {
      const item = this.appButton(grid, app);
      item.dataset.workspaceSearch = `${app.label || ''} ${app.id} ${app.description || ''}`.toLocaleLowerCase();
    });

    const footer = html.take(root).div.className('workspace-home-footer').ele();
    html.take(footer).span.text('Need something else?');
    html.take(footer).button.className('workspace-home-link').attr('type', 'button').text('Browse all applications').event('click', () => navigate('/apps'));
  }

  private filter(value: string) {
    const query = value.trim().toLocaleLowerCase();
    this._container?.querySelectorAll<HTMLElement>('[data-workspace-search]').forEach((item) => {
      item.hidden = Boolean(query) && !item.dataset.workspaceSearch?.includes(query);
    });
  }

  dispose() {
    if (this._shortcutHandler) document.removeEventListener('keydown', this._shortcutHandler);
    this._shortcutHandler = null;
    this._search = null;
    super.dispose();
  }
}

export function mount(container: HTMLElement) {
  new WorkspaceHome('workspace-home', {}).mount(container);
}

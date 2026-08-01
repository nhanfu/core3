import { BaseComponent } from '../../lib/components/BaseComponent.ts';
import { html } from '../../lib/html.ts';
import { i18n } from '../../lib/i18n.ts';
import { appendIcon } from '../../lib/components/Icon.ts';

export type LauncherApp = {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  route: string;
  available?: boolean;
};

export class AppLauncher extends BaseComponent {
  _menu: HTMLElement | null;
  _icon: HTMLElement | null;
  _searchInput: HTMLInputElement | null;
  _documentClickHandler: (() => void) | null;
  _escapeHandler: ((event: KeyboardEvent) => void) | null;

  constructor(id: string, state: any) {
    super(id, { open: false, apps: [], currentApp: null, ...state });
    this._menu = null;
    this._icon = null;
    this._searchInput = null;
    this._documentClickHandler = null;
    this._escapeHandler = null;
  }

  get isOpen() {
    return this._menu?.classList.contains('open') || false;
  }

  open() {
    this._setOpen(true);
  }

  close() {
    this._setOpen(false);
  }

  toggle() {
    this._setOpen(!this.isOpen);
  }

  setCurrentApp(app: LauncherApp | null) {
    this.state.currentApp = app;
    if (this._icon) {
      this._icon.innerHTML = '';
      appendIcon(this._icon, 'grid');
    }
    this._filterApps(this._searchInput?.value || '');
  }

  _setOpen(open: boolean) {
    this.state.open = open;
    this._menu?.classList.toggle('open', open);
    this.state.onOpenChange?.(open);
    if (open) {
      this._searchInput?.focus({ preventScroll: true });
    }
  }

  _filterApps(value: string) {
    const query = value.trim().toLocaleLowerCase(i18n.lang);
    this._menu?.querySelectorAll<HTMLElement>('[data-launcher-app]').forEach((item) => {
      const label = item.dataset.launcherSearch || '';
      item.style.display = !query || label.includes(query) ? '' : 'none';
    });
  }

  draw(container: HTMLElement) {
    const apps = this.state.apps as LauncherApp[];
    const currentApp = this.state.currentApp as LauncherApp | null;
    const switcher = html.take(container).div.className('app-switcher').getContext();
    const button = html.take(switcher).button
      .className('app-switcher-button')
      .attr('type', 'button')
      .attr('aria-label', 'Switch application')
      .attr('title', 'Switch application')
      .getContext();
    const icon = html.take(button).span.className('app-switcher-icon').getContext();
    appendIcon(icon, 'grid');
    this._icon = icon;

    const menu = html.take(switcher).div.className('app-switcher-menu').getContext();
    this._menu = menu;
    menu.addEventListener('click', (event: MouseEvent) => event.stopPropagation());

    const backdrop = html.take(menu).button
      .className('launcher-backdrop')
      .attr('type', 'button')
      .attr('aria-label', 'Close application launcher')
      .event('click', () => this.close())
      .getContext();

    const close = html.take(menu).button
      .className('launcher-close-button')
      .attr('type', 'button')
      .attr('aria-label', 'Close application launcher')
      .attr('title', 'Close')
      .event('click', () => this.close())
      .getContext();
    appendIcon(close, 'x');

    const search = html.take(menu).div.className('launcher-search').getContext();
    const searchIcon = html.take(search).span.className('launcher-search-icon').getContext();
    appendIcon(searchIcon, 'search');
    const searchInput = html.take(search).input
      .type('search')
      .attr('placeholder', 'Search applications...')
      .attr('aria-label', 'Search applications')
      .getContext() as HTMLInputElement;
    this._searchInput = searchInput;
    searchInput.addEventListener('input', () => this._filterApps(searchInput.value));

    for (const app of apps) {
      const searchText = `${app.label || ''} ${app.id}`.toLocaleLowerCase(i18n.lang);
      const item = html.take(menu).button
        .className(`app-switcher-item${app.available ? '' : ' disabled'}${currentApp?.id === app.id ? ' active' : ''}`)
        .attr('type', 'button')
        .dataAttr('launcher-app', app.id)
        .getContext();
      item.dataset.launcherSearch = searchText;
      const itemIcon = html.take(item).span.className('app-switcher-item-icon').getContext();
      appendIcon(itemIcon, app.icon || 'grid');
      const copy = html.take(item).span.className('app-switcher-item-copy').getContext();
      html.take(copy).span.className('app-switcher-item-label').text(app.label || app.id);
      if (!app.available) html.take(copy).span.className('app-switcher-item-status').text('Soon');
      if (app.available) item.addEventListener('click', () => {
        this.close();
        if (currentApp?.id === app.id) return;
        this.state.onAppChange?.(app, false);
      });
    }

    button.addEventListener('click', (event: MouseEvent) => {
      event.stopPropagation();
      this.toggle();
    });
    this._documentClickHandler = () => this.close();
    document.addEventListener('click', this._documentClickHandler);
    this._escapeHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') this.close();
    };
    document.addEventListener('keydown', this._escapeHandler);
  }

  dispose() {
    if (this._documentClickHandler) document.removeEventListener('click', this._documentClickHandler);
    if (this._escapeHandler) document.removeEventListener('keydown', this._escapeHandler);
    this._documentClickHandler = null;
    this._escapeHandler = null;
    this._menu = null;
    this._icon = null;
    this._searchInput = null;
    super.dispose();
  }
}

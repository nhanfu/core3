import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';
import { appendIcon } from '@core3/client/components/Icon';
import { getApps, selectApp, setDefaultApp } from '../app.ts';
import { i18n } from '@core3/client/i18n';

export class AppPicker extends BaseComponent {
  private _search: HTMLInputElement | null = null;

  draw(container: HTMLElement) {
    const apps = getApps();
    const root = html.take(container).div.className('app-picker-page').ele();
    const toolbar = html.take(root).div.className('app-picker-toolbar').ele();
    const search = html.take(toolbar).div.className('app-picker-search').ele();
    const searchIcon = html.take(search).span.className('app-picker-search-icon').ele();
    appendIcon(searchIcon, 'search');
    this._search = html.take(search).input
      .type('search')
      .attr('placeholder', 'Search applications…')
      .attr('aria-label', 'Search applications')
      .ele() as HTMLInputElement;
    this._search.addEventListener('input', () => this.filter(this._search?.value || ''));
    queueMicrotask(() => this._search?.focus({ preventScroll: true }));
    const grid = html.take(root).div.className('app-picker-grid').ele();
    for (const app of apps) {
      const card = html.take(grid).button.className(`app-picker-card${app.available ? '' : ' disabled'}`)
        .attr('type', 'button').ele();
      card.dataset.appPickerSearch = `${app.label || ''} ${app.id} ${app.description || ''}`.toLocaleLowerCase();
      const icon = html.take(card).span.className('app-picker-icon').ele();
      appendIcon(icon, app.icon || 'grid');
      const copy = html.take(card).div.className('app-picker-copy').ele();
      html.take(copy).div.className('app-picker-name').text(app.label || app.id);
      html.take(copy).div.className('app-picker-description').text(app.description || '');
      if (!app.available) html.take(card).span.className('app-picker-status').text(i18n.tKey('shell.soon', {}, 'Coming soon'));
      if (app.available) {
        card.addEventListener('click', () => {
          setDefaultApp(String(app.id));
          selectApp(app);
        });
      }
    }
  }

  private filter(value: string) {
    const query = value.trim().toLocaleLowerCase();
    this._container?.querySelectorAll<HTMLElement>('[data-app-picker-search]').forEach((card) => {
      card.hidden = Boolean(query) && !card.dataset.appPickerSearch?.includes(query);
    });
  }

  dispose() {
    this._search = null;
    super.dispose();
  }
}

export async function mount(container: HTMLElement) {
  new AppPicker('app-picker', {}).mount(container);
}

import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';
import { appendFilledIcon, appendIcon } from '@core3/client/components/Icon';
import { getApps, selectApp, setDefaultApp } from '../app.ts';

export class AppPicker extends BaseComponent {
  private _search: HTMLInputElement | null = null;

  draw(container: HTMLElement) {
    const apps = getApps().filter((app: any) => app.available);
    const pinned = apps.slice(0, 6);
    const root = html.take(container).div.className('app-picker-page').ele();
    const toolbar = html.take(root).div.className('app-picker-toolbar').ele();
    const search = html.take(toolbar).div.className('app-picker-search').ele();
    const searchIcon = html.take(search).span.className('app-picker-search-icon').ele();
    appendFilledIcon(searchIcon, 'ai');
    html.take(search).span.className('app-picker-command-scope').text('Ask Core3');
    this._search = html.take(search).input
      .type('search')
      .attr('placeholder', 'Ask anything or search applications…')
      .attr('aria-label', 'Ask Core3 anything or search applications')
      .ele() as HTMLInputElement;
    this._search.addEventListener('input', () => this.filter(this._search?.value || ''));
    queueMicrotask(() => this._search?.focus({ preventScroll: true }));
    const pinnedSection = html.take(root).section.className('app-picker-section app-picker-pinned-section').ele();
    const pinnedHeading = html.take(pinnedSection).div.className('app-picker-section-heading').ele();
    html.take(pinnedHeading).h2.text('Pinned');
    const pinnedGrid = html.take(pinnedSection).div.className('app-picker-grid app-picker-pinned-grid').ele();
    pinned.forEach((app: any) => this.drawCard(pinnedGrid, app, true));

    const allSection = html.take(root).section.className('app-picker-section').ele();
    const allHeading = html.take(allSection).div.className('app-picker-section-heading').ele();
    html.take(allHeading).h2.text('All applications');
    const grid = html.take(allSection).div.className('app-picker-grid').ele();
    for (const app of apps) {
      this.drawCard(grid, app);
    }
  }

  private drawCard(grid: HTMLElement, app: any, pinned = false) {
      const card = html.take(grid).button.className(`app-picker-card${app.available ? '' : ' disabled'}`)
        .attr('type', 'button').ele();
      if (pinned) card.classList.add('app-picker-card-pinned');
      card.dataset.appPickerSearch = `${app.label || ''} ${app.id} ${app.description || ''}`.toLocaleLowerCase();
      const icon = html.take(card).span.className('app-picker-icon').ele();
      appendFilledIcon(icon, app.icon || 'grid');
      const copy = html.take(card).div.className('app-picker-copy').ele();
      html.take(copy).div.className('app-picker-name').text(app.label || app.id);
      if (app.available) {
        card.addEventListener('click', () => {
          setDefaultApp(String(app.id));
          selectApp(app);
        });
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

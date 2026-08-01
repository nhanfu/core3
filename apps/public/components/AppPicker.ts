import { BaseComponent } from '../../lib/components/BaseComponent.ts';
import { html } from '../../lib/html.ts';
import { appendIcon } from '../../lib/components/Icon.ts';
import { getApps, selectApp, setDefaultApp } from '../app.ts';

export class AppPicker extends BaseComponent {
  draw(container: HTMLElement) {
    const apps = getApps();
    const root = html.take(container).div.className('app-picker-page').getContext();
    html.take(root).div.className('app-picker-kicker').text('CORE3 WORKSPACE');
    html.take(root).h1.className('app-picker-title').text('Choose an application');
    html.take(root).p.className('app-picker-subtitle').text('Select an application to continue. You can change it from the top menu at any time.');
    const grid = html.take(root).div.className('app-picker-grid').getContext();
    for (const app of apps) {
      const card = html.take(grid).button.className(`app-picker-card${app.available ? '' : ' disabled'}`)
        .attr('type', 'button').getContext();
      const icon = html.take(card).span.className('app-picker-icon').getContext();
      appendIcon(icon, app.icon || 'grid');
      const copy = html.take(card).div.className('app-picker-copy').getContext();
      html.take(copy).div.className('app-picker-name').text(app.label || app.id);
      html.take(copy).div.className('app-picker-description').text(app.description || '');
      if (!app.available) html.take(card).span.className('app-picker-status').text('Coming soon');
      if (app.available) {
        card.addEventListener('click', () => {
          setDefaultApp(String(app.id));
          selectApp(app);
        });
      }
    }
  }
}

export async function mount(container: HTMLElement) {
  new AppPicker('app-picker', {}).mount(container);
}

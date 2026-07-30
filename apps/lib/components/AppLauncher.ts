import { BaseComponent } from '../runtime.ts';
import { html } from '../html.ts';
import { appendIcon } from './Icon.ts';
import type { AppManifest } from '../services/AppRegistry.ts';

export type AppLauncherDefinition = { apps?: AppManifest[]; activeApp?: string; open?: boolean };

/** Generic Odoo-style application picker. It owns presentation, not routing. */
export class AppLauncher extends BaseComponent {
  def: AppLauncherDefinition;

  constructor(id: string, def: AppLauncherDefinition = {}) {
    super(id, { open: def.open ?? false });
    this.def = def;
  }

  setOpen(open: boolean) { this.setState({ open }); }

  draw(container: HTMLElement) {
    if (!this.state.open) return;
    const backdrop = html.take(container).div.className('odoo-app-launcher-backdrop').getContext();
    const panel = html.take(backdrop).section.className('odoo-app-launcher').attr('role', 'dialog').attr('aria-label', 'Applications').getContext();
    const header = html.take(panel).div.className('odoo-app-launcher-header').getContext();
    html.take(header).strong.text('Applications');
    const close = html.take(header).button.className('odoo-icon-button').type('button').attr('title', 'Close').getContext();
    appendIcon(close, 'x');
    close.addEventListener('click', () => this.setOpen(false));
    const grid = html.take(panel).div.className('odoo-app-grid').getContext();
    for (const app of this.def.apps || []) {
      const button = html.take(grid).button.className(`odoo-app-card${app.id === this.def.activeApp ? ' is-active' : ''}`).type('button').dataAttr('app-id', app.id).getContext();
      appendIcon(button, app.icon || 'grid');
      html.take(button).strong.text(app.name);
      html.take(button).small.text(app.status === 'coming_soon' ? 'Coming soon' : app.description || 'Open application');
      button.addEventListener('click', () => { this.setOpen(false); void this.submit('select', { app: app.id, manifest: app }); });
    }
    backdrop.addEventListener('click', event => { if (event.target === backdrop) this.setOpen(false); });
  }
}

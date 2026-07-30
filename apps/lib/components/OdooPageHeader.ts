import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';

export type OdooHeaderAction = { id: string; label: string; variant?: string };

export class OdooPageHeader extends BaseComponent {
  constructor(id: string, state: { eyebrow?: string; title?: string; actions?: OdooHeaderAction[] } = {}) {
    super(id, state);
  }

  draw(container: HTMLElement) {
    const root = html.take(container).div.className('odoo-page-header').getContext();
    const copy = html.take(root).div.getContext();
    html.take(copy).div.className('odoo-eyebrow').text(this.state.eyebrow || '');
    html.take(copy).h1.text(this.state.title || '');
    const actions = html.take(root).div.className('odoo-page-actions').getContext();
    for (const action of this.state.actions || []) {
      const button = html.take(actions).button.className(`odoo-button ${action.variant || 'secondary'}`).type('button').text(action.label).getContext();
      button.addEventListener('click', () => void this.submit('action', { id: action.id }));
    }
  }
}

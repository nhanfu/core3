import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';

export class OdooStatButton extends BaseComponent {
  constructor(id: string, state: { label?: string; value?: string | number; icon?: string } = {}) {
    super(id, state);
  }

  draw(container: HTMLElement) {
    const button = html.take(container).button.className('odoo-stat-button').type('button').getContext();
    html.take(button).strong.text(String(this.state.value ?? '0'));
    html.take(button).span.text(String(this.state.label || 'Related records'));
    button.addEventListener('click', () => void this.submit('open', {}));
  }
}

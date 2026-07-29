import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';

export class OdooState extends BaseComponent {
  private element: HTMLElement | null = null;

  constructor(id: string, state: { mode?: 'loading' | 'empty' | 'error'; message?: string } = {}) {
    super(id, { mode: state.mode || 'loading', message: state.message || 'Loading…' });
  }

  draw(container: HTMLElement) {
    this.element = html.take(container).div.className(`odoo-state odoo-state-${this.state.mode}`).getContext();
    html.take(this.element).strong.text(this.state.mode === 'error' ? 'Unable to load' : this.state.mode === 'empty' ? 'Nothing here yet' : 'Loading');
    html.take(this.element).span.text(this.state.message);
  }

  remove() {
    this.element?.remove();
    this.element = null;
    this.dispose();
  }
}

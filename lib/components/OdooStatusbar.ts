import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';

export type OdooStatusbarStage = { value: string; label: string };

/** Generic form statusbar for ordered workflow states. */
export class OdooStatusbar extends BaseComponent {
  constructor(id: string, state: { value?: string; stages?: OdooStatusbarStage[] } = {}) {
    super(id, { value: state.value || '', stages: state.stages || [] });
  }

  draw(container: HTMLElement) {
    const root = html.take(container).nav.className('odoo-statusbar').attr('aria-label', 'Record status').getContext();
    for (const stage of this.state.stages || []) {
      const button = html.take(root).button.className(`odoo-statusbar-stage${stage.value === this.state.value ? ' is-current' : ''}`).type('button').text(stage.label).getContext();
      button.addEventListener('click', () => void this.submit('change', { value: stage.value }));
    }
  }
}

import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon, hasIcon } from '@core3/client/components/Icon';
import { html } from '@core3/client/html';

export type LineItemActionDefinition = {
  id: string;
  label: string;
  icon?: string;
  variant?: string;
  permission?: string;
  show_if?: string;
};

export class LineItemActions extends BaseComponent {
  readonly actions: LineItemActionDefinition[];
  readonly onAction: (action: LineItemActionDefinition) => void;

  constructor(id: string, state: { actions: LineItemActionDefinition[]; onAction: (action: LineItemActionDefinition) => void }) {
    super(id, state);
    this.actions = state.actions;
    this.onAction = state.onAction;
  }

  draw(container: HTMLElement) {
    const bar = html.take(container).div.className('o-line-actions').ele();
    for (const action of this.actions) {
      const button = html.take(bar).button.type('button').className(`o-x2many-row-action${action.variant === 'danger' ? ' is-danger' : ''}`).ele();
      html.take(button).attr('aria-label', action.label).attr('title', action.label);
      if (action.icon && hasIcon(action.icon)) appendIcon(button, action.icon);
      else html.take(button).text(action.label);
      html.take(button).event('click', () => this.onAction(action));
    }
  }
}

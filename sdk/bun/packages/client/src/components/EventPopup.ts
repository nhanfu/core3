import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon } from '@core3/client/components/Icon';
import { html } from '@core3/client/html';
import { i18n } from '@core3/client/i18n';

/** Shared modal for YAML event actions that need to notify the user. */
export class EventPopup extends BaseComponent {
  private readonly def: any;
  private onKeyDown: ((event: KeyboardEvent) => void) | null = null;

  constructor(id: string, state: any = {}, def: any = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container: HTMLElement) {
    const overlay = html.take(container).div.className('event-overlay').attr('aria-hidden', 'false').ele() as HTMLDivElement;

    const dialog = html.take(overlay).div.className('event-dialog').attr('role', 'dialog').attr('aria-modal', 'true').ele() as HTMLDivElement;
    const titleId = `event-dialog-title-${Date.now()}`;
    html.take(dialog).attr('aria-labelledby', titleId);

    const icon = html.take(dialog).div.className('event-icon').attr('aria-hidden', 'true').ele() as HTMLDivElement;
    appendIcon(icon, this.def.icon || 'lightbulb');

    html.take(dialog).h2.className('event-title').id(titleId).text(this.def.title || i18n.tKey('shell.soon', {}, 'Coming soon'));

    html.take(dialog).p.className('event-message').text(this.def.message || i18n.tKey('coming_soon.message', {}, 'This feature is under construction.'));

    const close = () => {
      this.dispose();
      html.take(overlay).remove();
    };
    this.onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    const closeButton = html.take(dialog).button.type('button').className('btn btn-primary event-close')
      .text(this.def.close_label || i18n.tKey('labels.close', {}, 'Close')).event('click', close).ele() as HTMLButtonElement;

    html.take(overlay).event('click', event => {
      if (event.target === overlay) close();
    });
    html.take(document).event('keydown', this.onKeyDown);
    html.take(closeButton).focus();
  }

  dispose() {
    if (this.onKeyDown) html.take(document).off('keydown', this.onKeyDown);
    this.onKeyDown = null;
    super.dispose();
  }
}

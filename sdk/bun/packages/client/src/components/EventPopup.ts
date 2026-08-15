import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon } from '@core3/client/components/Icon';
import { html } from '@core3/client/html';

/** Shared modal for YAML event actions that need to notify the user. */
export class EventPopup extends BaseComponent {
  private readonly def: any;
  private onKeyDown: ((event: KeyboardEvent) => void) | null = null;

  constructor(id: string, state: any = {}, def: any = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container: HTMLElement) {
    const overlay = html.take(container).div.className('event-overlay').attr('aria-hidden', 'false').getContext() as HTMLDivElement;

    const dialog = html.take(overlay).div.className('event-dialog').attr('role', 'dialog').attr('aria-modal', 'true').getContext() as HTMLDivElement;
    const titleId = `event-dialog-title-${Date.now()}`;
    dialog.setAttribute('aria-labelledby', titleId);

    const icon = html.take(dialog).div.className('event-icon').attr('aria-hidden', 'true').getContext() as HTMLDivElement;
    appendIcon(icon, this.def.icon || 'lightbulb');

    html.take(dialog).h2.className('event-title').id(titleId).text(this.def.title || 'Coming soon');

    html.take(dialog).p.className('event-message').text(this.def.message || 'This feature is under construction.');

    const close = () => {
      this.dispose();
      overlay.remove();
    };
    this.onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    const closeButton = html.take(dialog).button.type('button').className('btn btn-primary event-close')
      .text(this.def.close_label || 'Close').event('click', close).getContext() as HTMLButtonElement;

    html.take(overlay).event('click', event => {
      if (event.target === overlay) close();
    });
    document.addEventListener('keydown', this.onKeyDown);
    closeButton.focus();
  }

  dispose() {
    if (this.onKeyDown) document.removeEventListener('keydown', this.onKeyDown);
    this.onKeyDown = null;
    super.dispose();
  }
}

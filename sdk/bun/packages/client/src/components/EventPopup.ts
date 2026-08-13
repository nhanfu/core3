import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon } from '@core3/client/components/Icon';

/** Shared modal for YAML event actions that need to notify the user. */
export class EventPopup extends BaseComponent {
  private readonly def: any;
  private onKeyDown: ((event: KeyboardEvent) => void) | null = null;

  constructor(id: string, state: any = {}, def: any = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container: HTMLElement) {
    const overlay = document.createElement('div');
    overlay.className = 'core3-event-overlay';
    overlay.setAttribute('aria-hidden', 'false');

    const dialog = document.createElement('div');
    dialog.className = 'core3-event-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const titleId = `event-dialog-title-${Date.now()}`;
    dialog.setAttribute('aria-labelledby', titleId);

    const icon = document.createElement('div');
    icon.className = 'core3-event-icon';
    appendIcon(icon, this.def.icon || 'lightbulb');
    dialog.appendChild(icon);

    const title = document.createElement('h2');
    title.className = 'core3-event-title';
    title.id = titleId;
    title.textContent = this.def.title || 'Coming soon';
    dialog.appendChild(title);

    const message = document.createElement('p');
    message.className = 'core3-event-message';
    message.textContent = this.def.message || 'This feature is under construction.';
    dialog.appendChild(message);

    const close = () => {
      this.dispose();
      overlay.remove();
    };
    this.onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn btn-primary core3-event-close';
    closeButton.textContent = this.def.close_label || 'Close';
    closeButton.addEventListener('click', close);
    dialog.appendChild(closeButton);

    overlay.addEventListener('click', event => {
      if (event.target === overlay) close();
    });
    document.addEventListener('keydown', this.onKeyDown);
    overlay.appendChild(dialog);
    container.appendChild(overlay);
    closeButton.focus();
  }

  dispose() {
    if (this.onKeyDown) document.removeEventListener('keydown', this.onKeyDown);
    this.onKeyDown = null;
    super.dispose();
  }
}

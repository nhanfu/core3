import { BaseComponent } from './BaseComponent.ts';

export type DialogInput = {
  label?: string;
  placeholder?: string;
  value?: string;
};

export type DialogOptions = {
  title?: string;
  message?: string;
  input?: DialogInput;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: (value: string) => void | Promise<void>;
  onCancel?: () => void;
};

/** Shared modal dialog for small, form-like interactions. */
export class Dialog extends BaseComponent {
  private readonly options: DialogOptions;
  private onKeyDown: ((event: KeyboardEvent) => void) | null = null;

  constructor(id: string, state: any = {}, options: DialogOptions = {}) {
    super(id, state);
    this.options = options;
  }

  draw(container: HTMLElement) {
    if (this.state.open === false) return;

    const overlay = document.createElement('div');
    overlay.className = 'core3-dialog-overlay';
    overlay.setAttribute('aria-hidden', 'false');

    const dialog = document.createElement('div');
    dialog.className = 'core3-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');

    const titleId = `dialog-title-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    dialog.setAttribute('aria-labelledby', titleId);
    const title = document.createElement('h2');
    title.className = 'core3-dialog-title';
    title.id = titleId;
    title.textContent = this.options.title || 'Dialog';
    dialog.appendChild(title);

    if (this.options.message) {
      const message = document.createElement('p');
      message.className = 'core3-dialog-message';
      message.textContent = this.options.message;
      dialog.appendChild(message);
    }

    const input = this.options.input ? document.createElement('input') : null;
    if (input) {
      const field = document.createElement('label');
      field.className = 'core3-dialog-field';
      field.textContent = this.options.input?.label || '';
      input.className = 'core3-dialog-input';
      input.type = 'text';
      input.value = this.options.input?.value || '';
      input.placeholder = this.options.input?.placeholder || '';
      input.required = true;
      field.appendChild(input);
      dialog.appendChild(field);
    }

    const footer = document.createElement('div');
    footer.className = 'core3-dialog-footer';
    const close = (notifyCancel = true) => {
      if (this.onKeyDown) document.removeEventListener('keydown', this.onKeyDown);
      this.onKeyDown = null;
      if (notifyCancel) this.options.onCancel?.();
      this.dispose();
      overlay.remove();
    };

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'core3-dialog-cancel';
    cancel.textContent = this.options.cancelLabel || 'Cancel';
    cancel.addEventListener('click', close);
    footer.appendChild(cancel);

    const confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.className = 'core3-dialog-confirm';
    confirm.textContent = this.options.confirmLabel || 'Confirm';
    confirm.addEventListener('click', () => {
      const value = input?.value.trim() || '';
      if (input && !value) {
        input.focus();
        input.classList.add('is-invalid');
        return;
      }
      close(false);
      void this.options.onConfirm?.(value);
    });
    footer.appendChild(confirm);
    dialog.appendChild(footer);

    overlay.addEventListener('click', event => {
      if (event.target === overlay) close();
    });
    this.onKeyDown = event => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', this.onKeyDown);

    overlay.appendChild(dialog);
    container.appendChild(overlay);
    (input || cancel).focus();
  }

  dispose() {
    if (this.onKeyDown) document.removeEventListener('keydown', this.onKeyDown);
    this.onKeyDown = null;
    super.dispose();
  }
}

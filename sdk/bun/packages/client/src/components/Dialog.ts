import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';

export type DialogInput = {
  label?: string;
  placeholder?: string;
  value?: string;
};

export type DialogTagGroup = {
  id: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  values?: string[];
  multiple?: boolean;
  required?: boolean;
};

export type DialogOptions = {
  title?: string;
  message?: string;
  input?: DialogInput;
  tagGroups?: DialogTagGroup[];
  confirmLabel?: string;
  dangerLabel?: string;
  cancelLabel?: string;
  messageOnly?: boolean;
  onConfirm?: (value: string, tags?: Record<string, string[]>) => void | Promise<void>;
  onDanger?: () => void | Promise<void>;
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

    const overlay = html.take(container).div.className('dialog-overlay').attr('aria-hidden', 'false').getContext() as HTMLDivElement;

    const dialog = html.take(overlay).div.className('dialog').attr('role', 'dialog').attr('aria-modal', 'true').getContext() as HTMLDivElement;

    const titleId = `dialog-title-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    html.take(dialog).h2.className('dialog-title').id(titleId).text(this.options.title || 'Dialog');

    if (this.options.message) {
      html.take(dialog).p.className('dialog-message').text(this.options.message);
    }

    const input = this.options.input
      ? html.take(dialog).label.className('dialog-field').text(this.options.input.label || '').input
        .className('dialog-input').type('text').value(this.options.input.value || '')
        .attr('placeholder', this.options.input.placeholder || '').prop('required', true).getContext() as HTMLInputElement
      : null;
    if (input) {
    }

    const tagInputs = new Map<string, HTMLInputElement[]>();
    for (const group of this.options.tagGroups || []) {
      const field = html.take(dialog).fieldset.className('dialog-tags').getContext() as HTMLFieldSetElement;
      html.take(field).legend.text(group.label);
      const choices = html.take(field).div.className('dialog-tag-choices').getContext() as HTMLDivElement;
      const inputs: HTMLInputElement[] = [];
      for (const option of group.options) {
        const label = html.take(choices).label.className('dialog-tag').getContext() as HTMLLabelElement;
        const checkbox = html.take(label).input.type('checkbox').value(option.value)
          .prop('checked', group.values?.includes(option.value) || false).getContext() as HTMLInputElement;
        if (group.multiple === false) html.take(checkbox).event('change', () => {
          if (!checkbox.checked) return;
          for (const other of inputs) if (other !== checkbox) other.checked = false;
        });
        inputs.push(checkbox);
        html.take(label).text(option.label);
      }
      tagInputs.set(group.id, inputs);
    }

    const footer = html.take(dialog).div.className('dialog-footer').getContext() as HTMLDivElement;
    const close = (notifyCancel = true) => {
      if (this.onKeyDown) document.removeEventListener('keydown', this.onKeyDown);
      this.onKeyDown = null;
      if (notifyCancel) this.options.onCancel?.();
      this.dispose();
      overlay.remove();
    };

    const cancel = html.take(footer).button.type('button').className('dialog-cancel')
      .text(this.options.cancelLabel || 'Cancel').event('click', close).getContext() as HTMLButtonElement;

    if (this.options.dangerLabel && this.options.onDanger) {
      html.take(footer).button.type('button').className('dialog-danger').text(this.options.dangerLabel)
        .event('click', () => { close(false); void this.options.onDanger?.(); });
    }

    const confirm = html.take(footer).button.type('button').className('dialog-confirm')
      .text(this.options.confirmLabel || 'Confirm').event('click', () => {
      const value = input?.value.trim() || '';
      if (input && !value) {
        input.focus();
        input.classList.add('is-invalid');
        return;
      }
      const tags = tagInputs.size
        ? Object.fromEntries([...tagInputs].map(([id, inputs]) => [id, inputs.filter(input => input.checked).map(input => input.value)]))
        : undefined;
      if ((this.options.tagGroups || []).some(group => group.required && !(tags?.[group.id]?.length))) return;
      close(false);
      if (tags) void this.options.onConfirm?.(value, tags);
      else void this.options.onConfirm?.(value);
      });

    html.take(overlay).event('click', event => {
      if (event.target === overlay) close();
    });
    this.onKeyDown = event => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', this.onKeyDown);

    (input || cancel).focus();
  }

  dispose() {
    if (this.onKeyDown) document.removeEventListener('keydown', this.onKeyDown);
    this.onKeyDown = null;
    super.dispose();
  }
}

export function showMessageDialog(options: { title?: string; message: string; confirmLabel?: string }): Promise<void> {
  return new Promise(resolve => {
    const dialog = new Dialog(`message-dialog-${Date.now()}`, { open: true }, {
      ...options,
      messageOnly: true,
      onConfirm: () => resolve(),
      onCancel: () => resolve(),
    });
    dialog.mount(document.body);
  });
}

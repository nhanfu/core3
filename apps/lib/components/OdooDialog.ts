import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';

export type OdooDialogField = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'textarea' | 'select';
  value?: string | number;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
};

export type OdooDialogState = {
  open?: boolean;
  title?: string;
  message?: string;
  fields?: OdooDialogField[];
  confirmLabel?: string;
  cancelLabel?: string;
};

export class OdooDialog extends BaseComponent {
  constructor(id: string, state: OdooDialogState = {}) {
    super(id, { open: false, confirmLabel: 'Confirm', cancelLabel: 'Cancel', ...state });
  }

  draw(container: HTMLElement) {
    if (!this.state.open) return;
    const backdrop = html.take(container).div.className('odoo-dialog-backdrop').getContext();
    const dialog = html.take(backdrop).form.className('odoo-dialog').getContext() as HTMLFormElement;
    dialog.addEventListener('submit', event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(dialog).entries());
      this.setState({ open: false }, false);
      void this.submit('submit', values);
    });
    const header = html.take(dialog).div.className('odoo-dialog-header').getContext();
    html.take(header).h2.text(this.state.title || 'Details');
    const close = html.take(header).button.className('odoo-dialog-close').type('button').attr('aria-label', 'Close').text('×').getContext();
    close.addEventListener('click', () => this.cancel());
    if (this.state.message) html.take(dialog).p.className('odoo-dialog-message').text(this.state.message);
    const body = html.take(dialog).div.className('odoo-dialog-body').getContext();
    for (const field of this.state.fields || []) this.renderField(body, field);
    const footer = html.take(dialog).div.className('odoo-dialog-footer').getContext();
    const cancel = html.take(footer).button.className('odoo-button secondary').type('button').text(this.state.cancelLabel || 'Cancel').getContext();
    cancel.addEventListener('click', () => this.cancel());
    html.take(footer).button.className('odoo-button primary').type('submit').text(this.state.confirmLabel || 'Confirm');
  }

  private renderField(container: HTMLElement, field: OdooDialogField) {
    const label = html.take(container).label.className('odoo-dialog-field').getContext();
    html.take(label).span.text(field.label);
    if (field.type === 'textarea') {
      html.take(label).textArea.attr('name', field.name).attr('placeholder', field.placeholder || '').value(String(field.value ?? ''));
      return;
    }
    if (field.type === 'select') {
      const select = html.take(label).select.attr('name', field.name).getContext() as HTMLSelectElement;
      for (const option of field.options || []) html.take(select).option.attr('value', option.value).text(option.label);
      select.value = String(field.value ?? '');
      select.required = Boolean(field.required);
      return;
    }
    const input = html.take(label).input.attr('name', field.name).attr('type', field.type || 'text').attr('placeholder', field.placeholder || '').value(String(field.value ?? '')).getContext() as HTMLInputElement;
    input.required = Boolean(field.required);
  }

  private cancel() {
    this.setState({ open: false }, false);
    void this.submit('cancel', {});
  }
}

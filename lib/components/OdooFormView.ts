import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';

export type OdooFormField = { name: string; label: string; type?: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox'; options?: Array<{ value: string; label: string }>; list?: string };

export class OdooFormView extends BaseComponent {
  fields: OdooFormField[];
  form: HTMLFormElement | null = null;

  constructor(id: string, state: { record?: Record<string, any> } = {}, fields: OdooFormField[] = []) {
    super(id, { record: state.record || {} });
    this.fields = fields;
  }

  async save() {
    if (!this.form) return;
    const values = Object.fromEntries(new FormData(this.form).entries());
    await this.submit('save', values);
  }

  draw(container: HTMLElement) {
    this.form = html.take(container).form.className('odoo-form').getContext();
    for (const field of this.fields) {
      const label = html.take(this.form).label.text(field.label).getContext();
      if (field.type === 'select') {
        const select = html.take(label).select.attr('name', field.name).getContext() as HTMLSelectElement;
        for (const option of field.options || []) html.take(select).option.attr('value', option.value).text(option.label);
        select.value = String(this.state.record[field.name] || '');
      } else if (field.type === 'textarea') {
        html.take(label).textArea.attr('name', field.name).value(String(this.state.record[field.name] ?? ''));
      } else if (field.type === 'checkbox') {
        const input = html.take(label).input.attr('name', field.name).attr('type', 'checkbox').getContext() as HTMLInputElement;
        input.checked = Boolean(this.state.record[field.name]);
      } else {
        const input = html.take(label).input.attr('name', field.name).attr('type', field.type || 'text').value(String(this.state.record[field.name] ?? '')).getContext();
        if (field.list) input.setAttribute('list', field.list);
      }
    }
    this.form.addEventListener('submit', event => {
      event.preventDefault();
      void this.save();
    });
  }
}

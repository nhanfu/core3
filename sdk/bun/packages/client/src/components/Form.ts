import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';

/** Generic inline form. Field definitions and validation remain in YAML. */
export class Form extends BaseComponent {
  constructor(id: string, state: any = {}, private readonly def: any = {}) {
    super(id, state);
  }

  draw(container: HTMLElement) {
    const section = html.take(container).section.className(this.def.class || 'drawer-section').getContext() as HTMLElement;
    if (this.def.title) {
      html.take(section).div.className('drawer-section-title').text(this.def.title);
    }
    const form = html.take(section).div.getContext() as HTMLDivElement;
    const error = html.take(form).div.className('alert alert-error').prop('hidden', true).getContext() as HTMLDivElement;
    const inputs: Record<string, HTMLInputElement> = {};
    for (const field of this.def.fields || []) {
      const group = html.take(form).div.className('form-group').getContext() as HTMLDivElement;
      html.take(group).label.className('form-label').text(`${field.label || field.field}${field.required ? ' *' : ''}`);
      const input = html.take(group).input.type(field.type || 'text').className('form-input').attr('placeholder', field.placeholder || '').getContext() as HTMLInputElement;
      inputs[field.field] = input;
    }
    const button = html.take(form).button.type('button').className(`btn btn-${this.def.submit_variant || 'primary'} btn-sm`)
      .text(this.def.submit_label || 'Submit').event('click', async () => {
      const values = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value]));
      const validation = this.validate(values);
      if (validation) {
        html.take(error).text(validation).prop('hidden', false);
        return;
      }
      html.take(error).prop('hidden', true);
      html.take(button).prop('disabled', true).replaceText(this.def.loading_label || 'Saving…');
      try {
        await this.submit(this.def.action, values);
        Object.values(inputs).forEach(input => { html.take(input).prop('value', ''); });
        html.take(button).replaceText(this.def.success_label || 'Updated');
      } catch (cause) {
        html.take(error).text(cause instanceof Error ? cause.message : String(cause)).prop('hidden', false);
        html.take(button).replaceText(this.def.submit_label || 'Submit');
      } finally {
        html.take(button).prop('disabled', false);
      }
      }).getContext() as HTMLButtonElement;
  }

  private validate(values: Record<string, string>) {
    for (const rule of this.def.validation || []) {
      if (rule.type === 'required' && (rule.fields || []).some((field: string) => !values[field])) return rule.message || 'Required fields are missing';
      if (rule.type === 'match' && values[rule.field] !== values[rule.other_field]) return rule.message || 'Values do not match';
      if (rule.type === 'min_length' && String(values[rule.field] || '').length < Number(rule.value || 0)) return rule.message || 'Value is too short';
    }
    return '';
  }
}

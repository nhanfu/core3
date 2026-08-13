import { BaseComponent } from '@core3/client/components/BaseComponent';

/** Generic inline form. Field definitions and validation remain in YAML. */
export class Form extends BaseComponent {
  constructor(id: string, state: any = {}, private readonly def: any = {}) {
    super(id, state);
  }

  draw(container: HTMLElement) {
    const section = document.createElement('section');
    section.className = this.def.class || 'drawer-section';
    if (this.def.title) {
      const title = document.createElement('div');
      title.className = 'drawer-section-title';
      title.textContent = this.def.title;
      section.appendChild(title);
    }
    const form = document.createElement('div');
    const error = document.createElement('div');
    error.className = 'alert alert-error';
    error.style.display = 'none';
    form.appendChild(error);
    const inputs: Record<string, HTMLInputElement> = {};
    for (const field of this.def.fields || []) {
      const group = document.createElement('div');
      group.className = 'form-group';
      const label = document.createElement('label');
      label.className = 'form-label';
      label.textContent = `${field.label || field.field}${field.required ? ' *' : ''}`;
      group.appendChild(label);
      const input = document.createElement('input');
      input.type = field.type || 'text';
      input.className = 'form-input';
      input.placeholder = field.placeholder || '';
      group.appendChild(input);
      form.appendChild(group);
      inputs[field.field] = input;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn btn-${this.def.submit_variant || 'primary'} btn-sm`;
    button.textContent = this.def.submit_label || 'Submit';
    button.addEventListener('click', async () => {
      const values = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value]));
      const validation = this.validate(values);
      if (validation) {
        error.textContent = validation;
        error.style.display = 'flex';
        return;
      }
      error.style.display = 'none';
      button.disabled = true;
      button.textContent = this.def.loading_label || 'Saving…';
      try {
        await this.submit(this.def.action, values);
        Object.values(inputs).forEach(input => { input.value = ''; });
        button.textContent = this.def.success_label || 'Updated';
      } catch (cause) {
        error.textContent = cause instanceof Error ? cause.message : String(cause);
        error.style.display = 'flex';
        button.textContent = this.def.submit_label || 'Submit';
      } finally {
        button.disabled = false;
      }
    });
    form.appendChild(button);
    section.appendChild(form);
    container.appendChild(section);
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

import { html } from '@core3/client/html';
import { OdooFieldEditor } from './OdooFieldEditor.ts';

export class OdooRadioEditor extends OdooFieldEditor {
  draw(container: HTMLElement) {
    const group = html.take(container).div.className('o-form-radio-editor').attr('role', 'radiogroup').ele();
    const options = Array.isArray(this.def.options) ? this.def.options : [];
    const current = String(this.currentValue() ?? '');
    options.forEach((option: any, index: number) => {
      const item = typeof option === 'string' ? { value: option, label: option } : option;
      const value = String(item.value ?? item.id ?? '');
      const label = html.take(group).label.className('o-form-radio-option').ele();
      const input = html.take(label).input.type('radio').attr('name', `radio-${this.id}`).attr('value', value).ele() as HTMLInputElement;
      input.checked = value === current;
      input.id = `${this.id}-${index}`;
      html.take(input).event('change', () => this.onChange(value));
      html.take(label).span.text(String(item.label ?? value));
    });
  }
}

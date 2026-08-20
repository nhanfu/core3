import { html } from '@core3/client/html';
import { OdooFieldEditor } from './OdooFieldEditor';

export class OdooScalarEditor extends OdooFieldEditor {
  draw(container: HTMLElement) {
    const type = this.def.type === 'number' || this.def.type === 'money' ? 'number' : 'text';
    const editor = this.prepare(html.take(container).input.type(type).ele() as HTMLInputElement);
    html.take(editor).prop('value', Array.isArray(this.currentValue()) ? (this.currentValue() as unknown[]).join(',') : String(this.currentValue()));
    if (['date', 'time', 'datetime'].includes(this.def.type || '')) {
      html.take(editor).prop('inputMode', 'numeric').prop('placeholder', this.def.type === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm');
    }
    html.take(editor).event('input', () => this.onChange(editor.value)).event('change', () => this.onChange(editor.value));
  }
}

import { html } from '@core3/client/html';
import { OdooFieldEditor } from './OdooFieldEditor.ts';

export class OdooSelectEditor extends OdooFieldEditor {
  draw(container: HTMLElement) {
    const editor = this.prepare(html.take(container).select.ele() as HTMLSelectElement);
    for (const option of this.def.options || []) {
      const item = typeof option === 'string' ? { id: option, label: option } : option;
      const value = String(item.id ?? item.value ?? '');
      html.take(editor).option.prop('value', value).text(String(item.label ?? value));
    }
    html.take(editor).prop('value', String(this.currentValue()));
    html.take(editor).event('input', () => this.onChange(editor.value)).event('change', () => this.onChange(editor.value));
  }
}

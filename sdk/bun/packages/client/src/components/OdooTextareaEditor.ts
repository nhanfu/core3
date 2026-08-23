import { html } from '@core3/client/html';
import { OdooFieldEditor } from './OdooFieldEditor.ts';

export class OdooTextareaEditor extends OdooFieldEditor {
  draw(container: HTMLElement) {
    const editor = this.prepare(html.take(container).textarea.ele() as HTMLTextAreaElement);
    html.take(editor).prop('rows', 3).prop('value', String(this.currentValue()));
    html.take(editor).event('input', () => this.onChange(editor.value)).event('change', () => this.onChange(editor.value));
  }
}

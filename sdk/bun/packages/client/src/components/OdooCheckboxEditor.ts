import { html } from '@core3/client/html';
import { OdooFieldEditor } from './OdooFieldEditor';

export class OdooCheckboxEditor extends OdooFieldEditor {
  draw(container: HTMLElement) {
    const editor = this.prepare(html.take(container).input.type('checkbox').ele() as HTMLInputElement) as HTMLInputElement;
    editor.checked = Boolean(this.currentValue());
    html.take(editor).event('input', () => this.onChange(editor.checked)).event('change', () => this.onChange(editor.checked));
  }
}

import { DatePicker } from '@core3/client/components/DatePicker';
import { OdooFieldEditor } from './OdooFieldEditor.ts';

export class OdooDateEditor extends OdooFieldEditor {
  draw(container: HTMLElement) {
    const picker = new DatePicker(`${this.id}-picker`, {
      value: String(this.currentValue()),
      onChange: value => this.onChange(value),
    });
    picker.parent = this;
    this.children.push(picker);
    picker.mount(container);
    if (picker.input) picker.input.dataset.formField = String(this.def.field || '');
  }
}

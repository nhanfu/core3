import { html } from '@core3/client/html';
import { AsyncSelect } from '@core3/client/components/AsyncSelect';
import { OdooFieldEditor } from './OdooFieldEditor.ts';

export class OdooAsyncSelectEditor extends OdooFieldEditor {
  draw(container: HTMLElement) {
    const select = this.createChild(AsyncSelect, `select-${this.id}`, {
      value: this.currentValue(),
      onChange: this.onChange,
    });
    select.def.options = (this.def.options || []).map(option => ({
      value: option.value ?? option.id,
      label: option.label ?? option.name ?? option.value ?? option.id,
    }));
    select.def.multiple = this.def.type === 'multi-select';
    select.def.placeholder = this.def.placeholder;
    select.mount(container);
    if (select.input) {
      select.input.dataset.formField = String(this.def.field || '');
      html.take(select.input).event('input', () => this.onChange(select.input?.value || ''));
      html.take(select.input).event('change', () => {
        const value = select.input?.value || '';
        this.onChange(this.def.type === 'multi-select' ? value.split(',').filter(Boolean) : value);
      });
    }
  }
}

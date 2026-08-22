import { html } from '@core3/client/html';
import { i18n } from '@core3/client/i18n';
import { PageField } from './PageField';

export class PageSelectField extends PageField {
  draw(container: HTMLElement) {
    const { field, fieldId, initialValue } = this.state;
    const select = html.take(container).select.ele() as HTMLSelectElement;
    html.take(select).className(`form-select form-control${field.multiple ? ' form-control-multiple' : ''}`).prop('id', fieldId);
    if (field.multiple) html.take(select).prop('multiple', true);
    if (!field.multiple) html.take(select).option.prop('value', '').replaceText(i18n.tKey('labels.select', {}, 'Chọn…'));
    for (const option of this.sourceOptions()) {
      html.take(select).option.prop('value', String(option.value ?? '')).replaceText(String(option.label ?? option.value ?? ''));
    }
    if (field.multiple) {
      const selected = new Set(Array.isArray(initialValue) ? initialValue.map(String) : String(initialValue || '').split(',').map(value => value.trim()).filter(Boolean));
      for (const option of Array.from(select.options)) html.take(option).prop('selected', selected.has(option.value));
    } else {
      html.take(select).prop('value', String(initialValue ?? ''));
    }
    this.element = select;
  }
}

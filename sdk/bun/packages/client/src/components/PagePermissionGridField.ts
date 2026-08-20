import { html } from '@core3/client/html';
import { PageField } from './PageField';

export class PagePermissionGridField extends PageField {
  draw(container: HTMLElement) {
    const { fieldId, initialValue, dataMap, field } = this.state;
    const optionRows = field.options_source && Array.isArray(dataMap[field.options_source]?.data) ? dataMap[field.options_source].data : [];
    const selected = new Set(Array.isArray(initialValue)
      ? initialValue.map(String)
      : String(initialValue || '').split(',').map(value => value.trim()).filter(Boolean));
    const hidden = html.take(container).input.type('hidden').ele() as HTMLInputElement;
    html.take(hidden).prop('id', fieldId).prop('value', [...selected].join(','));
    const groups = new Map<string, HTMLDivElement>();
    for (const option of optionRows) {
      const key = String(option.value ?? option.permission_key ?? option.id ?? '');
      if (!key) continue;
      const groupKey = String(option.group || key.split('.')[0] || 'General');
      let grid = groups.get(groupKey);
      if (!grid) {
        const section = html.take(container).section.className('permission-grid-group').ele() as HTMLElement;
        html.take(section).h3.className('permission-grid-title').replaceText(groupKey);
        grid = html.take(section).div.className('permission-grid').ele() as HTMLDivElement;
        groups.set(groupKey, grid);
      }
      const row = html.take(grid).label.className('permission-grid-item').ele() as HTMLLabelElement;
      const checkbox = html.take(row).input.type('checkbox').ele() as HTMLInputElement;
      html.take(checkbox).prop('checked', selected.has(key) || option.enabled === true).attr('aria-label', String(option.label || key));
      html.take(row).span.className('permission-grid-label').replaceText(String(option.label || key));
      html.take(checkbox).event('change', () => {
        if (checkbox.checked) selected.add(key); else selected.delete(key);
        hidden.value = [...selected].sort().join(',');
      });
    }
    this.element = hidden;
  }
}

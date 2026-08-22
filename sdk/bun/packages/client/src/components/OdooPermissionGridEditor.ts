import { html } from '@core3/client/html';
import { OdooFieldEditor } from './OdooFieldEditor';

export class OdooPermissionGridEditor extends OdooFieldEditor {
  draw(container: HTMLElement) {
    const selected = new Set(Array.isArray(this.currentValue())
      ? (this.currentValue() as unknown[]).map(String)
      : String(this.currentValue() || '').split(',').map(value => value.trim()).filter(Boolean));
    const hidden = this.prepare(html.take(container).input.type('hidden').ele() as HTMLInputElement);
    const groups = new Map<string, HTMLElement>();
    for (const option of this.state.permission_options || []) {
      const permission = String(option.value ?? option.permission_key ?? '');
      if (!permission) continue;
      const groupKey = String(option.group || permission.split('.')[0] || 'general');
      let grid = groups.get(groupKey);
      if (!grid) {
        const section = html.take(container).section.className('o-permission-grid-group').ele();
        html.take(section).h3.className('o-permission-grid-title').text(groupKey);
        grid = html.take(section).div.className('o-permission-grid').ele();
        groups.set(groupKey, grid);
      }
      const label = html.take(grid).label.className('o-permission-grid-item').ele();
      const checkbox = html.take(label).input.type('checkbox').ele() as HTMLInputElement;
      html.take(checkbox).prop('checked', selected.has(permission) || option.enabled === true);
      html.take(label).span.className('o-permission-grid-label').text(String(option.label || permission));
      html.take(checkbox).event('change', () => {
        if (checkbox.checked) selected.add(permission); else selected.delete(permission);
        const next = [...selected].sort();
        hidden.value = next.join(',');
        this.onChange(next);
      });
    }
    hidden.value = [...selected].sort().join(',');
  }
}

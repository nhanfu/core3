import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { AsyncSelect } from '@core3/client/components/AsyncSelect';

export type OdooFieldEditorChange = (value: unknown) => void;

export type OdooFieldEditorState = {
  value?: unknown;
  options?: any[];
  permission_options?: any[];
  onChange?: OdooFieldEditorChange;
};

export type OdooFieldEditorDefinition = {
  type?: string;
  field?: string;
  placeholder?: string;
  wide?: boolean;
  options?: any[];
};

abstract class OdooFieldEditor extends BaseComponent {
  protected readonly def: OdooFieldEditorDefinition;
  protected readonly onChange: OdooFieldEditorChange;

  constructor(id: string, state: OdooFieldEditorState = {}, def: OdooFieldEditorDefinition = {}) {
    super(id, state);
    this.def = def;
    this.onChange = state.onChange || (() => undefined);
  }

  protected currentValue() {
    return this.state.value ?? '';
  }

  protected prepare(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
    element.dataset.formField = String(this.def.field || '');
    html.take(element).className('o-form-inline-editor');
    return element;
  }
}

class OdooPermissionGridEditor extends OdooFieldEditor {
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

class OdooTextareaEditor extends OdooFieldEditor {
  draw(container: HTMLElement) {
    const editor = this.prepare(html.take(container).textarea.ele() as HTMLTextAreaElement);
    html.take(editor).prop('rows', 3).prop('value', String(this.currentValue()));
    html.take(editor).event('input', () => this.onChange(editor.value)).event('change', () => this.onChange(editor.value));
  }
}

class OdooAsyncSelectEditor extends OdooFieldEditor {
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

class OdooSelectEditor extends OdooFieldEditor {
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

class OdooCheckboxEditor extends OdooFieldEditor {
  draw(container: HTMLElement) {
    const editor = this.prepare(html.take(container).input.type('checkbox').ele() as HTMLInputElement) as HTMLInputElement;
    editor.checked = Boolean(this.currentValue());
    html.take(editor).event('input', () => this.onChange(editor.checked)).event('change', () => this.onChange(editor.checked));
  }
}

class OdooScalarEditor extends OdooFieldEditor {
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

type OdooFieldEditorConstructor = new (id: string, state: OdooFieldEditorState, def: OdooFieldEditorDefinition) => OdooFieldEditor;

export class OdooFieldEditorFactory {
  private static readonly registry = new Map<string, OdooFieldEditorConstructor>([
    ['permission-grid', OdooPermissionGridEditor],
    ['textarea', OdooTextareaEditor],
    ['richtext', OdooTextareaEditor],
    ['async-select', OdooAsyncSelectEditor],
    ['multi-select', OdooAsyncSelectEditor],
    ['select', OdooSelectEditor],
    ['checkbox', OdooCheckboxEditor],
  ]);

  static create(id: string, state: OdooFieldEditorState, def: OdooFieldEditorDefinition) {
    const Editor = this.registry.get(def.type || '') || OdooScalarEditor;
    return new Editor(id, state, def);
  }
}

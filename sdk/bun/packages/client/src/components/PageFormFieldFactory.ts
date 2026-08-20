import { BaseComponent } from '@core3/client/components/BaseComponent';
import { AsyncSelect } from '@core3/client/components/AsyncSelect';
import { MoneyInput } from '@core3/client/components/MoneyInput';
import { i18n } from '@core3/client/i18n';
import { html } from '@core3/client/html';

export type PageFormFieldContext = {
  container: HTMLElement;
  field: any;
  fieldId: string;
  initialValue: unknown;
  dataMap: Record<string, any>;
  parent?: BaseComponent;
};

export type PageFormFieldResult = {
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  usesAsyncSelect?: boolean;
};

type FieldRenderer = (context: PageFormFieldContext) => PageFormFieldResult;

function sourceOptions(context: PageFormFieldContext) {
  const { field, dataMap } = context;
  const rows = field.options_source && Array.isArray(dataMap[field.options_source]?.data)
    ? dataMap[field.options_source].data
    : [];
  if (field.options_source) {
    return rows.map((option: any) => ({
      value: String(option.value ?? option.id ?? option.code ?? ''),
      label: String(option.label ?? option.name ?? option.value ?? option.id ?? option.code ?? ''),
    }));
  }
  return (field.options || []).map((option: any) => {
    if (option && typeof option === 'object') {
      const value = option.value ?? option.id ?? option.code;
      return { value: String(value ?? ''), label: String(option.label ?? option.name ?? value ?? '') };
    }
    return { value: String(option ?? ''), label: String(option ?? '') };
  });
}

function nativeInput(context: PageFormFieldContext): PageFormFieldResult {
  const { container, field, fieldId, initialValue } = context;
  const input = html.take(container).input.ele() as HTMLInputElement;
  html.take(input).type(['date', 'time', 'datetime'].includes(field.type) ? 'text' : (field.type || 'text'));
  if (['date', 'time', 'datetime'].includes(field.type)) {
    html.take(input).prop('inputMode', 'numeric').prop('placeholder', field.type === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm');
  }
  html.take(input).className('form-input form-control').prop('id', fieldId).prop('value', String(initialValue ?? ''));
  return { element: input };
}

const FIELD_RENDERERS = new Map<string, FieldRenderer>();

FIELD_RENDERERS.set('permission-grid', context => {
  const { container, field, fieldId, initialValue, dataMap } = context;
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
  return { element: hidden };
});

FIELD_RENDERERS.set('async-select', context => {
  const { container, field, fieldId, initialValue, parent } = context;
  const lookup = new AsyncSelect(fieldId, { value: initialValue }, {
    options: sourceOptions(context),
    multiple: field.multiple === true,
    placeholder: field.placeholder,
    search_placeholder: field.search_placeholder,
  });
  if (parent) {
    parent.adoptChild(lookup);
  }
  lookup.mount(container);
  return { element: lookup.input!, usesAsyncSelect: true };
});

FIELD_RENDERERS.set('multi-select', context => {
  const result = FIELD_RENDERERS.get('async-select')!(context);
  return result;
});

FIELD_RENDERERS.set('money', context => {
  const { container, field, fieldId, initialValue, parent } = context;
  const money = new MoneyInput(fieldId, { value: initialValue }, {
    currency: field.currency,
    decimals: field.decimals,
    placeholder: field.placeholder,
  });
  if (parent) {
    parent.adoptChild(money);
  }
  money.mount(container);
  return { element: money.input! };
});

FIELD_RENDERERS.set('select', context => {
  const { container, field, fieldId, initialValue } = context;
  const select = html.take(container).select.ele() as HTMLSelectElement;
  html.take(select).className(`form-select form-control${field.multiple ? ' form-control-multiple' : ''}`).prop('id', fieldId);
  if (field.multiple) html.take(select).prop('multiple', true);
  if (!field.multiple) html.take(select).option.prop('value', '').replaceText(i18n.tKey('labels.select', {}, 'Chọn…'));
  for (const option of sourceOptions(context)) {
    html.take(select).option.prop('value', String(option.value ?? '')).replaceText(String(option.label ?? option.value ?? ''));
  }
  if (field.multiple) {
    const selected = new Set(Array.isArray(initialValue) ? initialValue.map(String) : String(initialValue || '').split(',').map(value => value.trim()).filter(Boolean));
    for (const option of Array.from(select.options)) html.take(option).prop('selected', selected.has(option.value));
  } else {
    html.take(select).prop('value', String(initialValue ?? ''));
  }
  return { element: select };
});

FIELD_RENDERERS.set('textarea', context => {
  const { container, field, fieldId, initialValue } = context;
  const textarea = html.take(container).textarea.ele() as HTMLTextAreaElement;
  html.take(textarea).className('form-input form-control form-textarea').prop('id', fieldId).prop('value', String(initialValue ?? ''));
  return { element: textarea };
});

FIELD_RENDERERS.set('richtext', context => {
  const result = FIELD_RENDERERS.get('textarea')!(context);
  html.take(result.element).className('form-input template-richtext form-control form-richtext');
  return result;
});

export class PageFormFieldFactory {
  static render(context: PageFormFieldContext): PageFormFieldResult {
    return (FIELD_RENDERERS.get(context.field.type) || nativeInput)(context);
  }
}

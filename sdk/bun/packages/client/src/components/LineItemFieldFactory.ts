import { BaseComponent } from '@core3/client/components/BaseComponent';
import { MoneyInput } from '@core3/client/components/MoneyInput';
import { html } from '@core3/client/html';

type LineItemFieldContext = {
  container: HTMLElement;
  field: any;
  value: unknown;
  parent: BaseComponent;
  id: string;
};

type LineItemFieldRenderer = (context: LineItemFieldContext) => HTMLInputElement | HTMLSelectElement;

const RENDERERS = new Map<string, LineItemFieldRenderer>();

RENDERERS.set('money', ({ container, field, value, parent, id }) => {
  const money = new MoneyInput(`${id}-money`, { value }, { currency: field.currency || 'VND', decimals: field.decimals ?? 0 });
  parent.adoptChild(money);
  money.mount(container);
  return money.input!;
});

RENDERERS.set('select', ({ container, field, value }) => {
  const input = html.take(container).select.className('o-line-input').ele() as HTMLSelectElement;
  for (const option of field.options || []) {
    const item = typeof option === 'object' ? option : { value: option, label: option };
    html.take(input).option.prop('value', String(item.value)).replaceText(String(item.label));
  }
  html.take(input).prop('value', String(value ?? ''));
  return input;
});

RENDERERS.set('default', ({ container, field, value }) => {
  const inputType = field.input_type || 'text';
  const input = html.take(container).input.className('o-line-input').type(inputType).ele() as HTMLInputElement;
  html.take(input).prop('value', String(value ?? ''));
  return input;
});

export class LineItemFieldFactory {
  static create(context: LineItemFieldContext) {
    return (RENDERERS.get(context.field.input_type || 'default') || RENDERERS.get('default')!)(context);
  }
}

import { BaseComponent } from '@core3/client/components/BaseComponent';
import { MoneyInput } from '@core3/client/components/MoneyInput';
import { html } from '@core3/client/html';

export type LineItemFieldDefinition = {
  id?: string;
  type: 'LineItemField';
  field: string;
  display_field?: string;
  label?: string;
  input_type?: string;
  options?: Array<string | { value: string; label: string }>;
  options_source?: string;
  readonly?: boolean;
  currency?: string;
  decimals?: number;
};

export class LineItemField extends BaseComponent {
  readonly definition: LineItemFieldDefinition;
  readonly onChange?: (value: unknown) => void;

  constructor(id: string, state: { value?: unknown; definition: LineItemFieldDefinition; onChange?: (value: unknown) => void }) {
    super(id, { value: state.value ?? '', definition: state.definition });
    this.definition = state.definition;
    this.onChange = state.onChange;
  }

  get value() { return this.state.value; }

  draw(container: HTMLElement) {
    const field = this.definition;
    const value = this.state.value ?? '';
    const inputType = field.input_type || 'text';
    const host = html.take(container).div.className('o-line-field').ele();
    let input: HTMLInputElement | HTMLSelectElement;
    if (inputType === 'money') {
      const money = new MoneyInput(`${this.id}-money`, { value }, { currency: field.currency || 'VND', decimals: field.decimals ?? 0 });
      money.parent = this;
      this.children.push(money);
      money.mount(host);
      input = money.input!;
      html.take(input).event('input', () => {
        this.state.value = input.value;
        this.onChange?.(input.value);
      }).event('change', () => {
        this.state.value = input.value;
        this.onChange?.(input.value);
      });
      return;
    } else if (inputType === 'select') {
      input = html.take(host).select.className('o-line-input').ele() as HTMLSelectElement;
      for (const option of field.options || []) {
        const item = typeof option === 'object' ? option : { value: option, label: option };
        html.take(input).option.prop('value', String(item.value)).replaceText(String(item.label));
      }
    } else {
      input = html.take(host).input.className('o-line-input').type(inputType).ele() as HTMLInputElement;
    }
    html.take(input).prop('value', String(value));
    html.take(input).attr('aria-label', field.label || field.field);
    if (field.readonly) html.take(input).prop('disabled', true);
    html.take(input).event('input', () => {
      this.state.value = input.value;
      this.onChange?.(input.value);
    }).event('change', () => {
      this.state.value = input.value;
      this.onChange?.(input.value);
    });
  }
}

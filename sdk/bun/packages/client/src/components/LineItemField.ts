import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';
import { ComLoader } from '@core3/client/components/ComLoader';

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
  private readonly componentLoader = new ComLoader();
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
    const host = html.take(container).div.className('o-line-field').ele();
    const inputType = field.input_type === 'money'
      ? 'LineItemMoneyInput'
      : field.input_type === 'select'
        ? 'LineItemSelectInput'
        : 'LineItemTextInput';
    const inputComponent = this.componentLoader.createSync(inputType, `${this.id}-input`, { value, definition: field });
    this.mountChild(inputComponent, host);
    const input = inputComponent.input;
    if (!input) return;
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

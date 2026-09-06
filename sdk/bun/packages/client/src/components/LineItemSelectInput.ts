import { html } from '@core3/client/html';
import { LineItemInput } from './LineItemInput.ts';

export class LineItemSelectInput extends LineItemInput {
  draw(container: HTMLElement) {
    const input = html.take(container).select.className('o-line-input').ele() as HTMLSelectElement;
    for (const option of this.definition.options || []) {
      const item = typeof option === 'object' ? option : { value: option, label: option };
      html.take(input).option.prop('value', String(item.value)).replaceText(String(item.label));
    }
    html.take(input).prop('value', String(this.state.value ?? ''));
    this.input = input;
  }
}

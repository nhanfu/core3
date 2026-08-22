import { html } from '@core3/client/html';
import { LineItemInput } from './LineItemInput';

export class LineItemTextInput extends LineItemInput {
  draw(container: HTMLElement) {
    const inputType = this.definition.input_type || 'text';
    const input = html.take(container).input.className('o-line-input').type(inputType).ele() as HTMLInputElement;
    html.take(input).prop('value', String(this.state.value ?? ''));
    this.input = input;
  }
}

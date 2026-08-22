import { html } from '@core3/client/html';
import { PageField } from './PageField';

export class PageNativeField extends PageField {
  draw(container: HTMLElement) {
    const { field, fieldId, initialValue } = this.state;
    const input = html.take(container).input.ele() as HTMLInputElement;
    html.take(input).type(['date', 'time', 'datetime'].includes(field.type) ? 'text' : (field.type || 'text'));
    if (['date', 'time', 'datetime'].includes(field.type)) {
      html.take(input).prop('inputMode', 'numeric').prop('placeholder', field.type === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm');
    }
    html.take(input).className('form-input form-control').prop('id', fieldId).prop('value', String(initialValue ?? ''));
    this.element = input;
  }
}

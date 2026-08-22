import { html } from '@core3/client/html';
import { PageField } from './PageField';

export class PageTextareaField extends PageField {
  draw(container: HTMLElement) {
    const { fieldId, initialValue } = this.state;
    const textarea = html.take(container).textarea.ele() as HTMLTextAreaElement;
    html.take(textarea).className('form-input form-control form-textarea').prop('id', fieldId).prop('value', String(initialValue ?? ''));
    this.element = textarea;
  }
}

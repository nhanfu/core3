import { html } from '@core3/client/html';
import { PageTextareaField } from './PageTextareaField';

export class PageRichtextField extends PageTextareaField {
  draw(container: HTMLElement) {
    super.draw(container);
    if (this.element) html.take(this.element).className('form-input template-richtext form-control form-richtext');
  }
}

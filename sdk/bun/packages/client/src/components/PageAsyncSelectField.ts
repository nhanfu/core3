import { AsyncSelect } from '@core3/client/components/AsyncSelect';
import { PageField } from './PageField';

export class PageAsyncSelectField extends PageField {
  draw(container: HTMLElement) {
    const { field, fieldId, initialValue } = this.state;
    const lookup = new AsyncSelect(fieldId, { value: initialValue }, {
      options: this.sourceOptions(),
      multiple: field.multiple === true,
      placeholder: field.placeholder,
      search_placeholder: field.search_placeholder,
    });
    this.mountChild(lookup, container);
    this.element = lookup.input;
    this.usesAsyncSelect = true;
  }
}

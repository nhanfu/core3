import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export type OdooFieldEditorChange = (value: unknown) => void;
export type OdooFieldEditorState = {
  value?: unknown;
  options?: any[];
  permission_options?: any[];
  onChange?: OdooFieldEditorChange;
};
export type OdooFieldEditorDefinition = {
  type?: string;
  field?: string;
  placeholder?: string;
  wide?: boolean;
  options?: any[];
};

export abstract class OdooFieldEditor extends BaseComponent {
  protected readonly def: OdooFieldEditorDefinition;
  protected readonly onChange: OdooFieldEditorChange;

  constructor(id: string, state: OdooFieldEditorState = {}, def: OdooFieldEditorDefinition = {}) {
    super(id, state);
    this.def = def;
    this.onChange = state.onChange || (() => undefined);
  }

  protected currentValue() { return this.state.value ?? ''; }

  protected prepare(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
    element.dataset.formField = String(this.def.field || '');
    html.take(element).className('o-form-inline-editor');
    return element;
  }
}

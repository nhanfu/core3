import { BaseComponent } from '@core3/client/components/BaseComponent';
import { i18n } from '@core3/client/i18n';
import { html } from '@core3/client/html';

export type AsyncSelectOption = { value: string; label: string };

export type AsyncSelectDefinition = {
  options?: AsyncSelectOption[];
  multiple?: boolean;
  placeholder?: string;
  search_placeholder?: string;
};

/**
 * Searchable lookup adapter for declarative forms. The page renderer owns the
 * datasource request; this component owns filtering, selection, and the
 * hidden form value so lookup policy remains server-side.
 */
export class AsyncSelect extends BaseComponent {
  readonly def: AsyncSelectDefinition;
  input: HTMLInputElement | null = null;
  private selected: string[];
  private rootElement: HTMLElement | null = null;
  private listElement: HTMLElement | null = null;
  private selectedElement: HTMLElement | null = null;
  private query = '';
  private open = false;
  private readonly outsideClick = (event: Event) => {
    if (this.rootElement && !this.rootElement.contains(event.target as Node)) this.setOpen(false);
  };

  constructor(id: string, state: { value?: unknown } = {}, def: AsyncSelectDefinition = {}) {
    super(id, state);
    this.def = def;
    const initial = Array.isArray(state.value)
      ? state.value
      : String(state.value ?? '').split(',').map(value => value.trim()).filter(Boolean);
    this.selected = (def.multiple ? initial : initial.slice(0, 1)).map(String);
  }

  private options(): AsyncSelectOption[] {
    return (this.def.options || []).map(option => ({ value: String(option.value), label: String(option.label) }));
  }

  private syncValue() {
    if (!this.input) return;
    this.input.value = this.def.multiple ? this.selected.join(',') : (this.selected[0] || '');
    html.take(this.input).dispatch(new Event('change', { bubbles: true }));
  }

  private setOpen(open: boolean) {
    this.open = open;
    if (this.rootElement) html.take(this.rootElement).toggleClass('is-open', open);
  }

  private renderOptions() {
    if (!this.listElement || !this.selectedElement) return;
    html.take(this.listElement).clear();
    html.take(this.selectedElement).clear();
    const options = this.options().filter(option => option.label.toLocaleLowerCase().includes(this.query.toLocaleLowerCase()));
    const selectedSet = new Set(this.selected);

    for (const value of this.selected) {
      const option = this.options().find(candidate => candidate.value === value);
      if (!option) continue;
      const chip = html.take(this.selectedElement).span.className('async-select-chip').text(option.label).ele() as HTMLSpanElement;
      if (this.def.multiple) {
        html.take(chip).button.type('button').className('async-select-chip-remove')
          .attr('aria-label', `${i18n.tKey('labels.remove', {}, 'Bỏ chọn')} ${option.label}`).text('×').event('click', () => {
          this.selected = this.selected.filter(selected => selected !== option.value);
          this.syncValue();
          this.renderOptions();
          });
      }
    }

    for (const option of options) {
      html.take(this.listElement).button.type('button')
        .className(`async-select-option${selectedSet.has(option.value) ? ' is-selected' : ''}`)
        .attr('role', 'option').attr('aria-selected', String(selectedSet.has(option.value))).text(option.label)
        .event('click', () => {
        if (this.def.multiple) {
          this.selected = selectedSet.has(option.value)
            ? this.selected.filter(selected => selected !== option.value)
            : [...this.selected, option.value];
        } else {
          this.selected = [option.value];
        }
        this.syncValue();
        this.renderOptions();
        if (!this.def.multiple) this.setOpen(false);
        });
    }
    if (!options.length) {
      html.take(this.listElement).div.className('async-select-empty').text(i18n.tKey('select.no_options', {}, 'No options found'));
    }
  }

  draw(container: HTMLElement) {
    const root = html.take(container).div.className('async-select').ele() as HTMLDivElement;
    this.rootElement = root;
    const hidden = html.take(root).input.type('hidden').attr('name', this.id).ele() as HTMLInputElement;
    this.input = hidden;

    const selected = html.take(root).div.className('async-select-selected').ele() as HTMLDivElement;
    this.selectedElement = selected;

    const search = html.take(root).input.type('search').className('async-select-search')
      .attr('placeholder', this.def.search_placeholder || this.def.placeholder || 'Tìm lựa chọn…')
      .attr('aria-label', this.def.search_placeholder || this.def.placeholder || 'Tìm lựa chọn…')
      .event('input', () => {
      this.query = search.value;
      this.renderOptions();
      }).event('focus', () => this.setOpen(true)).event('click', () => this.setOpen(true)).ele() as HTMLInputElement;

    const list = html.take(root).div.className('async-select-options').attr('role', 'listbox')
      .attr('aria-multiselectable', String(!!this.def.multiple)).ele() as HTMLDivElement;
    this.listElement = list;
    this.syncValue();
    this.renderOptions();
    document.addEventListener('click', this.outsideClick);
  }

  dispose() {
    document.removeEventListener('click', this.outsideClick);
    this.setOpen(false);
    this.rootElement = null;
    this.listElement = null;
    this.selectedElement = null;
    this.input = null;
    super.dispose();
  }
}

import { BaseComponent } from './BaseComponent.ts';

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
    this.input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private renderOptions() {
    if (!this.listElement || !this.selectedElement) return;
    this.listElement.innerHTML = '';
    this.selectedElement.innerHTML = '';
    const options = this.options().filter(option => option.label.toLocaleLowerCase().includes(this.query.toLocaleLowerCase()));
    const selectedSet = new Set(this.selected);

    for (const value of this.selected) {
      const option = this.options().find(candidate => candidate.value === value);
      if (!option) continue;
      const chip = document.createElement('span');
      chip.className = 'core3-async-select-chip';
      chip.textContent = option.label;
      if (this.def.multiple) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'core3-async-select-chip-remove';
        remove.setAttribute('aria-label', `Bỏ chọn ${option.label}`);
        remove.textContent = '×';
        remove.addEventListener('click', () => {
          this.selected = this.selected.filter(selected => selected !== option.value);
          this.syncValue();
          this.renderOptions();
        });
        chip.appendChild(remove);
      }
      this.selectedElement.appendChild(chip);
    }

    for (const option of options) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `core3-async-select-option${selectedSet.has(option.value) ? ' is-selected' : ''}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(selectedSet.has(option.value)));
      item.textContent = option.label;
      item.addEventListener('click', () => {
        if (this.def.multiple) {
          this.selected = selectedSet.has(option.value)
            ? this.selected.filter(selected => selected !== option.value)
            : [...this.selected, option.value];
        } else {
          this.selected = [option.value];
        }
        this.syncValue();
        this.renderOptions();
      });
      this.listElement.appendChild(item);
    }
    if (!options.length) {
      const empty = document.createElement('div');
      empty.className = 'core3-async-select-empty';
      empty.textContent = 'Không tìm thấy lựa chọn';
      this.listElement.appendChild(empty);
    }
  }

  draw(container: HTMLElement) {
    const root = document.createElement('div');
    root.className = 'core3-async-select';
    this.rootElement = root;
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = this.id;
    this.input = hidden;
    root.appendChild(hidden);

    const selected = document.createElement('div');
    selected.className = 'core3-async-select-selected';
    this.selectedElement = selected;
    root.appendChild(selected);

    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'core3-async-select-search';
    search.placeholder = this.def.search_placeholder || this.def.placeholder || 'Tìm lựa chọn…';
    search.setAttribute('aria-label', search.placeholder);
    search.addEventListener('input', () => {
      this.query = search.value;
      this.renderOptions();
    });
    root.appendChild(search);

    const list = document.createElement('div');
    list.className = 'core3-async-select-options';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-multiselectable', String(!!this.def.multiple));
    this.listElement = list;
    root.appendChild(list);
    container.appendChild(root);
    this.syncValue();
    this.renderOptions();
  }

  dispose() {
    this.rootElement = null;
    this.listElement = null;
    this.selectedElement = null;
    this.input = null;
    super.dispose();
  }
}

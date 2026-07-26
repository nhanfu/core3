import { BaseComponent } from '../runtime.ts';

export type ListToolbarAction = {
  id: string;
  label?: string;
  icon?: string;
  title?: string;
  action?: string;
  params?: Record<string, unknown>;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
};

export type ListToolbarDefinition = {
  search?: false | {
    placeholder?: string;
    action?: string;
    label?: string;
  };
  actions?: ListToolbarAction[];
  filters?: Array<{
    field: string;
    label: string;
    options: Array<string | { id: string; label: string }>;
    placeholder?: string;
  }>;
  date_range?: {
    from_field?: string;
    to_field?: string;
    from_label?: string;
    to_label?: string;
    presets?: Array<'today' | 'week' | 'month' | 'quarter' | 'year' | 'all'>;
    preset_style?: 'select' | 'segmented';
  };
  filter_sources?: string[];
};

/**
 * Shared resource-list controls: a keyword search plus optional utility
 * actions such as advanced filters, export, column selection, and help.
 */
export class ListToolbar extends BaseComponent {
  def: ListToolbarDefinition;

  constructor(
    id: string,
    state: { query?: string } = {},
    def: ListToolbarDefinition = {},
  ) {
    super(id, state);
    this.def = def;
  }

  draw(container: HTMLElement) {
    const root = document.createElement('div');
    root.className = 'flex flex-wrap items-center justify-between gap-3 bg-white';

    if (this.def.search !== false) {
      const searchDef = this.def.search || {};
      const searchWrap = document.createElement('div');
      searchWrap.className = 'relative min-w-[260px] flex-1 sm:max-w-md';

      const searchIcon = document.createElement('span');
      searchIcon.className = 'pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400';
      searchIcon.textContent = '⌕';
      searchWrap.append(searchIcon);

      const input = document.createElement('input');
      input.type = 'search';
      input.dataset.listSearch = 'true';
      input.className = 'h-10 w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
      input.value = this.state.query || '';
      input.placeholder = searchDef.placeholder || 'Search…';
      input.setAttribute('aria-label', searchDef.label || 'Search list');
      input.addEventListener('input', () => this.setState({ query: input.value }, false));
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter') this.emitSearch(searchDef.action);
      });
      searchWrap.append(input);

      if (input.value) {
        const clear = document.createElement('button');
        clear.type = 'button';
        clear.className = 'absolute inset-y-0 right-2 px-1 text-slate-400 hover:text-slate-700';
        clear.textContent = '×';
        clear.setAttribute('aria-label', 'Clear search');
        clear.addEventListener('click', () => {
          this.setState({ query: '' });
          this.submit(searchDef.action || 'search', { query: '', value: '' });
        });
        searchWrap.append(clear);
      }

      root.append(searchWrap);
    } else {
      root.append(document.createElement('div'));
    }

    if (this.def.date_range) {
      const range = document.createElement('div');
      range.className = 'flex flex-wrap items-center gap-2';
      const dateRange = this.def.date_range;
      if (dateRange.presets?.length) {
        const labels: Record<string, string> = {
          today: 'Hôm nay', week: 'Tuần này', month: 'Tháng này', quarter: 'Quý này', year: 'Năm nay', all: 'Tất cả thời gian',
        };
        const submitPreset = (value: typeof dateRange.presets[number]) => {
          const dates = this.resolvePreset(value);
          this.submit('date-range', {
            [(dateRange.from_field || 'from_date')]: dates.from,
            [(dateRange.to_field || 'to_date')]: dates.to,
          });
        };
        if (dateRange.preset_style === 'segmented') {
          const segments = document.createElement('div');
          segments.className = 'flex flex-wrap items-center gap-1 rounded-md border border-slate-300 bg-white p-1';
          segments.setAttribute('aria-label', 'Khoảng thời gian');
          for (const preset of dateRange.presets) {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.datePreset = preset;
            button.className = 'rounded px-2.5 py-1.5 text-sm text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700';
            button.textContent = labels[preset] || preset;
            button.addEventListener('click', () => submitPreset(preset));
            segments.append(button);
          }
          range.append(segments);
        } else {
          const select = document.createElement('select');
          select.className = 'h-10 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700';
          select.setAttribute('aria-label', 'Khoảng thời gian');
          const placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = 'Khoảng thời gian';
          select.append(placeholder);
          for (const preset of dateRange.presets) {
            const option = document.createElement('option');
            option.value = preset;
            option.textContent = labels[preset] || preset;
            select.append(option);
          }
          select.addEventListener('change', () => {
            const value = select.value as typeof dateRange.presets[number] | '';
            if (value) submitPreset(value);
          });
          range.append(select);
        }
      }
      const fields = [
        { key: dateRange.from_field || 'from_date', label: dateRange.from_label || 'Từ ngày' },
        { key: dateRange.to_field || 'to_date', label: dateRange.to_label || 'Đến ngày' },
      ];
      for (const field of fields) {
        const input = document.createElement('input');
        input.type = 'date';
        input.value = String((this.state as any)[field.key] || '');
        input.className = 'h-10 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700';
        input.setAttribute('aria-label', field.label);
        input.addEventListener('change', () => this.submit('date-range', { [field.key]: input.value }));
        range.append(input);
      }
      root.append(range);
    }

    if (this.def.filters?.length) {
      const filterBar = document.createElement('div');
      filterBar.className = 'flex flex-wrap items-center gap-2';
      for (const filter of this.def.filters) {
        const select = document.createElement('select');
        select.className = 'h-10 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700';
        select.setAttribute('aria-label', filter.label);
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = filter.placeholder || filter.label;
        select.append(placeholder);
        for (const optionDef of filter.options) {
          const option = document.createElement('option');
          option.value = typeof optionDef === 'string' ? optionDef : optionDef.id;
          option.textContent = typeof optionDef === 'string' ? optionDef : optionDef.label;
          select.append(option);
        }
        select.value = String((this.state as any)[filter.field] || '');
        select.addEventListener('change', () => this.submit('filter', { [filter.field]: select.value }));
        filterBar.append(select);
      }
      root.append(filterBar);
    }

    const actions = this.def.actions || [];
    if (actions.length) {
      const actionBar = document.createElement('div');
      actionBar.className = 'flex flex-wrap items-center justify-end gap-2';
      for (const action of actions) actionBar.append(this.renderAction(action));
      root.append(actionBar);
    }

    container.append(root);
  }

  private resolvePreset(preset: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all') {
    if (preset === 'all') return { from: '', to: '' };
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (preset === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    if (preset === 'month') start.setDate(1);
    if (preset === 'quarter') {
      start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
    }
    if (preset === 'year') start.setMonth(0, 1);
    const format = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()]
      .map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0'))
      .join('-');
    return { from: format(start), to: format(today) };
  }

  private emitSearch(action?: string) {
    const query = this.state.query || '';
    this.submit(action || 'search', { query, value: query });
  }

  private renderAction(action: ListToolbarAction) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.toolbarAction = action.id;
    button.className = [
      'inline-flex h-10 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors',
      this.actionClass(action.variant),
      action.disabled ? 'cursor-not-allowed opacity-50' : '',
      !action.label ? 'w-10 px-0' : '',
    ].filter(Boolean).join(' ');
    button.title = action.title || action.label || action.id;
    button.setAttribute('aria-label', action.title || action.label || action.id);
    button.disabled = Boolean(action.disabled);

    if (action.icon) {
      const icon = document.createElement('span');
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = action.icon;
      button.append(icon);
    }
    if (action.label) button.append(document.createTextNode(action.label));

    if (!action.disabled) {
      button.addEventListener('click', () => {
        this.submit(action.action || action.id, { id: action.id, ...(action.params || {}) });
      });
    }

    return button;
  }

  private actionClass(variant: ListToolbarAction['variant']) {
    if (variant === 'primary') return 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700';
    if (variant === 'ghost') return 'border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900';
    return 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50';
  }
}

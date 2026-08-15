import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon, hasIcon } from '@core3/client/components/Icon';

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
  search_button?: boolean;
  actions?: ListToolbarAction[];
  filters?: Array<{
    field: string;
    label: string;
    options?: Array<string | { id: string; label: string }>;
    options_source?: string;
    placeholder?: string;
  }>;
  date_range?: {
    from_field?: string;
    to_field?: string;
    from_label?: string;
    to_label?: string;
    presets?: Array<'today' | 'previous_month' | 'week' | 'month' | 'quarter' | 'year' | 'last_12_months' | 'all'>;
    preset_style?: 'select' | 'segmented';
    default_preset?: 'today' | 'previous_month' | 'week' | 'month' | 'quarter' | 'year' | 'last_12_months' | 'all';
    max_years?: number;
    deny_unbounded?: boolean;
  };
  filter_sources?: string[];
  advanced_filter?: boolean;
  help?: boolean | { title?: string; text?: string };
  actions_inline?: boolean;
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
    root.className = 'token-toolbar flex flex-wrap items-center justify-between gap-3 bg-white';

    if (this.def.search !== false) {
      const searchDef = this.def.search || {};
      const searchControls = document.createElement('div');
      searchControls.className = 'flex min-w-[260px] flex-1 gap-2 sm:max-w-md';
      const searchWrap = document.createElement('div');
      searchWrap.className = 'relative min-w-0 flex-1';

      const searchIcon = document.createElement('span');
      searchIcon.className = 'pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400';
      appendIcon(searchIcon, 'search');
      searchWrap.append(searchIcon);

      const input = document.createElement('input');
      input.type = 'search';
      input.dataset.listSearch = 'true';
      input.className = 'token-input h-10 w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
      input.value = this.state.query || '';
      input.placeholder = searchDef.placeholder || 'Tìm kiếm…';
      input.setAttribute('aria-label', searchDef.label || 'Tìm kiếm danh sách');
      input.addEventListener('input', () => this.setState({ query: input.value }, false));
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter') this.emitSearch(searchDef.action);
      });
      searchWrap.append(input);

      if (input.value) {
        const clear = document.createElement('button');
        clear.type = 'button';
        clear.className = 'absolute inset-y-0 right-2 px-1 text-slate-400 hover:text-slate-700';
        appendIcon(clear, 'x');
        clear.setAttribute('aria-label', 'Xóa tìm kiếm');
        clear.addEventListener('click', () => {
          this.setState({ query: '' });
          this.submit(searchDef.action || 'search', { query: '', value: '' });
        });
        searchWrap.append(clear);
      }

      searchControls.append(searchWrap);
      if (this.def.search_button) {
        const searchButton = document.createElement('button');
        searchButton.type = 'button';
        searchButton.dataset.listSearchSubmit = 'true';
        searchButton.className = 'token-control inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900';
        searchButton.title = 'Tìm kiếm';
        searchButton.setAttribute('aria-label', searchButton.title);
        const buttonIcon = document.createElement('span');
        appendIcon(buttonIcon, 'search');
        searchButton.append(buttonIcon);
        searchButton.addEventListener('click', () => this.emitSearch(searchDef.action));
        searchControls.append(searchButton);
      }
      root.append(searchControls);
    }

    const advancedContent = document.createElement('div');
    advancedContent.className = `${this.def.actions_inline ? '' : 'basis-full '}flex flex-wrap items-center gap-3`;
    const collapseAdvanced = Boolean(
      this.def.advanced_filter || this.def.filters?.length || (this.def.date_range && this.def.date_range.preset_style !== 'segmented')
    );
    let advancedOpen = !collapseAdvanced;

    if (this.def.date_range) {
      const range = document.createElement('div');
      range.className = 'flex flex-wrap items-center gap-2';
      const dateRange = this.def.date_range;
      const presets = (dateRange.presets || []).filter((preset) => !(dateRange.deny_unbounded && preset === 'all'));
      if (presets.length) {
        const labels: Record<string, string> = {
          today: 'Hôm nay', previous_month: 'Tháng trước', week: 'Tuần này', month: 'Tháng này', quarter: 'Quý này', year: 'Năm nay', last_12_months: '12 tháng', all: 'Tất cả thời gian',
        };
        const submitPreset = (value: typeof dateRange.presets[number]) => {
          const dates = this.resolvePreset(value);
          this.setState({ ...dates, preset: value }, false);
          this.submit('date-range', {
            [(dateRange.from_field || 'from_date')]: dates.from,
            [(dateRange.to_field || 'to_date')]: dates.to,
          });
        };
        if (dateRange.preset_style === 'segmented') {
          const segments = document.createElement('div');
          segments.className = 'token-control-group flex flex-wrap items-center gap-1 rounded-md border border-slate-300 bg-white p-1';
          segments.setAttribute('aria-label', 'Khoảng thời gian');
          for (const preset of presets) {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.datePreset = preset;
            button.className = `token-preset rounded px-2.5 py-1.5 text-sm transition-colors hover:bg-blue-50 hover:text-blue-700 ${this.state.preset === preset ? 'bg-blue-600 text-white' : 'text-slate-700'}`;
            button.textContent = labels[preset] || preset;
            button.addEventListener('click', () => submitPreset(preset));
            segments.append(button);
          }
          range.append(segments);
        } else {
          const select = document.createElement('select');
          select.className = 'token-input h-10 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700';
          select.setAttribute('aria-label', 'Khoảng thời gian');
          const placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = 'Khoảng thời gian';
          select.append(placeholder);
          for (const preset of presets) {
            const option = document.createElement('option');
            option.value = preset;
            option.textContent = labels[preset] || preset;
            select.append(option);
          }
          select.value = String((this.state as any).preset || '');
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
        input.type = 'text';
        input.inputMode = 'numeric';
        input.placeholder = 'YYYY-MM-DD';
        input.pattern = '\\d{4}-\\d{2}-\\d{2}';
        input.value = String((this.state as any)[field.key] || '');
        if (dateRange.max_years) {
          const bounds = rollingDateBounds(dateRange.max_years);
          input.min = bounds.from;
          input.max = bounds.to;
        }
        input.className = 'token-input h-10 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700';
        input.setAttribute('aria-label', field.label);
        input.addEventListener('change', () => {
          if (dateRange.max_years && input.value) {
            const bounds = rollingDateBounds(dateRange.max_years);
            if (input.value < bounds.from || input.value > bounds.to) {
              input.setCustomValidity(`Choose a date between ${bounds.from} and ${bounds.to}`);
              return;
            }
          }
          input.setCustomValidity('');
          this.setState({ [field.key]: input.value, preset: undefined }, false);
          this.submit('date-range', { [field.key]: input.value });
        });
        range.append(input);
      }
      advancedContent.append(range);
    }

    if (this.def.filters?.length) {
      const filterBar = document.createElement('div');
      filterBar.className = 'flex flex-wrap items-center gap-2';
      for (const filter of this.def.filters) {
        const select = document.createElement('select');
        select.className = 'token-input h-10 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700';
        select.setAttribute('aria-label', filter.label);
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = filter.placeholder || filter.label;
        select.append(placeholder);
        for (const optionDef of filter.options || []) {
          const option = document.createElement('option');
          option.value = typeof optionDef === 'string' ? optionDef : optionDef.id;
          option.textContent = typeof optionDef === 'string' ? optionDef : optionDef.label;
          select.append(option);
        }
        select.value = String((this.state as any)[filter.field] || '');
        select.addEventListener('change', () => {
          this.setState({ [filter.field]: select.value }, false);
          this.submit('filter', { [filter.field]: select.value });
        });
        filterBar.append(select);
      }
      advancedContent.append(filterBar);
    }

    if (advancedContent.childElementCount) {
      advancedContent.style.display = advancedOpen ? 'flex' : 'none';
      root.append(advancedContent);
    }

    const actions = this.def.actions || [];
    if (actions.length || collapseAdvanced || this.def.help) {
      const actionBar = document.createElement('div');
      actionBar.className = 'flex flex-wrap items-center justify-end gap-2';
      if (collapseAdvanced) {
        const advancedButton = document.createElement('button');
        advancedButton.type = 'button';
        advancedButton.className = 'token-control inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900';
        advancedButton.title = 'Bộ lọc nâng cao';
        advancedButton.setAttribute('aria-label', advancedButton.title);
        advancedButton.setAttribute('aria-expanded', 'false');
        const icon = document.createElement('span');
        appendIcon(icon, 'filter');
        advancedButton.append(icon);
        advancedButton.addEventListener('click', () => {
          advancedOpen = !advancedOpen;
          advancedContent.style.display = advancedOpen ? 'flex' : 'none';
          advancedButton.setAttribute('aria-expanded', String(advancedOpen));
          advancedButton.classList.toggle('bg-blue-50', advancedOpen);
          advancedButton.classList.toggle('text-blue-700', advancedOpen);
        });
        actionBar.append(advancedButton);
      }
      for (const action of actions) actionBar.append(this.renderAction(action));
      if (this.def.help) {
        const helpButton = document.createElement('button');
        helpButton.type = 'button';
        helpButton.className = 'token-control inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900';
        helpButton.title = typeof this.def.help === 'object' && this.def.help.title ? this.def.help.title : 'Trợ giúp';
        helpButton.setAttribute('aria-label', helpButton.title);
        const icon = document.createElement('span');
        appendIcon(icon, 'help');
        helpButton.append(icon);
        helpButton.addEventListener('click', () => {
          const text = typeof this.def.help === 'object' && this.def.help.text
            ? this.def.help.text
            : 'Dùng tìm kiếm, bộ lọc nâng cao và các cột để thu hẹp danh sách.';
          const existing = container.querySelector('[data-toolbar-help]');
          if (existing) { existing.remove(); return; }
          const panel = document.createElement('div');
          panel.dataset.toolbarHelp = 'true';
          panel.className = 'basis-full rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900';
          panel.textContent = text;
          root.append(panel);
        });
        actionBar.append(helpButton);
      }
      root.append(actionBar);
    }

    container.append(root);
  }

  private resolvePreset(preset: DateRangePreset) {
    return resolveDatePreset(preset);
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
    const label = action.id.endsWith('.export') && action.label === 'Xuất CSV' ? 'Xuất Excel' : action.label;
    button.title = action.title === 'Xuất CSV' ? 'Xuất Excel' : (action.title || label || action.id);
    button.setAttribute('aria-label', button.title);
    button.disabled = Boolean(action.disabled);

    if (action.icon) {
      const icon = document.createElement('span');
      icon.setAttribute('aria-hidden', 'true');
      if (hasIcon(action.icon)) appendIcon(icon, action.icon);
      else icon.textContent = action.icon;
      button.append(icon);
    }
    if (label) button.append(document.createTextNode(label));

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

function rollingDateBounds(years: number): { from: string; to: string } {
  const now = new Date();
  const toDate = new Date(now);
  toDate.setUTCDate(toDate.getUTCDate() + 1);
  const fromDate = new Date(now);
  fromDate.setUTCFullYear(fromDate.getUTCFullYear() - years);
  return { from: fromDate.toISOString().slice(0, 10), to: toDate.toISOString().slice(0, 10) };
}

export type DateRangePreset = 'today' | 'previous_month' | 'week' | 'month' | 'quarter' | 'year' | 'last_12_months' | 'all';

export function resolveDatePreset(preset: DateRangePreset, now = new Date()) {
  if (preset === 'all') return { from: '', to: '' };
  const today = new Date(now);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let end = today;
  if (preset === 'previous_month') {
    start.setMonth(start.getMonth() - 1, 1);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  }
  if (preset === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (preset === 'month') start.setDate(1);
  if (preset === 'quarter') start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
  if (preset === 'year') start.setMonth(0, 1);
  if (preset === 'last_12_months') start.setMonth(start.getMonth() - 11, 1);
  const format = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0'))
    .join('-');
  return { from: format(start), to: format(end) };
}

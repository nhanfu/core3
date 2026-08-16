import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon, hasIcon } from '@core3/client/components/Icon';
import { html } from '@core3/client/html';
import { i18n } from '@core3/client/i18n';

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
    const root = html.take(container).div.className('token-toolbar flex flex-wrap items-center justify-between gap-3 bg-white').ele() as HTMLDivElement;

    if (this.def.search !== false) {
      const searchDef = this.def.search || {};
      const searchControls = html.take(root).div.className('flex min-w-[260px] flex-1 gap-2 sm:max-w-md').ele() as HTMLDivElement;
      const searchWrap = html.take(searchControls).div.className('relative min-w-0 flex-1').ele() as HTMLDivElement;

      const searchIcon = html.take(searchWrap).span.className('pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400').ele() as HTMLSpanElement;
      appendIcon(searchIcon, 'search');

      const input = html.take(searchWrap).input.type('search').ele() as HTMLInputElement;
      input.dataset.listSearch = 'true';
      html.take(input).className('token-input h-10 w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100').prop('value', this.state.query || '');
      html.take(input).prop('placeholder', searchDef.placeholder || i18n.tKey('search.placeholder', {}, 'Search…')).attr('aria-label', searchDef.label || i18n.tKey('search.label', {}, 'Search list')).event('input', () => this.setState({ query: input.value }, false)).event('keydown', event => {
        if (event.key === 'Enter') this.emitSearch(searchDef.action);
      });

      if (input.value) {
        const clear = html.take(searchWrap).button.type('button').className('absolute inset-y-0 right-2 px-1 text-slate-400 hover:text-slate-700').ele() as HTMLButtonElement;
        appendIcon(clear, 'x');
        html.take(clear).attr('aria-label', i18n.tKey('search.clear', {}, 'Clear search')).event('click', () => {
          this.setState({ query: '' });
          this.submit(searchDef.action || 'search', { query: '', value: '' });
        });
      }

      if (this.def.search_button) {
        const searchButton = html.take(searchControls).button.type('button').ele() as HTMLButtonElement;
        searchButton.dataset.listSearchSubmit = 'true';
        html.take(searchButton).className('token-control inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900');
        html.take(searchButton).prop('title', i18n.tKey('search.submit', {}, 'Search')).attr('aria-label', i18n.tKey('search.submit', {}, 'Search'));
        const buttonIcon = html.take(searchButton).span.ele() as HTMLSpanElement;
        appendIcon(buttonIcon, 'search');
        html.take(searchButton).event('click', () => this.emitSearch(searchDef.action));
      }
    }

    const advancedContent = html.take(root).div.className(`${this.def.actions_inline ? '' : 'basis-full '}flex flex-wrap items-center gap-3`).ele() as HTMLDivElement;
    const collapseAdvanced = Boolean(
      this.def.advanced_filter || this.def.filters?.length || (this.def.date_range && this.def.date_range.preset_style !== 'segmented')
    );
    let advancedOpen = !collapseAdvanced;

    if (this.def.date_range) {
      const range = html.take(advancedContent).div.className('flex flex-wrap items-center gap-2').ele() as HTMLDivElement;
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
          const segments = html.take(range).div.className('token-control-group flex flex-wrap items-center gap-1 rounded-md border border-slate-300 bg-white p-1').attr('aria-label', i18n.tKey('date_range.label', {}, 'Date range')).ele() as HTMLDivElement;
          for (const preset of presets) {
            const button = html.take(segments).button.type('button').ele() as HTMLButtonElement;
            button.dataset.datePreset = preset;
            html.take(button).className(`token-preset rounded px-2.5 py-1.5 text-sm transition-colors hover:bg-blue-50 hover:text-blue-700 ${this.state.preset === preset ? 'bg-blue-600 text-white' : 'text-slate-700'}`).text(labels[preset] || preset).event('click', () => submitPreset(preset));
          }
        } else {
          const select = html.take(range).select.className('token-input h-10 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700').attr('aria-label', i18n.tKey('date_range.label', {}, 'Date range')).ele() as HTMLSelectElement;
          html.take(select).option.prop('value', '').text(i18n.tKey('date_range.label', {}, 'Date range'));
          for (const preset of presets) {
            html.take(select).option.prop('value', preset).text(labels[preset] || preset);
          }
          html.take(select).prop('value', String((this.state as any).preset || '')).event('change', () => {
            const value = select.value as typeof dateRange.presets[number] | '';
            if (value) submitPreset(value);
          });
        }
      }
      const fields = [
        { key: dateRange.from_field || 'from_date', label: dateRange.from_label || 'Từ ngày' },
        { key: dateRange.to_field || 'to_date', label: dateRange.to_label || 'Đến ngày' },
      ];
      for (const field of fields) {
        const input = html.take(range).input.type('text').prop('inputMode', 'numeric').prop('placeholder', 'YYYY-MM-DD').prop('pattern', '\\d{4}-\\d{2}-\\d{2}')
          .prop('value', String((this.state as any)[field.key] || '')).ele() as HTMLInputElement;
        if (dateRange.max_years) {
          const bounds = rollingDateBounds(dateRange.max_years);
          input.min = bounds.from;
          input.max = bounds.to;
        }
        html.take(input).className('token-input h-10 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700').attr('aria-label', field.label).event('change', () => {
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
      }
    }

    if (this.def.filters?.length) {
      const filterBar = html.take(advancedContent).div.className('flex flex-wrap items-center gap-2').ele() as HTMLDivElement;
      for (const filter of this.def.filters) {
        const select = html.take(filterBar).select.className('token-input h-10 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700').attr('aria-label', filter.label).ele() as HTMLSelectElement;
        html.take(select).option.prop('value', '').text(filter.placeholder || filter.label);
        for (const optionDef of filter.options || []) {
          html.take(select).option.prop('value', typeof optionDef === 'string' ? optionDef : optionDef.id).text(typeof optionDef === 'string' ? optionDef : optionDef.label);
        }
        html.take(select).prop('value', String((this.state as any)[filter.field] || '')).event('change', () => {
          this.setState({ [filter.field]: select.value }, false);
          this.submit('filter', { [filter.field]: select.value });
        });
      }
    }

    if (advancedContent.childElementCount) {
      html.take(advancedContent).css('display', advancedOpen ? 'flex' : 'none');
    }

    const actions = this.def.actions || [];
    if (actions.length || collapseAdvanced || this.def.help) {
      const actionBar = html.take(root).div.className('flex flex-wrap items-center justify-end gap-2').ele() as HTMLDivElement;
      if (collapseAdvanced) {
        const advancedButton = html.take(actionBar).button.type('button').ele() as HTMLButtonElement;
        html.take(advancedButton).className('token-control inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900');
        html.take(advancedButton).prop('title', i18n.tKey('search.advanced', {}, 'Advanced filters'));
        html.take(advancedButton).attr('aria-label', advancedButton.title).attr('aria-expanded', 'false');
        const icon = html.take(advancedButton).span.ele() as HTMLSpanElement;
        appendIcon(icon, 'filter');
        html.take(advancedButton).event('click', () => {
          advancedOpen = !advancedOpen;
          html.take(advancedContent).css('display', advancedOpen ? 'flex' : 'none');
          html.take(advancedButton).attr('aria-expanded', String(advancedOpen));
          html.take(advancedButton).toggleClass('bg-blue-50', advancedOpen).toggleClass('text-blue-700', advancedOpen);
        });
      }
      for (const action of actions) this.renderAction(action, actionBar);
      if (this.def.help) {
        const helpButton = html.take(actionBar).button.type('button').ele() as HTMLButtonElement;
        html.take(helpButton).className('token-control inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900');
        helpButton.title = typeof this.def.help === 'object' && this.def.help.title ? this.def.help.title : 'Trợ giúp';
        html.take(helpButton).attr('aria-label', helpButton.title);
        const icon = html.take(helpButton).span.ele() as HTMLSpanElement;
        appendIcon(icon, 'help');
        html.take(helpButton).event('click', () => {
          const text = typeof this.def.help === 'object' && this.def.help.text
            ? this.def.help.text
            : 'Dùng tìm kiếm, bộ lọc nâng cao và các cột để thu hẹp danh sách.';
          const existing = container.querySelector('[data-toolbar-help]');
          if (existing) { existing.remove(); return; }
          html.take(root).div.className('basis-full rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900').dataAttr('toolbar-help', 'true').text(text);
        });
      }
    }
  }

  private resolvePreset(preset: DateRangePreset) {
    return resolveDatePreset(preset);
  }

  private emitSearch(action?: string) {
    const query = this.state.query || '';
    this.submit(action || 'search', { query, value: query });
  }

  private renderAction(action: ListToolbarAction, parent: HTMLElement) {
    const button = html.take(parent).button.type('button').dataAttr('toolbar-action', action.id).className([
      'inline-flex h-10 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors',
      this.actionClass(action.variant),
      action.disabled ? 'cursor-not-allowed opacity-50' : '',
      !action.label ? 'w-10 px-0' : '',
    ].filter(Boolean).join(' ')).ele() as HTMLButtonElement;
    const label = action.id.endsWith('.export') && action.label === 'Xuất CSV' ? 'Xuất Excel' : action.label;
    html.take(button).attr('title', action.title === 'Xuất CSV' ? 'Xuất Excel' : (action.title || label || action.id))
      .attr('aria-label', action.title === 'Xuất CSV' ? 'Xuất Excel' : (action.title || label || action.id))
      .prop('disabled', Boolean(action.disabled));

    if (action.icon) {
      const icon = html.take(button).span.attr('aria-hidden', 'true').ele() as HTMLSpanElement;
      if (hasIcon(action.icon)) appendIcon(icon, action.icon);
      else html.take(icon).text(action.icon);
    }
    if (label) html.take(button).text(label);

    if (!action.disabled) {
      html.take(button).event('click', () => {
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

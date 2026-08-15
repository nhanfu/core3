import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon, hasIcon } from '@core3/client/components/Icon';
import { html } from '@core3/client/html';

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

function createFluentElement<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  return html.node(tag) as HTMLElementTagNameMap[K];
}

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
    const root = createFluentElement('div');
    html.take(root).className('token-toolbar flex flex-wrap items-center justify-between gap-3 bg-white');

    if (this.def.search !== false) {
      const searchDef = this.def.search || {};
      const searchControls = createFluentElement('div');
      html.take(searchControls).className('flex min-w-[260px] flex-1 gap-2 sm:max-w-md');
      const searchWrap = createFluentElement('div');
      html.take(searchWrap).className('relative min-w-0 flex-1');

      const searchIcon = createFluentElement('span');
      html.take(searchIcon).className('pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400');
      appendIcon(searchIcon, 'search');
      html.take(searchWrap).append(searchIcon);

      const input = createFluentElement('input');
      html.take(input).type('search');
      input.dataset.listSearch = 'true';
      html.take(input).className('token-input h-10 w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100').prop('value', this.state.query || '');
      html.take(input).prop('placeholder', searchDef.placeholder || 'Tìm kiếm…').attr('aria-label', searchDef.label || 'Tìm kiếm danh sách').event('input', () => this.setState({ query: input.value }, false)).event('keydown', event => {
        if (event.key === 'Enter') this.emitSearch(searchDef.action);
      });
      html.take(searchWrap).append(input);

      if (input.value) {
        const clear = createFluentElement('button');
        html.take(clear).type('button').className('absolute inset-y-0 right-2 px-1 text-slate-400 hover:text-slate-700');
        appendIcon(clear, 'x');
        html.take(clear).attr('aria-label', 'Xóa tìm kiếm').event('click', () => {
          this.setState({ query: '' });
          this.submit(searchDef.action || 'search', { query: '', value: '' });
        });
        html.take(searchWrap).append(clear);
      }

      html.take(searchControls).append(searchWrap);
      if (this.def.search_button) {
        const searchButton = createFluentElement('button');
        html.take(searchButton).type('button');
        searchButton.dataset.listSearchSubmit = 'true';
        html.take(searchButton).className('token-control inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900');
        html.take(searchButton).prop('title', 'Tìm kiếm').attr('aria-label', 'Tìm kiếm');
        const buttonIcon = createFluentElement('span');
        appendIcon(buttonIcon, 'search');
        html.take(searchButton).append(buttonIcon).event('click', () => this.emitSearch(searchDef.action));
        html.take(searchControls).append(searchButton);
      }
      html.take(root).append(searchControls);
    }

    const advancedContent = createFluentElement('div');
    html.take(advancedContent).className(`${this.def.actions_inline ? '' : 'basis-full '}flex flex-wrap items-center gap-3`);
    const collapseAdvanced = Boolean(
      this.def.advanced_filter || this.def.filters?.length || (this.def.date_range && this.def.date_range.preset_style !== 'segmented')
    );
    let advancedOpen = !collapseAdvanced;

    if (this.def.date_range) {
      const range = createFluentElement('div');
      html.take(range).className('flex flex-wrap items-center gap-2');
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
          const segments = createFluentElement('div');
          html.take(segments).className('token-control-group flex flex-wrap items-center gap-1 rounded-md border border-slate-300 bg-white p-1').attr('aria-label', 'Khoảng thời gian');
          for (const preset of presets) {
            const button = createFluentElement('button');
            html.take(button).type('button');
            button.dataset.datePreset = preset;
            html.take(button).className(`token-preset rounded px-2.5 py-1.5 text-sm transition-colors hover:bg-blue-50 hover:text-blue-700 ${this.state.preset === preset ? 'bg-blue-600 text-white' : 'text-slate-700'}`).text(labels[preset] || preset).event('click', () => submitPreset(preset));
            html.take(segments).append(button);
          }
          html.take(range).append(segments);
        } else {
          const select = createFluentElement('select');
          html.take(select).className('token-input h-10 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700').attr('aria-label', 'Khoảng thời gian');
          const placeholder = createFluentElement('option');
          html.take(placeholder).prop('value', '').text('Khoảng thời gian');
          html.take(select).append(placeholder);
          for (const preset of presets) {
            const option = createFluentElement('option');
            html.take(option).prop('value', preset).text(labels[preset] || preset);
            html.take(select).append(option);
          }
          html.take(select).prop('value', String((this.state as any).preset || '')).event('change', () => {
            const value = select.value as typeof dateRange.presets[number] | '';
            if (value) submitPreset(value);
          });
          html.take(range).append(select);
        }
      }
      const fields = [
        { key: dateRange.from_field || 'from_date', label: dateRange.from_label || 'Từ ngày' },
        { key: dateRange.to_field || 'to_date', label: dateRange.to_label || 'Đến ngày' },
      ];
      for (const field of fields) {
        const input = createFluentElement('input');
        html.take(input).type('text').prop('inputMode', 'numeric').prop('placeholder', 'YYYY-MM-DD').prop('pattern', '\\d{4}-\\d{2}-\\d{2}')
          .prop('value', String((this.state as any)[field.key] || ''));
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
        html.take(range).append(input);
      }
      html.take(advancedContent).append(range);
    }

    if (this.def.filters?.length) {
      const filterBar = createFluentElement('div');
      html.take(filterBar).className('flex flex-wrap items-center gap-2');
      for (const filter of this.def.filters) {
        const select = createFluentElement('select');
        html.take(select).className('token-input h-10 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700').attr('aria-label', filter.label);
        const placeholder = createFluentElement('option');
        html.take(placeholder).prop('value', '').text(filter.placeholder || filter.label);
        html.take(select).append(placeholder);
        for (const optionDef of filter.options || []) {
          const option = createFluentElement('option');
          html.take(option).prop('value', typeof optionDef === 'string' ? optionDef : optionDef.id).text(typeof optionDef === 'string' ? optionDef : optionDef.label);
          html.take(select).append(option);
        }
        html.take(select).prop('value', String((this.state as any)[filter.field] || '')).event('change', () => {
          this.setState({ [filter.field]: select.value }, false);
          this.submit('filter', { [filter.field]: select.value });
        });
        html.take(filterBar).append(select);
      }
      html.take(advancedContent).append(filterBar);
    }

    if (advancedContent.childElementCount) {
      html.take(advancedContent).css('display', advancedOpen ? 'flex' : 'none');
      html.take(root).append(advancedContent);
    }

    const actions = this.def.actions || [];
    if (actions.length || collapseAdvanced || this.def.help) {
      const actionBar = createFluentElement('div');
      html.take(actionBar).className('flex flex-wrap items-center justify-end gap-2');
      if (collapseAdvanced) {
        const advancedButton = createFluentElement('button');
        html.take(advancedButton).type('button');
        html.take(advancedButton).className('token-control inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900');
        html.take(advancedButton).prop('title', 'Bộ lọc nâng cao');
        html.take(advancedButton).attr('aria-label', advancedButton.title).attr('aria-expanded', 'false');
        const icon = createFluentElement('span');
        appendIcon(icon, 'filter');
        html.take(advancedButton).append(icon).event('click', () => {
          advancedOpen = !advancedOpen;
          html.take(advancedContent).css('display', advancedOpen ? 'flex' : 'none');
          html.take(advancedButton).attr('aria-expanded', String(advancedOpen));
          html.take(advancedButton).toggleClass('bg-blue-50', advancedOpen).toggleClass('text-blue-700', advancedOpen);
        });
        html.take(actionBar).append(advancedButton);
      }
      for (const action of actions) this.renderAction(action, actionBar);
      if (this.def.help) {
        const helpButton = createFluentElement('button');
        html.take(helpButton).type('button');
        html.take(helpButton).className('token-control inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900');
        helpButton.title = typeof this.def.help === 'object' && this.def.help.title ? this.def.help.title : 'Trợ giúp';
        html.take(helpButton).attr('aria-label', helpButton.title);
        const icon = createFluentElement('span');
        appendIcon(icon, 'help');
        html.take(helpButton).append(icon).event('click', () => {
          const text = typeof this.def.help === 'object' && this.def.help.text
            ? this.def.help.text
            : 'Dùng tìm kiếm, bộ lọc nâng cao và các cột để thu hẹp danh sách.';
          const existing = container.querySelector('[data-toolbar-help]');
          if (existing) { existing.remove(); return; }
          const panel = createFluentElement('div');
          panel.dataset.toolbarHelp = 'true';
          html.take(panel).className('basis-full rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900').text(text);
          html.take(root).append(panel);
        });
        html.take(actionBar).append(helpButton);
      }
      html.take(root).append(actionBar);
    }

    html.take(container).append(root);
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
    ].filter(Boolean).join(' '));
    const label = action.id.endsWith('.export') && action.label === 'Xuất CSV' ? 'Xuất Excel' : action.label;
    button.attr('title', action.title === 'Xuất CSV' ? 'Xuất Excel' : (action.title || label || action.id))
      .attr('aria-label', action.title === 'Xuất CSV' ? 'Xuất Excel' : (action.title || label || action.id))
      .prop('disabled', Boolean(action.disabled));

    if (action.icon) {
      const icon = html.take(button.getContext()).span.attr('aria-hidden', 'true').getContext() as HTMLSpanElement;
      if (hasIcon(action.icon)) appendIcon(icon, action.icon);
      else html.take(icon).text(action.icon);
    }
    if (label) html.take(button.getContext()).text(label);

    if (!action.disabled) {
      button.event('click', () => {
        this.submit(action.action || action.id, { id: action.id, ...(action.params || {}) });
      });
    }

    return button.getContext() as HTMLButtonElement;
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

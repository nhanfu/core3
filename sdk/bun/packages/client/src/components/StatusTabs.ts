import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';

export type StatusTab = {
  id: string;
  label: string;
  count?: number;
  action?: string;
  params?: Record<string, unknown>;
  disabled?: boolean;
};

export type StatusTabsOptions = {
  showCounts?: boolean;
  variant?: 'tabs' | 'toggle' | 'contained';
};

/**
 * A compact, count-aware status filter used above MovedX resource lists.
 * Definitions stay declarative while the component owns selection state and
 * emits the configured action when the selected status changes.
 */
export class StatusTabs extends BaseComponent {
  tabs: StatusTab[];
  showCounts: boolean;
  variant: 'tabs' | 'toggle' | 'contained';

  constructor(id: string, state: { active?: string } = {}, tabs: StatusTab[] = [], options: StatusTabsOptions = {}) {
    super(id, state);
    this.tabs = tabs;
    this.showCounts = options.showCounts !== false;
    this.variant = options.variant || 'tabs';
  }

  draw(container: HTMLElement) {
    const active = this.state.active ?? this.tabs[0]?.id;
    const tabList = html.take(container).div.className(`token-status-tabs ${this.variant === 'toggle'
      ? 'flex min-w-max items-center gap-2 bg-white'
      : this.variant === 'contained'
        ? 'status-tabs-contained flex min-w-max items-end gap-5 rounded-t-lg border-x border-t border-slate-200 bg-white px-4 pt-1'
      : 'flex min-w-max items-end gap-5 border-b border-slate-200 bg-white px-4'}`)
      .attr('role', 'tablist').attr('aria-label', 'Bộ lọc trạng thái').ele() as HTMLDivElement;

    for (const tab of this.tabs) {
      const selected = tab.id === active;
      const button = html.take(tabList).button.type('button').dataAttr('status-tab', tab.id).className([
        'token-status-tab',
        'inline-flex items-center gap-2 text-sm font-medium transition-colors',
        this.variant === 'toggle'
          ? 'h-10 rounded-md border px-3'
          : this.variant === 'contained'
            ? 'h-11 rounded-t-md border-b-2 px-3'
            : 'h-11 border-b-2 px-0.5',
        selected
          ? this.variant === 'toggle'
            ? 'border-blue-300 bg-blue-50 text-blue-700'
            : this.variant === 'contained'
              ? 'border-blue-600 bg-blue-50 text-blue-700'
            : 'border-blue-600 text-blue-600'
          : this.variant === 'toggle'
            ? 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900'
            : this.variant === 'contained'
              ? 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
            : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900',
        tab.disabled ? 'cursor-not-allowed opacity-50' : '',
      ].filter(Boolean).join(' ')).text(tab.label).attr('role', 'tab').attr('aria-selected', String(selected))
        .ele() as HTMLButtonElement;
      if (tab.disabled) html.take(button).prop('disabled', true);

      if (this.showCounts && tab.count !== undefined) {
        html.take(button).span.className(`token-status-count ${selected
          ? 'rounded-full bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-700'
          : 'rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600'}`).text(String(tab.count));
      }

      if (!tab.disabled) {
        html.take(button).event('click', () => {
          this.setState({ active: tab.id });
          this.submit(tab.action || 'status.select', {
            id: tab.id,
            status: tab.id,
            ...(tab.params || {}),
          });
        });
      }

    }
  }
}

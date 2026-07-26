import { BaseComponent } from '../runtime.ts';

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
};

/**
 * A compact, count-aware status filter used above MovedX resource lists.
 * Definitions stay declarative while the component owns selection state and
 * emits the configured action when the selected status changes.
 */
export class StatusTabs extends BaseComponent {
  tabs: StatusTab[];
  showCounts: boolean;

  constructor(id: string, state: { active?: string } = {}, tabs: StatusTab[] = [], options: StatusTabsOptions = {}) {
    super(id, state);
    this.tabs = tabs;
    this.showCounts = options.showCounts !== false;
  }

  draw(container: HTMLElement) {
    const active = this.state.active ?? this.tabs[0]?.id;
    const tabList = document.createElement('div');
    tabList.className = 'flex min-w-max items-end gap-5 border-b border-slate-200 bg-white px-4';
    tabList.setAttribute('role', 'tablist');
    tabList.setAttribute('aria-label', 'Status filters');

    for (const tab of this.tabs) {
      const selected = tab.id === active;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.statusTab = tab.id;
      button.className = [
        'inline-flex h-11 items-center gap-2 border-b-2 px-0.5 text-sm font-medium transition-colors',
        selected
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900',
        tab.disabled ? 'cursor-not-allowed opacity-50' : '',
      ].filter(Boolean).join(' ');
      button.textContent = tab.label;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(selected));
      if (tab.disabled) button.disabled = true;

      if (this.showCounts && tab.count !== undefined) {
        const count = document.createElement('span');
        count.className = selected
          ? 'rounded-full bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-700'
          : 'rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600';
        count.textContent = String(tab.count);
        button.append(count);
      }

      if (!tab.disabled) {
        button.addEventListener('click', () => {
          this.setState({ active: tab.id });
          this.submit(tab.action || 'status.select', {
            id: tab.id,
            status: tab.id,
            ...(tab.params || {}),
          });
        });
      }

      tabList.append(button);
    }

    container.append(tabList);
  }
}

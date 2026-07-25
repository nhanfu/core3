import { html } from '../html.js';
import { BaseComponent } from '../runtime.js';

export class ChromeTab extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state || { tabs: [], activeId: null });
    this.def = def;
  }

  draw(container) {
    const { tabs = [], activeId } = this.state;

    const wrap = html.take(container).div.className('flex flex-col').getContext();

    const tabBar = html.take(wrap).div
      .className('flex items-end gap-0.5 bg-gray-200 px-2 pt-2 border-b border-gray-300')
      .getContext();

    for (const tab of tabs) {
      const isActive = tab.id === activeId;

      const tabEl = html.take(tabBar).div
        .className(
          isActive
            ? 'relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 border-b-white rounded-t-lg cursor-pointer -mb-px z-10 select-none'
            : 'flex items-center gap-1.5 px-4 py-2 text-sm text-gray-500 bg-gray-100 hover:bg-gray-50 border border-gray-300 border-b-transparent rounded-t-lg cursor-pointer hover:text-gray-700 transition-colors select-none'
        )
        .getContext();

      html.take(tabEl).span.text(tab.label);

      if (tab.closeable) {
        const closeBtn = html.take(tabEl).button
          .className('ml-1 w-4 h-4 rounded-full inline-flex items-center justify-center text-gray-400 hover:bg-gray-300 hover:text-gray-700 text-sm leading-none transition-colors')
          .text('×')
          .getContext();
        closeBtn.addEventListener('click', e => {
          e.stopPropagation();
          const newTabs = this.state.tabs.filter(t => t.id !== tab.id);
          const newActiveId = this.state.activeId === tab.id
            ? (newTabs[newTabs.length - 1]?.id ?? null)
            : this.state.activeId;
          this.setState({ tabs: newTabs, activeId: newActiveId });
          this.submit('tab.close', { tabId: tab.id });
        });
      }

      tabEl.addEventListener('click', () => {
        this.setState({ activeId: tab.id });
      });
    }

    html.take(wrap).div
      .className('bg-white border border-gray-300 border-t-0 min-h-[48px]');
  }
}

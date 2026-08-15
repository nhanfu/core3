import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export class TabGroup extends BaseComponent {
  constructor(id, state, tabs = []) {
    super(id, state || { active: 0 });
    this.tabs = tabs;
    for (const tab of tabs) {
      if (tab.content instanceof BaseComponent) {
        tab.content.parent = this;
        this.children.push(tab.content);
      }
    }
  }

  draw(container) {
    const { active = 0 } = this.state;
    const wrap = html.take(container).div.getContext();
    const tabBar = html.take(wrap).div.className('flex border-b border-gray-200 -mb-px').getContext();

    this.tabs.forEach((tab, i) => {
      const cls = i === active
        ? 'border-b-2 border-indigo-600 text-indigo-700 font-bold'
        : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium';
      html.take(tabBar)
        .button.className(`px-4 py-2.5 text-sm ${cls} transition-colors whitespace-nowrap`)
        .text(tab.label)
        .event('click', () => this.setState({ active: i }));
    });

    const content = html.take(wrap).div.className('pt-4').getContext();
    const currentTab = this.tabs[active];
    if (currentTab?.content instanceof BaseComponent) {
      currentTab.content.mount(content);
    } else if (currentTab?.content) {
      html.take(content).innerHTML(currentTab.content);
    }
  }
}

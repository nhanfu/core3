import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { StatCard } from './StatCard.ts';

export class StatRow extends BaseComponent {
  title: string;

  constructor(id, stats = [], title = '', onNavigate: ((path: string) => void) | null = null) {
    super(id, {});
    this.stats = stats;
    this.title = title;
    this.onNavigate = onNavigate;
  }

  draw(container) {
    this.children = [];
    const cols = this.stats.length;
    const gridCls = cols === 2 ? 'grid-cols-2'
                  : cols === 3 ? 'grid-cols-3'
                  : cols === 4 ? 'grid-cols-4'
                  : cols === 5 ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5'
                  : cols === 7 ? 'grid-cols-2 md:grid-cols-4 xl:grid-cols-7'
                  : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-6';
    if (this.title) {
      html.take(container).h3.className('mb-3 text-sm font-semibold text-slate-900').text(this.title);
    }
    const grid = html.take(container).div.className(`grid ${gridCls} gap-3`).ele();

    this.stats.forEach((stat, i) => {
      const slot = html.take(grid).div.ele();
      const card = new StatCard(`${this.id}-${i}`, { ...stat, onNavigate: this.onNavigate });
      card.parent = this;
      this.children.push(card);
      card.draw(slot);
    });
  }
}

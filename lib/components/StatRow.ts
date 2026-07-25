import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';
import { StatCard } from './StatCard.ts';

export class StatRow extends BaseComponent {
  constructor(id, stats = []) {
    super(id, {});
    this.stats = stats;
  }

  draw(container) {
    this.children = [];
    const cols = this.stats.length;
    const gridCls = cols === 2 ? 'grid-cols-2'
                  : cols === 3 ? 'grid-cols-3'
                  : cols === 4 ? 'grid-cols-4'
                  : 'grid-cols-2 md:grid-cols-4';
    const grid = html.take(container).div.className(`grid ${gridCls} gap-4`).getContext();

    this.stats.forEach((stat, i) => {
      const slot = html.take(grid).div.getContext();
      const card = new StatCard(`${this.id}-${i}`, stat);
      card.parent = this;
      this.children.push(card);
      card.draw(slot);
    });
  }
}

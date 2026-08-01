import { html } from '../html.ts';
import { BaseComponent } from './BaseComponent.ts';

export class RankCell extends BaseComponent {
  draw(container) {
    const { value = 0 } = this.state;
    const rank = Number(value);

    if (rank === 1) {
      html.take(container).span
        .className('inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-100 text-yellow-800 text-sm font-bold')
        .text('1');
    } else if (rank === 2) {
      html.take(container).span
        .className('inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-300 text-gray-700 text-sm font-bold')
        .text('2');
    } else if (rank === 3) {
      html.take(container).span
        .className('inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-200 text-amber-800 text-sm font-bold')
        .text('3');
    } else {
      html.take(container).span
        .className('text-sm text-gray-700')
        .text(rank > 0 ? String(rank) : '—');
    }
  }
}

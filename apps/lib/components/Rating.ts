import { html } from '@core3/client/html';
import { BaseComponent } from './BaseComponent.ts';

export class Rating extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container) {
    const { value = 0 } = this.state;
    const d = this.def;
    const max = d.max || 5;
    const readonly = d.readonly || false;
    const wrap = html.take(container).div.className('flex flex-col gap-1').getContext();

    if (d.label) {
      html.take(wrap).label.className('text-sm font-medium text-gray-700').text(d.label);
    }

    const stars = html.take(wrap).div.className('flex gap-0.5').getContext();

    for (let i = 1; i <= max; i++) {
      const star = html.take(stars).span
        .className(`text-2xl leading-none ${readonly ? 'cursor-default' : 'cursor-pointer'} ${i <= value ? 'text-yellow-400' : 'text-gray-300'} ${readonly ? '' : 'hover:text-yellow-300'} transition-colors select-none`)
        .text(i <= value ? '★' : '☆')
        .getContext();

      if (!readonly) {
        const idx = i;
        star.addEventListener('click', () => this.setState({ value: idx }, false));
        star.addEventListener('mouseover', () => {
          star.textContent = '★';
        });
        star.addEventListener('mouseout', () => {
          star.textContent = idx <= this.state.value ? '★' : '☆';
        });
      }
    }
  }
}

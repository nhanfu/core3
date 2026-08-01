import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';

export class Kanban extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state || { columns: [] });
    this.def = def;
  }

  draw(container) {
    const { columns = [] } = this.state;
    const { cardColor = 'white' } = this.def;
    const board = html.take(container).div.className('flex gap-4 overflow-x-auto pb-4').getContext();

    for (const col of columns) {
      const colEl = html.take(board).div
        .className('flex flex-col gap-3 min-w-[260px] bg-gray-100 rounded-xl p-3')
        .attr('data-col-id', col.id)
        .getContext();

      const colHeader = html.take(colEl).div.className('flex items-center justify-between mb-1').getContext();
      html.take(colHeader).span.className('font-semibold text-gray-700 text-sm').text(col.title);
      html.take(colHeader).span
        .className('text-xs bg-gray-300 text-gray-600 rounded-full px-2 py-0.5 font-medium')
        .text(String((col.cards || []).length));

      colEl.addEventListener('dragover', e => e.preventDefault());
      colEl.addEventListener('drop', e => {
        e.preventDefault();
        const cardId = e.dataTransfer.getData('cardId');
        const fromColumn = e.dataTransfer.getData('fromColumn');
        if (cardId && fromColumn !== col.id) {
          this.submit('card.move', { cardId, fromColumn, toColumn: col.id });
        }
      });

      for (const card of (col.cards || [])) {
        const cardEl = html.take(colEl).div
          .className('rounded-lg p-3 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow')
          .style(`background: ${cardColor};`)
          .attr('draggable', 'true')
          .getContext();

        cardEl.addEventListener('dragstart', e => {
          e.dataTransfer.setData('cardId', card.id);
          e.dataTransfer.setData('fromColumn', col.id);
          e.dataTransfer.effectAllowed = 'move';
        });

        cardEl.addEventListener('click', () => {
          this.submit('card.select', { cardId: card.id, columnId: col.id });
        });

        const cardTop = html.take(cardEl).div.className('flex items-start justify-between gap-2').getContext();
        html.take(cardTop).span.className('text-sm font-medium text-gray-800').text(card.title);
        if (card.badge != null) {
          html.take(cardTop).span
            .className('text-xs bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 font-medium whitespace-nowrap')
            .text(String(card.badge));
        }

        if (card.subtitle) {
          html.take(cardEl).p.className('text-xs text-gray-500 mt-1').text(card.subtitle);
        }
      }
    }
  }
}

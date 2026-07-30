import { BaseComponent } from '../runtime.ts';
import { html } from '../html.ts';
import { appendIcon } from './Icon.ts';

export type OdooKanbanCard = {
  id: string;
  title: string;
  customer?: string;
  salesperson?: string;
  revenue?: number;
  priority?: number;
  tags?: string[];
  activity?: string;
};

export type OdooKanbanColumn = {
  id: string;
  title: string;
  count?: number;
  folded?: boolean;
  cards: OdooKanbanCard[];
};

export class OdooKanban extends BaseComponent {
  constructor(id: string, state: { columns?: OdooKanbanColumn[]; actions?: string[] } = {}) {
    super(id, { columns: state.columns || [], actions: state.actions || ['assign', 'won', 'lost', 'archive', 'delete'] });
  }

  draw(container: HTMLElement) {
    const board = html.take(container).div.className('odoo-kanban-board').getContext();
    for (const column of this.state.columns || []) {
      const columnEl = html.take(board).section.className(`odoo-kanban-column${column.folded ? ' is-folded' : ''}`).dataAttr('stage-id', column.id).getContext();
      const header = html.take(columnEl).div.className('odoo-kanban-column-header').getContext();
      html.take(header).strong.text(column.title);
      html.take(header).span.className('odoo-kanban-count').text(String(column.count ?? column.cards.length));
      const add = html.take(header).button.className('odoo-icon-button odoo-kanban-add').type('button').attr('title', `Create in ${column.title}`).getContext();
      appendIcon(add, 'plus');
      add.addEventListener('click', () => void this.submit('quick_create', { stage_id: column.id }));
      const cards = html.take(columnEl).div.className('odoo-kanban-cards').getContext();
      cards.addEventListener('dragover', event => event.preventDefault());
      cards.addEventListener('drop', event => {
        event.preventDefault();
        const cardId = (event as DragEvent).dataTransfer?.getData('card_id');
        if (cardId) void this.submit('stage_change', { id: cardId, stage_id: column.id });
      });
      for (const card of column.cards) {
        const renderedCard = this.renderCard(card, column.id);
        html.take(cards).append(renderedCard);
      }
    }
  }

  private renderCard(card: OdooKanbanCard, stageId: string) {
    const element = html.create('article').className('odoo-kanban-card').dataAttr('record-id', card.id).getContext();
    element.draggable = true;
    element.addEventListener('dragstart', event => {
      (event as DragEvent).dataTransfer?.setData('card_id', card.id);
    });
    element.addEventListener('click', () => void this.submit('open_record', { id: card.id, stage_id: stageId }));
    const top = html.take(element).div.className('odoo-kanban-card-top').getContext();
    html.take(top).strong.text(card.title);
    if (card.priority) {
      html.take(top).span.className('odoo-priority').text('★'.repeat(Math.min(card.priority, 3)));
    }
    if (card.customer) html.take(element).div.className('odoo-kanban-customer').text(card.customer);
    if (card.revenue != null) html.take(element).div.className('odoo-kanban-revenue').text(formatMoney(card.revenue));
    if (card.salesperson) html.take(element).div.className('odoo-kanban-meta').text(card.salesperson);
    if (card.activity) html.take(element).div.className('odoo-kanban-activity').text(`◷ ${card.activity}`);
    if (card.tags?.length) {
      const tags = html.take(element).div.className('odoo-tags').getContext();
      for (const tag of card.tags) {
        html.take(tags).span.text(tag);
      }
    }
    const actions = html.take(element).div.className('odoo-kanban-actions').getContext();
    for (const action of this.state.actions || []) {
      const button = html.take(actions).button.className('odoo-kanban-action').type('button').text(action === 'assign' ? 'Assign' : action[0].toUpperCase() + action.slice(1)).getContext();
      button.addEventListener('click', event => {
        event.stopPropagation();
        void this.submit('record_action', { action, id: card.id, stage_id: stageId });
      });
    }
    return element;
  }
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

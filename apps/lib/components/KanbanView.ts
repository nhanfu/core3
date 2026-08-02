import { html } from '../html.ts';
import { BaseComponent } from './BaseComponent.ts';
import { appendIcon } from './Icon.ts';
import { Dialog } from './Dialog.ts';

type ListRow = Record<string, unknown>;

export type KanbanViewDefinition = {
  id: 'list' | 'kanban';
  label: string;
  icon?: string;
  groupBy?: string;
  groups?: Array<{ value: string; label: string; color?: string }>;
  card?: { title: string; subtitle?: string; fields?: Array<{ field: string; label?: string }> };
  groupsSource?: string;
};

export type KanbanViewOptions = {
  view: KanbanViewDefinition;
  rowKey?: string;
  openAction?: string;
  onMove?: (row: ListRow, status: string) => Promise<void> | void;
  onAddStatus?: (label: string) => Promise<void> | void;
};

/** Reusable grouped board used by list-backed pages. */
export class KanbanView extends BaseComponent {
  private readonly options: KanbanViewOptions;

  constructor(id: string, state: { rows?: ListRow[] } = {}, options: KanbanViewOptions) {
    super(id, state);
    this.options = options;
  }

  draw(container: HTMLElement) {
    const rows = Array.isArray(this.state.rows) ? this.state.rows : [];
    const view = this.options.view;
    const groupBy = view.groupBy || 'status';
    const groups = (view.groups || []).map(group => ({ ...group, rows: [] as ListRow[] }));
    const byValue = new Map(groups.map(group => [String(group.value), group]));
    for (const row of rows) {
      const value = String(row[groupBy] ?? '');
      let group = byValue.get(value);
      if (!group) {
        group = { value, label: value || 'Undefined', rows: [] };
        groups.push(group);
        byValue.set(value, group);
      }
      group.rows.push(row);
    }

    const board = html.take(container).div.className('o-kanban-board').getContext();
    for (const group of groups) {
      const column = html.take(board).section.className('o-kanban-column').dataAttr('kanban-group', group.value).getContext();
      const header = html.take(column).header.className('o-kanban-column-header').getContext();
      const heading = html.take(header).div.className('o-kanban-column-title').getContext();
      if (group.color) heading.classList.add(`is-${group.color}`);
      html.take(heading).span.text(group.label);
      html.take(header).span.className('o-kanban-count').text(String(group.rows.length));
      if (this.options.onAddStatus && group === groups[groups.length - 1]) {
        const add = html.take(header).button.className('o-kanban-add-status').attr('aria-label', 'Add status').attr('title', 'Add status').getContext();
        appendIcon(add, 'plus');
        add.addEventListener('click', () => this.openAddStatusDialog());
      }

      const cards = html.take(column).div.className('o-kanban-cards').getContext();
      if (this.options.onMove) {
        cards.addEventListener('dragover', (event: DragEvent) => { event.preventDefault(); cards.classList.add('is-drop-target'); });
        cards.addEventListener('dragleave', () => cards.classList.remove('is-drop-target'));
        cards.addEventListener('drop', (event: DragEvent) => {
          event.preventDefault();
          cards.classList.remove('is-drop-target');
          const id = event.dataTransfer?.getData('application/x-core3-row-id');
          const row = rows.find((candidate: ListRow) => this.rowId(candidate, rows.indexOf(candidate)) === id);
          if (row && String(row[groupBy] ?? '') !== group.value) void this.options.onMove?.(row, group.value);
        });
      }
      for (const [index, row] of group.rows.entries()) this.drawCard(cards, row, index);
    }
  }

  private drawCard(container: HTMLElement, row: ListRow, index: number) {
    const card = html.take(container).div.className('o-kanban-card').dataAttr('row-id', this.rowId(row, index)).getContext();
    if (this.options.openAction) {
      card.tabIndex = 0;
      card.setAttribute('role', 'link');
      card.addEventListener('click', () => void this.submit(this.options.openAction!, { row }));
      card.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          void this.submit(this.options.openAction!, { row });
        }
      });
    }
    if (this.options.onMove) {
      card.draggable = true;
      card.addEventListener('dragstart', (event: DragEvent) => {
        event.dataTransfer?.setData('application/x-core3-row-id', this.rowId(row, index));
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      });
    }

    const cardDef = this.options.view.card;
    const title = row[cardDef?.title || 'name'];
    html.take(card).h3.className('o-kanban-card-title').text(title == null || title === '' ? '—' : String(title));
    if (cardDef?.subtitle) {
      const subtitle = row[cardDef.subtitle];
      if (subtitle != null && subtitle !== '') html.take(card).p.className('o-kanban-card-subtitle').text(String(subtitle));
    }
    const fields = cardDef?.fields || [];
    if (!fields.length) return;
    const details = html.take(card).div.className('o-kanban-card-fields').getContext();
    for (const field of fields) {
      const value = row[field.field];
      if (value == null || value === '') continue;
      const line = html.take(details).div.getContext();
      if (field.label) html.take(line).span.className('o-kanban-card-field-label').text(field.label);
      html.take(line).span.className('o-kanban-card-field-value').text(String(value));
    }
  }

  private openAddStatusDialog() {
    if (!this.options.onAddStatus) return;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const dialog = new Dialog(`kanban-add-status-${Date.now()}`, { open: true }, {
      title: 'Add status',
      input: { label: 'Status name', placeholder: 'Enter a status name' },
      confirmLabel: 'Add status',
      cancelLabel: 'Cancel',
      onConfirm: value => this.options.onAddStatus?.(value),
    });
    dialog.mount(host);
  }

  private rowId(row: ListRow, index: number) {
    return String(row[this.options.rowKey || 'id'] ?? index);
  }
}

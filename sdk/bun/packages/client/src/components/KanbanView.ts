import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon } from '@core3/client/components/Icon';
import { Dialog, type DialogTagGroup } from '@core3/client/components/Dialog';

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
  doubleClickAction?: string;
  onSelect?: (row: ListRow) => void;
  onMove?: (row: ListRow, status: string) => Promise<void> | void;
  onAddStatus?: (label: string, fromStates: string[], toStates: string[]) => Promise<void> | void;
  onEditStatus?: (stateId: string, label: string, fromStates: string[], toStates: string[]) => Promise<void> | void;
  onDeleteStatus?: (stateId: string, replacementState: string) => Promise<void> | void;
  transitions?: Array<{ from: string | string[]; to: string }>;
  stateEditor?: Record<string, any>;
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

    const board = html.take(container).div.className('o-kanban-board').ele();
    for (const group of groups) {
      const column = html.take(board).section.className('o-kanban-column').dataAttr('kanban-group', group.value).ele();
      const header = html.take(column).header.className('o-kanban-column-header').ele();
      const heading = html.take(header).div.className('o-kanban-column-title').ele();
      if (group.color) html.take(heading).toggleClass(`is-${group.color}`, true);
      html.take(heading).span.text(group.label);
      if (this.options.onEditStatus) {
        heading.title = this.options.stateEditor?.labels?.edit_status || '';
        html.take(heading).prop('tabIndex', 0).attr('role', 'button');
        const edit = () => this.openEditStatusDialog(group.value, group.label);
        html.take(heading).event('click', edit).event('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); edit(); }
        });
      }
      html.take(header).span.className('o-kanban-count').text(String(group.rows.length));
      if (this.options.onAddStatus && group === groups[groups.length - 1]) {
        const addLabel = this.options.stateEditor?.labels?.add_status || '';
        const add = html.take(header).button.className('o-kanban-add-status').attr('aria-label', addLabel).attr('title', addLabel).ele();
        appendIcon(add, 'plus');
        html.take(add).event('click', () => this.openAddStatusDialog());
      }

      const cards = html.take(column).div.className('o-kanban-cards').ele();
      if (this.options.onMove) {
        html.take(cards).event('dragover', (event: DragEvent) => { event.preventDefault(); html.take(cards).toggleClass('is-drop-target', true); }).event('dragleave', () => html.take(cards).toggleClass('is-drop-target', false)).event('drop', (event: DragEvent) => {
          event.preventDefault();
          html.take(cards).toggleClass('is-drop-target', false);
          const id = event.dataTransfer?.getData('application/x-row-id');
          const row = rows.find((candidate: ListRow) => this.rowId(candidate, rows.indexOf(candidate)) === id);
          if (row && String(row[groupBy] ?? '') !== group.value) void this.options.onMove?.(row, group.value);
        });
      }
      for (const [index, row] of group.rows.entries()) this.drawCard(cards, row, index);
    }
  }

  private drawCard(container: HTMLElement, row: ListRow, index: number) {
    const card = html.take(container).div.className('o-kanban-card').dataAttr('row-id', this.rowId(row, index)).ele();
    if (this.options.openAction || this.options.doubleClickAction || this.options.onSelect) {
      html.take(card).prop('tabIndex', 0).attr('role', this.options.onSelect ? 'button' : 'link');
      let clickTimer: ReturnType<typeof setTimeout> | undefined;
      const selectOrOpen = () => {
        if (this.options.onSelect) this.options.onSelect(row);
        else if (this.options.openAction) void this.submit(this.options.openAction, { row });
      };
      html.take(card).event('click', () => {
        if (!this.options.doubleClickAction) {
          selectOrOpen();
          return;
        }
        if (clickTimer) clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
          clickTimer = undefined;
          selectOrOpen();
        }, 250);
      });
      html.take(card).event('dblclick', () => {
        if (clickTimer) clearTimeout(clickTimer);
        clickTimer = undefined;
        if (this.options.doubleClickAction) void this.submit(this.options.doubleClickAction, { row });
      });
      html.take(card).event('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectOrOpen();
        }
      });
    }
    if (this.options.onMove) {
      html.take(card).prop('draggable', true).event('dragstart', (event: DragEvent) => {
        event.dataTransfer?.setData('application/x-row-id', this.rowId(row, index));
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
    const details = html.take(card).div.className('o-kanban-card-fields').ele();
    for (const field of fields) {
      const value = row[field.field];
      if (value == null || value === '') continue;
      const line = html.take(details).div.ele();
      if (field.label) html.take(line).span.className('o-kanban-card-field-label').text(field.label);
      html.take(line).span.className('o-kanban-card-field-value').text(String(value));
    }
  }

  private openAddStatusDialog() {
    if (!this.options.onAddStatus) return;
    const host = html.take(document.body).div.ele() as HTMLDivElement;
    const modal = this.options.stateEditor?.modals?.add || {};
    const dialog = new Dialog(`kanban-add-status-${Date.now()}`, { open: true }, {
      title: modal.title,
      input: modal.input,
      tagGroups: this.statusTagGroups([], [], undefined, modal),
      confirmLabel: modal.confirm_label,
      cancelLabel: modal.cancel_label,
      onConfirm: (value, tags) => this.options.onAddStatus?.(value, tags?.from || [], tags?.to || []),
    });
    dialog.mount(host);
  }

  private openEditStatusDialog(stateId: string, label: string) {
    if (!this.options.onEditStatus) return;
    const fromStates: string[] = [];
    const toStates: string[] = [];
    for (const transition of this.options.transitions || []) {
      const from = Array.isArray(transition.from) ? transition.from : [transition.from];
      if (transition.to === stateId) fromStates.push(...from);
      if (from.includes(stateId)) toStates.push(transition.to);
    }
    const host = html.take(document.body).div.ele() as HTMLDivElement;
    const modal = this.options.stateEditor?.modals?.edit || {};
    const dialog = new Dialog(`kanban-edit-status-${Date.now()}`, { open: true }, {
      title: modal.title,
      input: { ...modal.input, value: label },
      tagGroups: this.statusTagGroups(fromStates, toStates, stateId, modal),
      confirmLabel: modal.confirm_label,
      cancelLabel: modal.cancel_label,
      dangerLabel: this.options.stateEditor?.allow_delete === true ? modal.danger_label : undefined,
      onDanger: this.options.onDeleteStatus ? () => this.openDeleteStatusDialog(stateId) : undefined,
      onConfirm: (nextLabel, tags) => this.options.onEditStatus?.(stateId, nextLabel, tags?.from || [], tags?.to || []),
    });
    dialog.mount(host);
  }

  private openDeleteStatusDialog(stateId: string) {
    if (!this.options.onDeleteStatus) return;
    const options = (this.options.view.groups || []).filter(group => String(group.value) !== stateId).map(group => ({
      value: String(group.value), label: String(group.label || group.value),
    }));
    const host = html.take(document.body).div.ele() as HTMLDivElement;
    const modal = this.options.stateEditor?.modals?.delete || {};
    const dialog = new Dialog(`kanban-delete-status-${Date.now()}`, { open: true }, {
      title: modal.title,
      message: modal.message,
      tagGroups: [{ id: 'replacement', label: modal.replacement_label || '', options, multiple: false, required: true }],
      confirmLabel: modal.confirm_label,
      cancelLabel: modal.cancel_label,
      onConfirm: (_value, tags) => {
        const replacement = tags?.replacement?.[0];
        if (replacement) void this.options.onDeleteStatus?.(stateId, replacement);
      },
    });
    dialog.mount(host);
  }

  private statusTagGroups(fromValues: string[] = [], toValues: string[] = [], exclude?: string, modal: Record<string, any> = this.options.stateEditor?.modals?.edit || {}): DialogTagGroup[] {
    const options = (this.options.view.groups || []).filter(group => String(group.value) !== exclude).map(group => ({
      value: String(group.value),
      label: String(group.label || group.value),
    }));
    return [
      { id: 'from', label: modal.from_label || '', options, values: fromValues },
      { id: 'to', label: modal.to_label || '', options, values: toValues },
    ];
  }

  private rowId(row: ListRow, index: number) {
    return String(row[this.options.rowKey || 'id'] ?? index);
  }
}

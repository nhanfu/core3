import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { KanbanView } from '@core3/client/components/KanbanView';

type CardRow = Record<string, unknown>;

function initials(value: unknown) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map(word => word[0]?.toUpperCase() || '').join('') || '?';
}

export type CardViewDefinition = {
  id: 'card';
  label: string;
  icon?: string;
  groupBy?: string;
  groups?: Array<{ value: string; label: string; color?: string }>;
  groupsSource?: string;
  card?: { title: string; subtitle?: string; imageField?: string; image_field?: string; compact?: boolean; avatarField?: string; avatar_field?: string; companyField?: string; company_field?: string; primaryMetric?: string; primary_metric?: string; primaryMetricLabel?: string; primary_metric_label?: string; contactFields?: Array<{ field: string; icon?: string }>; contact_fields?: Array<{ field: string; icon?: string }>; fields?: Array<{ field: string; label?: string }>; footer?: Array<{ field: string; label?: string; totalField?: string; total_field?: string }> };
};

export type CardViewOptions = {
  view: CardViewDefinition;
  rowKey?: string;
  openAction?: string;
  doubleClickAction?: string;
  onSelect?: (row: CardRow) => void;
  emptyState?: { title?: string; description?: string };
};

/** Flat, optionally grouped card list for compact resource browsing. */
export class CardView extends BaseComponent {
  private readonly options: CardViewOptions;

  constructor(id: string, state: { rows?: CardRow[]; groupBy?: string } = {}, options: CardViewOptions) {
    super(id, state);
    this.options = options;
  }

  draw(container: HTMLElement) {
    const rows = Array.isArray(this.state.rows) ? this.state.rows : [];
    const root = html.take(container).section.className('o-card-view').ele();
    if (!rows.length) {
      const empty = this.options.emptyState || {};
      const state = html.take(root).div.className('o-list-empty').ele();
      html.take(state).h3.text(empty.title || 'No records found');
      if (empty.description) html.take(state).p.text(empty.description);
      return;
    }
    if (this.options.view.card?.compact) {
      html.take(root).toggleClass('is-compact', true);
      const kanban = new KanbanView(`compact-kanban-${this.id}`, { rows }, {
        view: { ...this.options.view as any, id: 'kanban', groupBy: '' },
        rowKey: this.options.rowKey,
        openAction: this.options.openAction,
      });
      kanban.parent = this;
      kanban._transport = this._transport;
      kanban._onAction = (action, params) => this.submit(action, params);
      kanban.draw(root);
      return;
    }
    // Grouping is a searchbar concern. The view definition may provide the
    // available group metadata, but must not enable grouping by itself.
    const groupBy = typeof this.state.groupBy === 'string' ? this.state.groupBy : '';
    if (!groupBy) {
      for (const [index, row] of rows.entries()) this.drawCard(root, row, index);
      return;
    }

    const groups = (this.options.view.groups || []).map(group => ({ ...group, rows: [] as CardRow[] }));
    const byValue = new Map(groups.map(group => [String(group.value), group]));
    // Datasources may expose either a stable code (for example, Draft) or
    // the localized display value (for example, Nháp) for the selected group
    // field. Treat both as aliases of the same predefined group.
    for (const group of groups) {
      if (group.label) byValue.set(String(group.label), group);
    }
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
    for (const group of groups) {
      const section = html.take(root).section.className('o-card-view-group').dataAttr('card-group', group.value).ele();
      const heading = html.take(section).h2.className('o-card-view-group-title').ele();
      if (group.color) html.take(heading).toggleClass(`is-${group.color}`, true);
      html.take(heading).span.text(group.label);
      html.take(heading).span.className('o-card-view-group-count').text(String(group.rows.length));
      const list = html.take(section).div.className('o-card-view-group-items').ele();
      for (const [index, row] of group.rows.entries()) this.drawCard(list, row, index);
    }
  }

  private drawCard(container: HTMLElement, row: CardRow, index: number) {
    const card = html.take(container).div.className('o-kanban-card o-card-view-item').dataAttr('row-id', this.rowId(row, index)).ele();
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

    const cardDef = this.options.view.card;
    const imageField = cardDef?.imageField || cardDef?.image_field;
    if (imageField) {
      html.take(card).toggleClass('has-avatar', true);
      const avatar = html.take(card).div.className('o-kanban-card-avatar').ele();
      const image = String(row[imageField] || '').trim();
      if (image) html.take(avatar).img.attr('src', image).attr('alt', String(row[cardDef?.title || 'name'] || 'Employee')).ele();
      else html.take(avatar).span.className('o-kanban-card-avatar-initials').text(initials(row[cardDef?.title || 'name']));
    }
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

  private rowId(row: CardRow, index: number) {
    return String(row[this.options.rowKey || 'id'] ?? index);
  }
}

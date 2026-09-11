import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

type ActivityRow = Record<string, unknown>;

export type ActivityTypeDefinition = {
  id: string;
  label: string;
  icon?: string;
  typeField?: string;
  summaryField?: string;
  dateField?: string;
  userField?: string;
  stateField?: string;
  countField?: string;
};

export type ActivityViewDefinition = {
  id: 'activity';
  label: string;
  icon?: string;
  titleField: string;
  subtitleField?: string;
  recordDateField?: string;
  recordEndDateField?: string;
  mobile?: boolean;
  emptyCellAction?: string;
  scheduleAction?: string;
  activityTypes: ActivityTypeDefinition[];
};

export type ActivityViewOptions = {
  view: ActivityViewDefinition;
  rowKey?: string;
  openAction?: string;
  emptyCellAction?: string;
  scheduleAction?: string;
};

const stateLabels: Record<string, string> = {
  overdue: 'Overdue',
  today: 'Today',
  planned: 'Planned',
  done: 'Done',
};

/** Odoo-style activity matrix backed by flattened SQL activity slots. */
export class ActivityView extends BaseComponent {
  private readonly options: ActivityViewOptions;

  constructor(id: string, state: { rows?: ActivityRow[] } = {}, options: ActivityViewOptions) {
    super(id, state);
    this.options = options;
  }

  draw(container: HTMLElement) {
    const rows = (Array.isArray(this.state.rows) ? this.state.rows : []).filter((row: ActivityRow) => this.hasActivityRecord(row));
    const types = this.options.view.activityTypes || [];
    const root = html.take(container).section.className('o-activity-view').ele();
    if (!types.length) {
      html.take(root).div.className('o-activity-empty').text('No activity types found');
      return;
    }

    const viewport = html.take(root).div.className('o-activity-table-viewport').ele();
    const table = html.take(viewport).table.className('o-activity-table').ele();
    const head = html.take(table).thead.trow.ele();
    const recordHeader = html.take(head).th.className('o-activity-record-header').text('Record').ele();
    recordHeader.scope = 'col';
    for (const type of types) this.drawTypeHeader(head, type, rows);
    const settingsHeader = html.take(head).th.className('o-activity-settings-header').text('').ele();
    settingsHeader.scope = 'col';

    const body = html.take(table).tbody.ele();
    if (!rows.length) {
      const cell = html.take(body).trow.tdata.className('o-activity-no-records').attr('colspan', String(types.length + 2)).ele();
      html.take(cell).h3.text('No records found');
      html.take(cell).p.text('There are no records with activities to display.');
    } else {
      for (const [index, row] of rows.entries()) this.drawRow(body, row, index, types);
    }

    const footer = html.take(table).tfooter.trow.ele();
    const footerCell = html.take(footer).tdata.attr('colspan', String(types.length + 2)).className('o-activity-footer').ele();
    if (this.options.scheduleAction) {
      const schedule = html.take(footerCell).button.className('o-activity-schedule').attr('type', 'button').text('+ Schedule activity').ele();
      html.take(schedule).event('click', () => void this.submit(this.options.scheduleAction!, { rows }));
    }
  }

  private hasActivityRecord(row: ActivityRow) {
    return (this.options.view.activityTypes || []).some(type => {
      const typeField = type.typeField || 'activity_type';
      return String(row[typeField] ?? '').trim() !== '' || Number(row[type.countField || 'activity_count'] || 0) > 0;
    });
  }

  private drawTypeHeader(container: HTMLElement, type: ActivityTypeDefinition, rows: ActivityRow[]) {
    const cell = html.take(container).th.className('o-activity-type-header').ele();
    cell.scope = 'col';
    const title = html.take(cell).div.className('o-activity-type-title').ele();
    if (type.icon) html.take(title).span.className('o-activity-type-icon').text(type.icon);
    html.take(title).span.text(type.label);
    const counts = this.countStates(type, rows);
    const counter = html.take(cell).div.className('o-activity-state-counts').ele();
    for (const state of ['overdue', 'today', 'planned', 'done']) {
      const count = counts[state] || 0;
      if (!count) continue;
      html.take(counter).span.className(`o-activity-state-count is-${state}`).dataAttr('activity-state', state).text(`${stateLabels[state]} ${count}`);
    }
  }

  private drawRow(container: HTMLElement, row: ActivityRow, index: number, types: ActivityTypeDefinition[]) {
    const tr = html.take(container).trow.className('o-activity-row').dataAttr('row-id', this.rowId(row, index)).ele();
    const recordCell = html.take(tr).tdata.className('o-activity-record').ele();
    const title = row[this.options.view.titleField];
    const recordAction = this.options.openAction;
    const record = recordAction
      ? html.take(recordCell).button.className('o-activity-record-link').attr('type', 'button').ele()
      : html.take(recordCell).div.className('o-activity-record-link').ele();
    html.take(record).strong.text(title == null || title === '' ? '—' : String(title));
    if (this.options.view.subtitleField && row[this.options.view.subtitleField] != null) {
      html.take(record).span.className('o-activity-record-subtitle').text(String(row[this.options.view.subtitleField]));
    }
    if (this.options.view.recordDateField && row[this.options.view.recordDateField] != null) {
      const from = this.formatDate(row[this.options.view.recordDateField]);
      const to = this.options.view.recordEndDateField && row[this.options.view.recordEndDateField] != null
        ? ` → ${this.formatDate(row[this.options.view.recordEndDateField])}`
        : '';
      html.take(record).time.className('o-activity-record-date').text(`${from}${to}`);
    }
    if (recordAction) html.take(record).event('click', () => void this.submit(recordAction, { row }));

    for (const type of types) this.drawActivityCell(tr, row, type);
    html.take(tr).tdata.className('o-activity-row-end').text('');
  }

  private drawActivityCell(container: HTMLElement, row: ActivityRow, type: ActivityTypeDefinition) {
    const typeField = type.typeField || 'activity_type';
    const hasActivity = String(row[typeField] ?? '').toLowerCase() === type.id.toLowerCase();
    const cell = html.take(container).tdata.className(`o-activity-cell${hasActivity ? ` is-${this.activityState(row, type)}` : ' is-empty'}`).ele();
    if (!hasActivity) {
      if (this.options.emptyCellAction) {
        const add = html.take(cell).button.className('o-activity-empty-action').attr('type', 'button').attr('aria-label', `Schedule ${type.label}`).text('+').ele();
        html.take(add).event('click', () => void this.submit(this.options.emptyCellAction!, { row, activity_type: type.id }));
      }
      return;
    }

    const summary = row[type.summaryField || 'activity_summary'];
    const content = html.take(cell).div.className('o-activity-cell-content').ele();
    html.take(content).div.className('o-activity-cell-title').text(summary == null || summary === '' ? type.label : String(summary));
    const date = row[type.dateField || 'activity_date'];
    const user = row[type.userField || 'activity_user'];
    if (date != null && date !== '') html.take(content).time.className('o-activity-cell-date').text(this.formatDate(date));
    if (user != null && user !== '') html.take(content).span.className('o-activity-cell-user').text(String(user));
    const count = Number(row[type.countField || 'activity_count'] || 0);
    if (count > 1) html.take(content).span.className('o-activity-cell-count').text(String(count));
  }

  private countStates(type: ActivityTypeDefinition, rows: ActivityRow[]) {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const typeField = type.typeField || 'activity_type';
      if (String(row[typeField] ?? '').toLowerCase() !== type.id.toLowerCase()) continue;
      const state = this.activityState(row, type);
      counts[state] = (counts[state] || 0) + Math.max(1, Number(row[type.countField || 'activity_count'] || 1));
    }
    return counts;
  }

  private activityState(row: ActivityRow, type: ActivityTypeDefinition) {
    const state = String(row[type.stateField || 'activity_state'] || 'planned').toLowerCase();
    return stateLabels[state] ? state : 'planned';
  }

  private formatDate(value: unknown) {
    const raw = String(value);
    const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const date = new Date(normalized);
    if (Number.isNaN(date.valueOf())) return raw;
    return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }

  private rowId(row: ActivityRow, index: number) {
    return String(row[this.options.rowKey || 'id'] ?? index);
  }
}

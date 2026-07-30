import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';

export type OdooAnalyticsRow = Record<string, any>;

export class OdooGraphView extends BaseComponent {
  constructor(id: string, state: { rows?: OdooAnalyticsRow[]; labelField?: string; valueField?: string; format?: 'money' | 'number' } = {}) {
    super(id, { rows: state.rows || [], labelField: state.labelField || 'stage_name', valueField: state.valueField || 'expected_revenue', format: state.format || 'money' });
  }

  draw(container: HTMLElement) {
    const rows = aggregate(this.state.rows, this.state.labelField, this.state.valueField);
    const max = Math.max(...rows.map(row => row.value), 1);
    const root = html.take(container).div.className('odoo-graph-view').getContext();
    for (const row of rows) {
      const line = html.take(root).div.className('odoo-graph-row').getContext();
      line.classList.add('is-clickable');
      line.addEventListener('click', () => void this.submit('drilldown', { label: row.label }));
      html.take(line).div.className('odoo-graph-label').text(row.label);
      const track = html.take(line).div.className('odoo-graph-track').getContext();
      html.take(track).div.className('odoo-graph-bar').style(`width:${Math.max((row.value / max) * 100, 2)}%`).getContext();
      html.take(line).strong.className('odoo-graph-value').text(this.state.format === 'number' ? row.value.toLocaleString() : formatMoney(row.value));
    }
  }
}

export class OdooPivotView extends BaseComponent {
  constructor(id: string, state: { rows?: OdooAnalyticsRow[]; rowField?: string; columnField?: string; measureField?: string } = {}) {
    super(id, { rows: state.rows || [], rowField: state.rowField || 'salesperson', columnField: state.columnField || 'stage_name', measureField: state.measureField || 'expected_revenue' });
  }

  draw(container: HTMLElement) {
    const rows = this.state.rows || [];
    const rowField = this.state.rowField;
    const columnField = this.state.columnField;
    const measureField = this.state.measureField;
    const columns = [...new Set(rows.map(row => String(row[columnField] || 'Unknown')))];
    const rowKeys = [...new Set(rows.map(row => String(row[rowField] || 'Unknown')))];
    const table = html.take(container).table.className('odoo-pivot-view').getContext();
    const head = html.take(table).thead.getContext();
    const headRow = html.take(head).trow.getContext();
    html.take(headRow).th.text(String(rowField));
    for (const column of columns) html.take(headRow).th.text(column);
    html.take(headRow).th.text('Total');
    const body = html.take(table).tbody.getContext();
    for (const key of rowKeys) {
      const line = html.take(body).trow.getContext();
      html.take(line).th.text(key);
      let total = 0;
      for (const column of columns) {
        const value = rows.filter(row => String(row[rowField] || 'Unknown') === key && String(row[columnField] || 'Unknown') === column).reduce((sum, row) => sum + Number(row[measureField] || 0), 0);
        total += value;
        const cell = html.take(line).tdata.text(formatMoney(value)).getContext();
        cell.classList.add('is-clickable');
        cell.addEventListener('click', () => void this.submit('drilldown', { row: key, column }));
      }
      const totalCell = html.take(line).th.text(formatMoney(total)).getContext();
      totalCell.classList.add('is-clickable');
      totalCell.addEventListener('click', () => void this.submit('drilldown', { row: key }));
    }
  }
}

export class OdooCalendarView extends BaseComponent {
  constructor(id: string, state: { rows?: OdooAnalyticsRow[]; titleField?: string; dateField?: string; detailField?: string } = {}) {
    super(id, {
      rows: state.rows || [],
      titleField: state.titleField || 'name',
      dateField: state.dateField || 'created_at',
      detailField: state.detailField || 'next_activity',
      month: startOfMonth(new Date()),
    });
  }

  draw(container: HTMLElement) {
    const root = html.take(container).div.className('odoo-calendar-view').getContext();
    const header = html.take(root).div.className('odoo-calendar-header').getContext();
    const previous = html.take(header).button.className('odoo-button secondary').type('button').text('‹').getContext();
    previous.addEventListener('click', () => this.shiftMonth(-1));
    html.take(header).strong.text(new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(this.state.month));
    const next = html.take(header).button.className('odoo-button secondary').type('button').text('›').getContext();
    next.addEventListener('click', () => this.shiftMonth(1));
    const grid = html.take(root).div.className('odoo-calendar-grid').getContext();
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) html.take(grid).div.className('odoo-calendar-day-name').text(day);
    const month = this.state.month as Date;
    const firstDay = (month.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
    const eventsByDate = new Map<string, OdooAnalyticsRow[]>();
    for (const row of this.state.rows || []) {
      const date = calendarDate(row[this.state.dateField]);
      if (!date) continue;
      const events = eventsByDate.get(date) || [];
      events.push(row);
      eventsByDate.set(date, events);
    }
    for (let index = 0; index < firstDay + daysInMonth; index += 1) {
      if (index < firstDay) {
        html.take(grid).div.className('odoo-calendar-cell is-empty');
        continue;
      }
      const day = index - firstDay + 1;
      const date = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const cell = html.take(grid).div.className('odoo-calendar-cell').getContext();
      html.take(cell).span.className('odoo-calendar-date').text(String(day));
      for (const row of eventsByDate.get(date) || []) {
        const event = html.take(cell).article.className('odoo-calendar-event').getContext();
        if (row.id) {
          event.classList.add('is-clickable');
          event.addEventListener('click', () => void this.submit('open_record', { id: row.id }));
        }
        html.take(event).strong.text(String(row[this.state.titleField] || 'Opportunity'));
        html.take(event).small.text(String(row[this.state.detailField] || row[this.state.dateField] || 'No activity'));
      }
    }
  }

  private shiftMonth(delta: number) {
    const month = this.state.month as Date;
    this.setState({ month: new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + delta, 1)) });
  }
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function calendarDate(value: unknown) {
  if (!value) return '';
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || '';
}

function aggregate(rows: OdooAnalyticsRow[], labelField: string, valueField: string) {
  const values = new Map<string, number>();
  for (const row of rows) {
    const label = String(row[labelField] || 'Unknown');
    values.set(label, (values.get(label) || 0) + Number(row[valueField] || 0));
  }
  return [...values].map(([label, value]) => ({ label, value }));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

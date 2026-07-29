import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';

export type OdooAnalyticsRow = Record<string, any>;

export class OdooGraphView extends BaseComponent {
  constructor(id: string, state: { rows?: OdooAnalyticsRow[]; labelField?: string; valueField?: string } = {}) {
    super(id, { rows: state.rows || [], labelField: state.labelField || 'stage_name', valueField: state.valueField || 'expected_revenue' });
  }

  draw(container: HTMLElement) {
    const rows = aggregate(this.state.rows, this.state.labelField, this.state.valueField);
    const max = Math.max(...rows.map(row => row.value), 1);
    const root = html.take(container).div.className('odoo-graph-view').getContext();
    for (const row of rows) {
      const line = html.take(root).div.className('odoo-graph-row').getContext();
      html.take(line).div.className('odoo-graph-label').text(row.label);
      const track = html.take(line).div.className('odoo-graph-track').getContext();
      html.take(track).div.className('odoo-graph-bar').style(`width:${Math.max((row.value / max) * 100, 2)}%`).getContext();
      html.take(line).strong.className('odoo-graph-value').text(formatMoney(row.value));
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
        html.take(line).tdata.text(formatMoney(value));
      }
      html.take(line).th.text(formatMoney(total));
    }
  }
}

export class OdooCalendarView extends BaseComponent {
  constructor(id: string, state: { rows?: OdooAnalyticsRow[]; titleField?: string; dateField?: string; detailField?: string } = {}) {
    super(id, { rows: state.rows || [], titleField: state.titleField || 'name', dateField: state.dateField || 'created_at', detailField: state.detailField || 'next_activity' });
  }

  draw(container: HTMLElement) {
    const root = html.take(container).div.className('odoo-calendar-view').getContext();
    const header = html.take(root).div.className('odoo-calendar-header').getContext();
    html.take(header).button.className('odoo-button secondary').type('button').text('‹');
    html.take(header).strong.text('Opportunity schedule');
    html.take(header).button.className('odoo-button secondary').type('button').text('›');
    const grid = html.take(root).div.className('odoo-calendar-grid').getContext();
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) html.take(grid).div.className('odoo-calendar-day-name').text(day);
    for (const row of this.state.rows || []) {
      const event = html.take(grid).article.className('odoo-calendar-event').getContext();
      html.take(event).strong.text(String(row[this.state.titleField] || 'Opportunity'));
      html.take(event).small.text(String(row[this.state.detailField] || row[this.state.dateField] || 'No activity'));
    }
  }
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

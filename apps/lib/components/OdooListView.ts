import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';

export type OdooListColumn = { field: string; label: string; format?: 'money' | 'priority' | 'stage'; link?: boolean };
export type OdooListDefinition = { selectable?: boolean; actions?: string[]; sort?: string };

export class OdooListView extends BaseComponent {
  columns: OdooListColumn[];
  def: OdooListDefinition;

  constructor(id: string, state: { rows?: Record<string, any>[] } = {}, columns: OdooListColumn[] = [], def: OdooListDefinition = {}) {
    super(id, { rows: state.rows || [] });
    this.columns = columns;
    this.def = def;
  }

  setRows(rows: Record<string, any>[]) {
    this.setState({ rows });
  }

  draw(container: HTMLElement) {
    const table = html.take(container).table.className('odoo-list').getContext();
    const head = html.take(table).thead.getContext();
    const headRow = html.take(head).trow.getContext();
    const selected = new Set<string>();
    if (this.def.selectable) {
      const selectAll = html.take(headRow).th.getContext();
      const checkbox = html.take(selectAll).input.attr('type', 'checkbox').getContext() as HTMLInputElement;
      checkbox.addEventListener('change', () => {
        for (const row of this.state.rows || []) if (checkbox.checked) selected.add(String(row.id)); else selected.delete(String(row.id));
        void this.submit('selection', { ids: [...selected] });
      });
    }
    for (const column of this.columns) html.take(headRow).th.text(column.label);
    const body = html.take(table).tbody.getContext();
    if (!(this.state.rows || []).length) {
      const row = html.take(body).trow.getContext();
      const empty = html.take(row).tdata.attr('colspan', String(this.columns.length + (this.def.selectable ? 1 : 0))).className('odoo-list-empty').getContext();
      html.take(empty).span.text('No records match the current search.');
    }
    for (const row of this.state.rows || []) {
      const tr = html.take(body).trow.getContext();
      if (this.def.selectable) {
        const cell = html.take(tr).tdata.getContext();
        const checkbox = html.take(cell).input.attr('type', 'checkbox').getContext() as HTMLInputElement;
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) selected.add(String(row.id)); else selected.delete(String(row.id));
          void this.submit('selection', { ids: [...selected] });
        });
      }
      for (const column of this.columns) {
        const value = formatValue(row[column.field], column.format);
        const cell = html.take(tr).tdata.getContext();
        if (column.link) {
          const link = html.take(cell).button.className('odoo-link').type('button').text(value).getContext();
          link.addEventListener('click', () => void this.submit('open_record', { id: row.id }));
        } else if (column.format === 'stage') {
          html.take(cell).span.className('odoo-stage').text(value);
        } else {
          html.take(cell).text(value);
        }
      }
    }
  }
}

function formatValue(value: unknown, format?: OdooListColumn['format']) {
  if (format === 'money') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0));
  if (format === 'priority') return '★'.repeat(Number(value || 0));
  return String(value ?? '');
}

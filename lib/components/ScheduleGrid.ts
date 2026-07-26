import { BaseComponent } from '../runtime.ts';

export type ScheduleGridDefinition = {
  title?: string;
  date_field?: string;
  resource_field?: string;
  resource_label_field?: string;
  title_field?: string;
  subtitle_field?: string;
  status_field?: string;
  empty_state?: { title?: string; description?: string };
};

type ScheduleRow = Record<string, unknown>;

/**
 * A compact, declarative calendar surface for assignments that already come
 * from a server-owned date/resource datasource. The component owns layout and
 * presentation; filtering and persistence remain with the page renderer.
 */
export class ScheduleGrid extends BaseComponent {
  declare state: { rows?: ScheduleRow[] };
  readonly def: ScheduleGridDefinition;

  constructor(id: string, state: { rows?: ScheduleRow[] } = {}, def: ScheduleGridDefinition = {}) {
    super(id, state);
    this.def = def;
  }

  private dateValue(row: ScheduleRow): string {
    return String(row[this.def.date_field || 'date'] || '').slice(0, 10);
  }

  private formatDate(value: string): string {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.valueOf())) return value;
    return new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date);
  }

  draw(container: HTMLElement) {
    const rows = Array.isArray(this.state.rows) ? this.state.rows : [];
    const dateField = this.def.date_field || 'date';
    const resourceField = this.def.resource_field || 'resource';
    const resourceLabelField = this.def.resource_label_field || resourceField;
    const titleField = this.def.title_field || 'title';
    const subtitleField = this.def.subtitle_field || 'subtitle';
    const dates = [...new Set(rows.map(row => this.dateValue(row)).filter(Boolean))].sort();
    const resources = [...new Map(rows.map(row => {
      const key = String(row[resourceField] ?? '');
      return [key, row];
    })).values()];

    const root = document.createElement('section');
    root.className = 'core3-schedule-grid';
    root.setAttribute('aria-label', this.def.title || 'Lịch phân công');
    if (this.def.title) {
      const heading = document.createElement('h3');
      heading.className = 'core3-schedule-title';
      heading.textContent = this.def.title;
      root.appendChild(heading);
    }

    if (!dates.length || !resources.length) {
      const empty = document.createElement('div');
      empty.className = 'core3-schedule-empty';
      empty.textContent = this.def.empty_state?.title || 'Chưa có lịch phân công';
      if (this.def.empty_state?.description) {
        const description = document.createElement('p');
        description.textContent = this.def.empty_state.description;
        empty.appendChild(description);
      }
      root.appendChild(empty);
      container.appendChild(root);
      return;
    }

    const scroller = document.createElement('div');
    scroller.className = 'core3-schedule-scroll';
    const table = document.createElement('table');
    table.className = 'core3-schedule-table';
    table.setAttribute('role', 'grid');

    const thead = document.createElement('thead');
    const header = document.createElement('tr');
    const resourceHeader = document.createElement('th');
    resourceHeader.scope = 'col';
    resourceHeader.textContent = 'Nhân viên';
    header.appendChild(resourceHeader);
    for (const date of dates) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = this.formatDate(date);
      cell.setAttribute('data-schedule-date', date);
      header.appendChild(cell);
    }
    thead.appendChild(header);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const resource of resources) {
      const resourceKey = String(resource[resourceField] ?? '');
      const row = document.createElement('tr');
      const label = document.createElement('th');
      label.scope = 'row';
      label.className = 'core3-schedule-resource';
      label.textContent = String(resource[resourceLabelField] || resourceKey || '—');
      row.appendChild(label);
      for (const date of dates) {
        const cell = document.createElement('td');
        const assignment = rows.find(candidate => String(candidate[resourceField] ?? '') === resourceKey && this.dateValue(candidate) === date);
        if (assignment) {
          cell.className = 'core3-schedule-assignment';
          const title = document.createElement('strong');
          title.textContent = String(assignment[titleField] || 'Đã phân công');
          cell.appendChild(title);
          if (assignment[subtitleField]) {
            const subtitle = document.createElement('span');
            subtitle.textContent = String(assignment[subtitleField]);
            cell.appendChild(subtitle);
          }
          if (this.def.status_field && assignment[this.def.status_field]) {
            cell.dataset.status = String(assignment[this.def.status_field]);
          }
        } else {
          cell.className = 'core3-schedule-empty-cell';
          cell.textContent = '—';
        }
        row.appendChild(cell);
      }
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    scroller.appendChild(table);
    root.appendChild(scroller);
    container.appendChild(root);
  }
}

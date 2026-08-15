import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';

function createFluentElement<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  return html.node(tag) as HTMLElementTagNameMap[K];
}

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

    const root = createFluentElement('section');
    html.take(root).className('schedule-grid').attr('aria-label', this.def.title || 'Lịch phân công');
    if (this.def.title) {
      const heading = createFluentElement('h3');
      html.take(heading).className('schedule-title').replaceText(this.def.title);
      html.take(root).append(heading);
    }

    if (!dates.length || !resources.length) {
      const empty = createFluentElement('div');
      html.take(empty).className('schedule-empty').replaceText(this.def.empty_state?.title || 'Chưa có lịch phân công');
      if (this.def.empty_state?.description) {
        const description = createFluentElement('p');
        html.take(description).replaceText(this.def.empty_state.description);
        html.take(empty).append(description);
      }
      html.take(root).append(empty);
      html.take(container).append(root);
      return;
    }

    const scroller = createFluentElement('div');
    html.take(scroller).className('schedule-scroll');
    const table = createFluentElement('table');
    html.take(table).className('schedule-table').attr('role', 'grid');

    const thead = createFluentElement('thead');
    const header = createFluentElement('tr');
    const resourceHeader = createFluentElement('th');
    resourceHeader.scope = 'col';
    html.take(resourceHeader).replaceText('Nhân viên');
    html.take(header).append(resourceHeader);
    for (const date of dates) {
      const cell = createFluentElement('th');
      cell.scope = 'col';
      html.take(cell).replaceText(this.formatDate(date)).attr('data-schedule-date', date);
      html.take(header).append(cell);
    }
    html.take(thead).append(header);
    html.take(table).append(thead);

    const tbody = createFluentElement('tbody');
    for (const resource of resources) {
      const resourceKey = String(resource[resourceField] ?? '');
      const row = createFluentElement('tr');
      const label = createFluentElement('th');
      label.scope = 'row';
      html.take(label).className('schedule-resource').replaceText(String(resource[resourceLabelField] || resourceKey || '—'));
      html.take(row).append(label);
      for (const date of dates) {
        const cell = createFluentElement('td');
        const assignment = rows.find(candidate => String(candidate[resourceField] ?? '') === resourceKey && this.dateValue(candidate) === date);
        if (assignment) {
          html.take(cell).className('schedule-assignment');
          const title = createFluentElement('strong');
          html.take(title).replaceText(String(assignment[titleField] || 'Đã phân công'));
          html.take(cell).append(title);
          if (assignment[subtitleField]) {
            const subtitle = createFluentElement('span');
            html.take(subtitle).replaceText(String(assignment[subtitleField]));
            html.take(cell).append(subtitle);
          }
          if (this.def.status_field && assignment[this.def.status_field]) {
            cell.dataset.status = String(assignment[this.def.status_field]);
          }
        } else {
          html.take(cell).className('schedule-empty-cell').replaceText('—');
        }
        html.take(row).append(cell);
      }
      html.take(tbody).append(row);
    }
    html.take(table).append(tbody);
    html.take(scroller).append(table);
    html.take(root).append(scroller);
    html.take(container).append(root);
  }
}

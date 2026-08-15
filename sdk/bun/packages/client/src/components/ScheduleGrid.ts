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

    const root = html.take(container).section.className('schedule-grid').attr('aria-label', this.def.title || 'Lịch phân công').ele() as HTMLElement;
    if (this.def.title) {
      html.take(root).h3.className('schedule-title').replaceText(this.def.title);
    }

    if (!dates.length || !resources.length) {
      const empty = html.take(root).div.className('schedule-empty').replaceText(this.def.empty_state?.title || 'Chưa có lịch phân công').ele() as HTMLDivElement;
      if (this.def.empty_state?.description) {
        html.take(empty).p.replaceText(this.def.empty_state.description);
      }
      return;
    }

    const scroller = html.take(root).div.className('schedule-scroll').ele() as HTMLDivElement;
    const table = html.take(scroller).table.className('schedule-table').attr('role', 'grid').ele() as HTMLTableElement;

    const thead = html.take(table).thead.ele() as HTMLTableSectionElement;
    const header = html.take(thead).trow.ele() as HTMLTableRowElement;
    html.take(header).th.prop('scope', 'col').replaceText('Nhân viên');
    for (const date of dates) {
      html.take(header).th.prop('scope', 'col').replaceText(this.formatDate(date)).attr('data-schedule-date', date);
    }

    const tbody = html.take(table).tbody.ele() as HTMLTableSectionElement;
    for (const resource of resources) {
      const resourceKey = String(resource[resourceField] ?? '');
      const row = html.take(tbody).trow.ele() as HTMLTableRowElement;
      html.take(row).th.prop('scope', 'row').className('schedule-resource').replaceText(String(resource[resourceLabelField] || resourceKey || '—'));
      for (const date of dates) {
        const cell = html.take(row).tdata.ele() as HTMLTableCellElement;
        const assignment = rows.find(candidate => String(candidate[resourceField] ?? '') === resourceKey && this.dateValue(candidate) === date);
        if (assignment) {
          html.take(cell).className('schedule-assignment');
          html.take(cell).strong.replaceText(String(assignment[titleField] || 'Đã phân công'));
          if (assignment[subtitleField]) {
            html.take(cell).span.replaceText(String(assignment[subtitleField]));
          }
          if (this.def.status_field && assignment[this.def.status_field]) {
            html.take(cell).dataAttr('status', String(assignment[this.def.status_field]));
          }
        } else {
          html.take(cell).className('schedule-empty-cell').replaceText('—');
        }
      }
    }
  }
}

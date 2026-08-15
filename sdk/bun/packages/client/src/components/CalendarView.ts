import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

type CalendarRow = Record<string, unknown>;

export type CalendarViewDefinition = {
  id: 'calendar';
  label: string;
  icon?: string;
  dateField: string;
  endDateField?: string;
  card?: { title: string; subtitle?: string; fields?: Array<{ field: string; label?: string }> };
};

export type CalendarViewOptions = {
  view: CalendarViewDefinition;
  rowKey?: string;
  openAction?: string;
  doubleClickAction?: string;
  onSelect?: (row: CalendarRow) => void;
};

/** Month calendar used by list-backed pages with declarative date metadata. */
export class CalendarView extends BaseComponent {
  private readonly options: CalendarViewOptions;

  constructor(id: string, state: { rows?: CalendarRow[] } = {}, options: CalendarViewOptions) {
    super(id, state);
    this.options = options;
  }

  draw(container: HTMLElement) {
    const rows = Array.isArray(this.state.rows) ? this.state.rows : [];
    const month = this.monthFromState();
    const root = html.take(container).section.className('o-calendar-view').getContext();
    const toolbar = html.take(root).header.className('o-calendar-toolbar').getContext();
    const previous = html.take(toolbar).button.className('o-calendar-nav').attr('aria-label', 'Previous month').text('‹').getContext();
    html.take(previous).event('click', () => this.setMonth(month.getFullYear(), month.getMonth() - 1));
    html.take(toolbar).h2.className('o-calendar-title').text(new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month));
    const today = html.take(toolbar).button.className('o-calendar-today').text('Today').getContext();
    html.take(today).event('click', () => {
      const now = new Date();
      this.setMonth(now.getFullYear(), now.getMonth());
    });
    const next = html.take(toolbar).button.className('o-calendar-nav').attr('aria-label', 'Next month').text('›').getContext();
    html.take(next).event('click', () => this.setMonth(month.getFullYear(), month.getMonth() + 1));

    const grid = html.take(root).div.className('o-calendar-grid').attr('role', 'grid').getContext();
    for (const label of this.weekdayLabels()) html.take(grid).div.className('o-calendar-weekday').attr('role', 'columnheader').text(label);

    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
    const events = new Map<string, CalendarRow[]>();
    for (const row of rows) {
      const date = this.parseDate(row[this.options.view.dateField]);
      if (!date) continue;
      const key = this.dateKey(date);
      const bucket = events.get(key) || [];
      bucket.push(row);
      events.set(key, bucket);
    }

    for (let index = 0; index < 42; index++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const day = html.take(grid).div.className('o-calendar-day').attr('role', 'gridcell').getContext();
      if (date.getMonth() !== month.getMonth()) html.take(day).toggleClass('is-muted', true);
      if (this.dateKey(date) === this.dateKey(new Date())) html.take(day).toggleClass('is-today', true);
      html.take(day).div.className('o-calendar-day-number').text(String(date.getDate()));
      const list = html.take(day).div.className('o-calendar-events').getContext();
      for (const [eventIndex, row] of (events.get(this.dateKey(date)) || []).entries()) this.drawEvent(list, row, eventIndex);
    }
  }

  private drawEvent(container: HTMLElement, row: CalendarRow, index: number) {
    const card = this.options.view.card;
    const event = html.take(container).button.className('o-calendar-event').dataAttr('row-id', this.rowId(row, index)).getContext() as HTMLButtonElement;
    const title = row[card?.title || 'name'];
    html.take(event).replaceText(title == null || title === '' ? '—' : String(title));
    if (card?.subtitle && row[card.subtitle] != null) event.title = String(row[card.subtitle]);
    let clickTimer: ReturnType<typeof setTimeout> | undefined;
    const selectOrOpen = () => {
      if (this.options.onSelect) this.options.onSelect(row);
      else if (this.options.openAction) void this.submit(this.options.openAction, { row });
    };
    html.take(event).event('click', () => {
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
    html.take(event).event('dblclick', () => {
      if (clickTimer) clearTimeout(clickTimer);
      clickTimer = undefined;
      if (this.options.doubleClickAction) void this.submit(this.options.doubleClickAction, { row });
    });
  }

  private monthFromState() {
    const value = this.state.month;
    if (typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)) {
      const [year, month] = value.split('-').map(Number);
      return new Date(year, month - 1, 1);
    }
    const rows = Array.isArray(this.state.rows) ? this.state.rows : [];
    for (const row of rows) {
      const date = this.parseDate(row[this.options.view.dateField]);
      if (date) return new Date(date.getFullYear(), date.getMonth(), 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  private setMonth(year: number, month: number) {
    this.setState({ month: `${year}-${String(month + 1).padStart(2, '0')}` });
  }

  private parseDate(value: unknown) {
    if (value == null || value === '') return null;
    const date = new Date(String(value).includes('T') ? String(value) : `${String(value)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private dateKey(date: Date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  private weekdayLabels() {
    const base = new Date(2024, 0, 7);
    return Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(base.getFullYear(), base.getMonth(), base.getDate() + index)));
  }

  private rowId(row: CalendarRow, index: number) {
    return String(row[this.options.rowKey || 'id'] ?? index);
  }
}

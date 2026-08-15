import { resolveDatePreset, type DateRangePreset } from '@core3/client/components/ListToolbar';

export type DateRangeFilterTagDefinition = {
  fromField?: string;
  toField?: string;
  fromLabel?: string;
  toLabel?: string;
  label?: string;
  presets?: DateRangePreset[];
  presetLabels?: Partial<Record<DateRangePreset, string>>;
  maxYears?: number;
  denyUnbounded?: boolean;
  applyLabel?: string;
  calendarPreviousLabel?: string;
  calendarNextLabel?: string;
  weekdayLabels?: string[];
  validationMessages?: {
    required?: string;
    invalid?: string;
    startBeforeEnd?: string;
    maxYears?: string;
  };
};

export type DateRangeFilterTagOptions = {
  values: Record<string, unknown>;
  definition: DateRangeFilterTagDefinition;
  onChange: (values: Record<string, string>) => void;
};

const presetLabels: Record<DateRangePreset, string> = {
  today: 'Today',
  previous_month: 'Previous month',
  week: 'This week',
  month: 'This month',
  quarter: 'This quarter',
  year: 'This year',
  last_12_months: 'Last 12 months',
  all: 'All dates',
};

export class DateRangeFilterTag {
  private readonly options: DateRangeFilterTagOptions;

  constructor(options: DateRangeFilterTagOptions) {
    this.options = options;
  }

  render(container: HTMLElement) {
    const definition = this.options.definition;
    const fromField = definition.fromField || 'from_date';
    const toField = definition.toField || 'to_date';
    const details = document.createElement('details');
    details.className = 'o-list-date-range-tag';
    const summary = document.createElement('summary');
    summary.className = 'o-list-facet o-list-date-range-summary';
    summary.textContent = `${definition.label || 'Date'}: ${this.displayValue(fromField)} - ${this.displayValue(toField)}`;
    summary.setAttribute('aria-label', `${definition.label || 'Date'} filter`);
    details.append(summary);

    const editor = document.createElement('div');
    editor.className = 'o-list-date-range-editor';
    const presets = (definition.presets || []).filter(preset => !(definition.denyUnbounded && preset === 'all'));
    if (presets.length) {
      const presetRow = document.createElement('div');
      presetRow.className = 'o-list-date-range-presets';
      for (const preset of presets) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.datePreset = preset;
        button.textContent = definition.presetLabels?.[preset] || presetLabels[preset] || preset;
        if (this.isPresetActive(preset, fromField, toField)) button.classList.add('is-active');
        button.addEventListener('click', () => {
          const dates = resolveDatePreset(preset);
          if (dates.from && dates.from === dates.to) dates.to = nextDate(dates.to);
          this.apply(editor, fromField, toField, dates.from, dates.to);
        });
        presetRow.append(button);
      }
      editor.append(presetRow);
    }

    const fields = document.createElement('div');
    fields.className = 'o-list-date-range-fields';
    const from = this.dateInput(definition.fromLabel || 'From date', String(this.options.values[fromField] || ''), definition);
    const to = this.dateInput(definition.toLabel || 'To date', String(this.options.values[toField] || ''), definition);
    fields.append(from, to);
    let selectedFrom = from.value;
    let selectedTo = to.value;
    let activeField: 'from' | 'to' = 'from';
    let calendarMonth = monthStart(selectedFrom || new Date().toISOString().slice(0, 10));
    let error: HTMLElement | undefined;
    const calendar = document.createElement('div');
    calendar.className = 'o-list-date-picker';
    const drawCalendar = () => {
      calendar.innerHTML = '';
      const header = document.createElement('div');
      header.className = 'o-list-date-picker-header';
      const previous = document.createElement('button');
      previous.type = 'button'; previous.className = 'o-list-date-picker-nav'; previous.textContent = '‹';
      previous.setAttribute('aria-label', definition.calendarPreviousLabel || 'Previous date picker month');
      previous.addEventListener('click', () => { calendarMonth = shiftMonth(calendarMonth, -1); drawCalendar(); });
      const title = document.createElement('strong');
      title.textContent = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(calendarMonth);
      const next = document.createElement('button');
      next.type = 'button'; next.className = 'o-list-date-picker-nav'; next.textContent = '›';
      next.setAttribute('aria-label', definition.calendarNextLabel || 'Next date picker month');
      next.addEventListener('click', () => { calendarMonth = shiftMonth(calendarMonth, 1); drawCalendar(); });
      header.append(previous, title, next); calendar.append(header);
      const grid = document.createElement('div'); grid.className = 'o-list-date-picker-grid';
      for (const weekday of definition.weekdayLabels || ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']) {
        const label = document.createElement('span'); label.className = 'o-list-date-picker-weekday'; label.textContent = weekday; grid.append(label);
      }
      const first = calendarMonth.getUTCDay() || 7;
      const firstVisibleDate = new Date(Date.UTC(calendarMonth.getUTCFullYear(), calendarMonth.getUTCMonth(), 1 - (first - 1)));
      const monthKey = isoDate(calendarMonth.getUTCFullYear(), calendarMonth.getUTCMonth(), 1).slice(0, 7);
      for (let index = 0; index < 42; index++) {
        const date = new Date(firstVisibleDate);
        date.setUTCDate(date.getUTCDate() + index);
        const value = isoDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'o-list-date-picker-day'; button.textContent = String(date.getUTCDate()); button.dataset.calendarDate = value;
        if (!value.startsWith(monthKey)) button.classList.add('is-outside-month');
        if (!this.isDateAllowed(value, activeField, selectedFrom, definition)) button.disabled = true;
        if (value === selectedFrom || value === selectedTo) button.classList.add('is-selected');
        if (selectedFrom && selectedTo && value > selectedFrom && value < selectedTo) button.classList.add('is-in-range');
        button.addEventListener('click', () => {
          if (activeField === 'from') { selectedFrom = value; from.value = value; activeField = 'to'; }
          else { selectedTo = value; to.value = value; }
          if (error) error.textContent = validateDateRange(selectedFrom, selectedTo, definition) || '';
          drawCalendar();
        });
        grid.append(button);
      }
      calendar.append(grid);
    };
    from.addEventListener('focus', () => {
      activeField = 'from';
      calendarMonth = monthStart(from.value || selectedFrom || calendarMonth.toISOString().slice(0, 10));
      drawCalendar();
    });
    to.addEventListener('focus', () => {
      activeField = 'to';
      calendarMonth = monthStart(to.value || selectedTo || calendarMonth.toISOString().slice(0, 10));
      drawCalendar();
    });
    from.addEventListener('input', () => { selectedFrom = from.value; calendarMonth = monthStart(selectedFrom || calendarMonth); drawCalendar(); });
    to.addEventListener('input', () => { selectedTo = to.value; calendarMonth = monthStart(selectedTo || calendarMonth); drawCalendar(); });
    drawCalendar();
    error = document.createElement('div');
    error.className = 'o-list-date-range-error';
    error.setAttribute('role', 'alert');
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'o-list-date-range-apply';
    apply.textContent = definition.applyLabel || 'Apply';
    apply.addEventListener('click', () => this.apply(editor, fromField, toField, from.value, to.value, error));
    fields.append(apply);
    editor.append(calendar, fields, error);
    details.append(editor);
    container.append(details);
  }

  private dateInput(label: string, value: string, definition: DateRangeFilterTagDefinition) {
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.placeholder = 'YYYY-MM-DD';
    input.pattern = '\\d{4}-\\d{2}-\\d{2}';
    input.value = value;
    input.setAttribute('aria-label', label);
    if (definition.maxYears) {
      const bounds = rollingDateBounds(definition.maxYears);
      input.min = bounds.from;
      input.max = bounds.to;
    }
    return input;
  }

  private isDateAllowed(value: string, activeField: 'from' | 'to', selectedFrom: string, definition: DateRangeFilterTagDefinition) {
    if (definition.maxYears) {
      const bounds = rollingDateBounds(definition.maxYears);
      if (value < bounds.from || value > bounds.to) return false;
      if (activeField === 'to' && selectedFrom) {
        const latest = addYears(selectedFrom, definition.maxYears);
        if (value > latest) return false;
      }
    }
    return activeField !== 'to' || !selectedFrom || value >= selectedFrom;
  }

  private apply(editor: HTMLElement, fromField: string, toField: string, from: string, to: string, error?: HTMLElement) {
    if (from && from === to) to = nextDate(to);
    const message = validateDateRange(from, to, this.options.definition);
    if (message) {
      if (error) error.textContent = message;
      return;
    }
    this.options.onChange({ [fromField]: from, [toField]: to });
    const details = editor.parentElement as HTMLDetailsElement | null;
    if (details) details.open = false;
  }

  private isPresetActive(preset: DateRangePreset, fromField: string, toField: string) {
    const dates = resolveDatePreset(preset);
    if (dates.from && dates.from === dates.to) dates.to = nextDate(dates.to);
    return String(this.options.values[fromField] || '') === dates.from
      && String(this.options.values[toField] || '') === dates.to;
  }

  private displayValue(field: string) {
    return String(this.options.values[field] || '...');
  }
}

export function rollingDateBounds(years: number): { from: string; to: string } {
  const now = new Date();
  const toDate = new Date(now);
  toDate.setUTCDate(toDate.getUTCDate() + 1);
  const fromDate = new Date(now);
  fromDate.setUTCFullYear(fromDate.getUTCFullYear() - years);
  return { from: fromDate.toISOString().slice(0, 10), to: toDate.toISOString().slice(0, 10) };
}

export function validateDateRange(from: string, to: string, definition: DateRangeFilterTagDefinition): string | undefined {
  if (!from || !to) return validationMessage(definition, 'required', 'A bounded date range is required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return validationMessage(definition, 'invalid', 'Use valid dates.');
  if (from >= to) return validationMessage(definition, 'startBeforeEnd', 'The start date must be before the end date.');
  if (definition.maxYears) {
    const bounds = rollingDateBounds(definition.maxYears);
    if (from < bounds.from || to > bounds.to || to > addYears(from, definition.maxYears)) {
      return validationMessage(definition, 'maxYears', `The date range cannot be longer than ${definition.maxYears} years.`)
        .replaceAll('{max_years}', String(definition.maxYears));
    }
  }
  return undefined;
}

function validationMessage(
  definition: DateRangeFilterTagDefinition,
  key: 'required' | 'invalid' | 'startBeforeEnd' | 'maxYears',
  fallback: string,
) {
  return definition.validationMessages?.[key] || fallback;
}

function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function monthStart(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.valueOf())
    ? new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
    : new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function shiftMonth(value: Date, offset: number) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + offset, 1));
}

function addYears(value: string, years: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.toISOString().slice(0, 10);
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

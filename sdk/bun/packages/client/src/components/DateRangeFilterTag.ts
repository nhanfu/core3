import { resolveDatePreset, type DateRangePreset } from '@core3/client/components/ListToolbar';
import { html } from '@core3/client/html';

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
    const details = html.take(container).details.className('o-list-date-range-tag').ele() as HTMLDetailsElement;
    html.take(details).summary
      .className('o-list-facet o-list-date-range-summary')
      .text(`${definition.label || 'Date'}: ${this.displayValue(fromField)} - ${this.displayValue(toField)}`)
      .attr('aria-label', `${definition.label || 'Date'} filter`);

    const editor = html.take(details).div.className('o-list-date-range-editor').ele() as HTMLDivElement;
    const presets = (definition.presets || []).filter(preset => !(definition.denyUnbounded && preset === 'all'));
    if (presets.length) {
      const presetRow = html.take(editor).div.className('o-list-date-range-presets').ele() as HTMLDivElement;
      for (const preset of presets) {
        const button = html.take(presetRow).button
          .type('button')
          .dataAttr('date-preset', preset)
          .text(definition.presetLabels?.[preset] || presetLabels[preset] || preset)
          .ele() as HTMLButtonElement;
        if (this.isPresetActive(preset, fromField, toField)) html.take(button).toggleClass('is-active', true);
        html.take(button).event('click', () => {
          const dates = resolveDatePreset(preset);
          if (dates.from && dates.from === dates.to) dates.to = nextDate(dates.to);
          this.apply(editor, fromField, toField, dates.from, dates.to);
        });
      }
    }

    const fields = html.take(editor).div.className('o-list-date-range-fields').ele() as HTMLDivElement;
    const from = this.dateInput(fields, definition.fromLabel || 'From date', String(this.options.values[fromField] || ''), definition);
    const to = this.dateInput(fields, definition.toLabel || 'To date', String(this.options.values[toField] || ''), definition);
    let selectedFrom = from.value;
    let selectedTo = to.value;
    let activeField: 'from' | 'to' = 'from';
    let calendarMonth = monthStart(selectedFrom || new Date().toISOString().slice(0, 10));
    const error = html.take(editor).div.className('o-list-date-range-error').attr('role', 'alert').ele() as HTMLDivElement;
    const calendar = html.take(editor).div.className('o-list-date-picker').ele() as HTMLDivElement;
    const drawCalendar = () => {
      html.take(calendar).clear();
      const header = html.take(calendar).div.className('o-list-date-picker-header').ele() as HTMLDivElement;
      html.take(header).button
        .type('button').className('o-list-date-picker-nav').text('‹')
        .attr('aria-label', definition.calendarPreviousLabel || 'Previous date picker month')
        .event('click', () => { calendarMonth = shiftMonth(calendarMonth, -1); drawCalendar(); });
      html.take(header).strong
        .text(new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(calendarMonth));
      html.take(header).button
        .type('button').className('o-list-date-picker-nav').text('›')
        .attr('aria-label', definition.calendarNextLabel || 'Next date picker month')
        .event('click', () => { calendarMonth = shiftMonth(calendarMonth, 1); drawCalendar(); });
      const grid = html.take(calendar).div.className('o-list-date-picker-grid').ele() as HTMLDivElement;
      for (const weekday of definition.weekdayLabels || ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']) {
        html.take(grid).span.className('o-list-date-picker-weekday').text(weekday);
      }
      const first = calendarMonth.getUTCDay() || 7;
      const firstVisibleDate = new Date(Date.UTC(calendarMonth.getUTCFullYear(), calendarMonth.getUTCMonth(), 1 - (first - 1)));
      const monthKey = isoDate(calendarMonth.getUTCFullYear(), calendarMonth.getUTCMonth(), 1).slice(0, 7);
      for (let index = 0; index < 42; index++) {
        const date = new Date(firstVisibleDate);
        date.setUTCDate(date.getUTCDate() + index);
        const value = isoDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
        const button = html.take(grid).button
          .type('button').className('o-list-date-picker-day').text(String(date.getUTCDate()))
          .dataAttr('calendar-date', value).ele() as HTMLButtonElement;
        if (!value.startsWith(monthKey)) html.take(button).toggleClass('is-outside-month', true);
        if (!this.isDateAllowed(value, activeField, selectedFrom, definition)) html.take(button).prop('disabled', true);
        if (value === selectedFrom || value === selectedTo) html.take(button).toggleClass('is-selected', true);
        if (selectedFrom && selectedTo && value > selectedFrom && value < selectedTo) html.take(button).toggleClass('is-in-range', true);
        html.take(button).event('click', () => {
          if (activeField === 'from') { selectedFrom = value; html.take(from).prop('value', value); activeField = 'to'; }
          else { selectedTo = value; html.take(to).prop('value', value); }
          if (error) html.take(error).replaceText(validateDateRange(selectedFrom, selectedTo, definition) || '');
          drawCalendar();
        });
      }
    };
    html.take(from).event('focus', () => {
      activeField = 'from';
      calendarMonth = monthStart(from.value || selectedFrom || calendarMonth.toISOString().slice(0, 10));
      drawCalendar();
    });
    html.take(to).event('focus', () => {
      activeField = 'to';
      calendarMonth = monthStart(to.value || selectedTo || calendarMonth.toISOString().slice(0, 10));
      drawCalendar();
    });
    html.take(from).event('input', () => { selectedFrom = from.value; calendarMonth = monthStart(selectedFrom || calendarMonth); drawCalendar(); });
    html.take(to).event('input', () => { selectedTo = to.value; calendarMonth = monthStart(selectedTo || calendarMonth); drawCalendar(); });
    drawCalendar();
    html.take(fields).button
      .type('button')
      .className('o-list-date-range-apply')
      .text(definition.applyLabel || 'Apply')
      .event('click', () => this.apply(editor, fromField, toField, from.value, to.value, error));
  }

  private dateInput(parent: HTMLElement, label: string, value: string, definition: DateRangeFilterTagDefinition) {
    const input = html.take(parent).input
      .type('text')
      .attr('inputmode', 'numeric')
      .attr('placeholder', 'YYYY-MM-DD')
      .attr('pattern', '\\d{4}-\\d{2}-\\d{2}')
      .value(value)
      .attr('aria-label', label)
      .ele() as HTMLInputElement;
    if (definition.maxYears) {
      const bounds = rollingDateBounds(definition.maxYears);
      html.take(input).prop('min', bounds.from).prop('max', bounds.to);
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
      if (error) html.take(error).replaceText(message);
      return;
    }
    this.options.onChange({ [fromField]: from, [toField]: to });
    const details = editor.parentElement as HTMLDetailsElement | null;
    if (details) html.take(details).prop('open', false);
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

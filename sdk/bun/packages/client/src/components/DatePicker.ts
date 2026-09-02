import { appendIcon } from '@core3/client/components/Icon';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';

export type DatePickerState = { value?: string; onChange?: (value: string) => void };

export class DatePicker extends BaseComponent {
  input?: HTMLInputElement;
  private month = new Date();

  constructor(id: string, state: DatePickerState = {}) {
    super(id, state);
    const value = String(state.value || '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) this.month = new Date(`${value}T00:00:00Z`);
  }

  draw(container: HTMLElement) {
    const value = String(this.state.value || '');
    const root = html.take(container).div.className('o-date-picker relative').ele();
    const input = html.take(root).input.type('text').className('o-form-inline-editor w-full').value(value).attr('placeholder', 'YYYY-MM-DD').attr('inputmode', 'numeric').ele() as HTMLInputElement;
    this.input = input;
    const button = html.take(root).button.type('button').className('o-date-picker-toggle').attr('aria-label', 'Open date picker').ele();
    appendIcon(button, 'calendar');
    const popup = html.take(root).div.className('o-date-picker-popup absolute z-20 hidden rounded-md border border-gray-200 bg-white p-2 shadow-lg').ele();
    let mode: 'calendar' | 'year' = 'calendar';
    const render = () => {
      popup.replaceChildren();
      const header = html.take(popup).div.className('flex items-center justify-between gap-2 pb-2').ele();
      const previous = html.take(header).button.type('button').className('o-date-picker-nav').text('‹').ele();
      const heading = mode === 'year' ? 'Select year' : new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(this.month);
      const title = html.take(header).button.type('button').className('o-date-picker-month').attr('aria-label', mode === 'year' ? 'Choose month' : 'Choose year').text(heading).ele();
      const next = html.take(header).button.type('button').className('o-date-picker-nav').text('›').ele();
      html.take(title).event('click', () => { mode = mode === 'year' ? 'calendar' : 'year'; render(); });
      html.take(previous).event('click', () => { if (mode === 'year') this.month.setUTCFullYear(this.month.getUTCFullYear() - 12); else this.month.setUTCMonth(this.month.getUTCMonth() - 1); render(); });
      html.take(next).event('click', () => { if (mode === 'year') this.month.setUTCFullYear(this.month.getUTCFullYear() + 12); else this.month.setUTCMonth(this.month.getUTCMonth() + 1); render(); });
      if (mode === 'year') {
        const years = html.take(popup).div.className('grid grid-cols-3 gap-1').ele();
        const start = this.month.getUTCFullYear() - 5;
        for (let year = start; year < start + 12; year++) {
          const yearButton = html.take(years).button.type('button').className(`o-date-picker-year px-2 py-2 text-sm ${year === this.month.getUTCFullYear() ? 'is-selected' : ''}`).text(String(year)).ele();
          html.take(yearButton).event('click', () => { this.month.setUTCFullYear(year); mode = 'calendar'; render(); });
        }
        return;
      }
      const grid = html.take(popup).div.className('grid grid-cols-7 gap-1').ele();
      for (const day of ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']) html.take(grid).span.className('px-1 text-center text-xs text-gray-500').text(day);
      const year = this.month.getUTCFullYear(); const month = this.month.getUTCMonth();
      const first = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
      const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      for (let i = 0; i < first; i++) html.take(grid).span.text('');
      for (let day = 1; day <= days; day++) {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const cell = html.take(grid).button.type('button').className(`o-date-picker-day px-1 py-1 text-sm ${date === input.value ? 'is-selected' : ''}`).text(String(day)).ele();
        html.take(cell).event('click', () => { input.value = date; this.state.value = date; (this.state.onChange as ((value: string) => void) | undefined)?.(date); popup.classList.add('hidden'); });
      }
    };
    const close = (event: MouseEvent) => { if (!root.contains(event.target as Node)) popup.classList.add('hidden'); };
    html.take(input).event('input', () => { this.state.value = input.value; (this.state.onChange as ((value: string) => void) | undefined)?.(input.value); });
    html.take(button).event('click', () => { render(); popup.classList.toggle('hidden'); });
    document.addEventListener('click', close, true);
  }
}

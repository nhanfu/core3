import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';

export type MoneyInputDefinition = {
  currency?: string;
  decimals?: number;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
};

const numberFormatter = (decimals: number) => new Intl.NumberFormat('vi-VN', {
  style: 'decimal',
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals,
});

const parseNumber = (value: string, decimals: number) => {
  const cleaned = value.trim().replace(/[^\d,.-]/g, '');
  if (!cleaned) return '';
  const sign = cleaned.startsWith('-') ? '-' : '';
  const unsigned = cleaned.replace(/-/g, '');
  if (decimals === 0) return `${sign}${unsigned.replace(/[,.]/g, '')}`;
  const separator = Math.max(unsigned.lastIndexOf(','), unsigned.lastIndexOf('.'));
  if (separator < 0) return `${sign}${unsigned.replace(/\D/g, '')}`;
  const integer = unsigned.slice(0, separator).replace(/\D/g, '');
  const fraction = unsigned.slice(separator + 1).replace(/\D/g, '').slice(0, decimals);
  return `${sign}${integer || '0'}.${fraction}`;
};

/** Locale-aware money editor with a plain numeric value for form submission. */
export class MoneyInput extends BaseComponent {
  readonly def: MoneyInputDefinition;
  input: HTMLInputElement | null = null;
  private displayInput: HTMLInputElement | null = null;
  private rootElement: HTMLElement | null = null;

  constructor(id: string, state: { value?: unknown } = {}, def: MoneyInputDefinition = {}) {
    super(id, state);
    this.def = def;
  }

  private decimals() {
    return Number.isInteger(this.def.decimals) ? Math.max(0, Number(this.def.decimals)) : 0;
  }

  private displayValue(value: unknown) {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return '';
    return numberFormatter(this.decimals()).format(raw);
  }

  private sync(raw: string, format = false) {
    if (!this.input || !this.displayInput) return;
    const numeric = parseNumber(raw, this.decimals());
    this.input.value = numeric;
    if (format && numeric !== '') this.displayInput.value = this.displayValue(numeric);
    this.input.dispatchEvent(new Event('input', { bubbles: true }));
    this.input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  draw(container: HTMLElement) {
    const root = html.take(container).div.className('money-input').getContext() as HTMLDivElement;
    this.rootElement = root;

    const hidden = html.take(root).input.type('hidden').attr('name', this.id).getContext() as HTMLInputElement;
    this.input = hidden;

    const display = html.take(root).input.type('text').attr('inputmode', 'decimal')
      .className('form-input form-control money-input-display')
      .attr('placeholder', this.def.placeholder || '0')
      .attr('aria-label', this.def.currency ? `Số tiền (${this.def.currency})` : 'Số tiền')
      .getContext() as HTMLInputElement;
    this.displayInput = display;
    root.appendChild(display);

    const initial = String(this.state.value ?? '');
    display.value = this.displayValue(initial) || initial;
    this.sync(initial);
    html.take(display).event('input', () => this.sync(display.value)).event('blur', () => this.sync(display.value, true));
  }

  dispose() {
    this.rootElement = null;
    this.displayInput = null;
    this.input = null;
    super.dispose();
  }
}

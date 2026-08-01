import { BaseComponent } from '../runtime.ts';

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
    const root = document.createElement('div');
    root.className = 'core3-money-input';
    this.rootElement = root;

    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = this.id;
    this.input = hidden;
    root.appendChild(hidden);

    const display = document.createElement('input');
    display.type = 'text';
    display.inputMode = 'decimal';
    display.className = 'form-input core3-form-control core3-money-input-display';
    display.placeholder = this.def.placeholder || '0';
    display.setAttribute('aria-label', this.def.currency ? `Số tiền (${this.def.currency})` : 'Số tiền');
    this.displayInput = display;
    root.appendChild(display);

    const initial = String(this.state.value ?? '');
    display.value = this.displayValue(initial) || initial;
    this.sync(initial);
    display.addEventListener('input', () => this.sync(display.value));
    display.addEventListener('blur', () => this.sync(display.value, true));
    container.appendChild(root);
  }

  dispose() {
    this.rootElement = null;
    this.displayInput = null;
    this.input = null;
    super.dispose();
  }
}

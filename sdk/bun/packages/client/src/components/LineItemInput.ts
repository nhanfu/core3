import { BaseComponent } from '@core3/client/components/BaseComponent';

export type LineItemInputDefinition = {
  input_type?: string;
  options?: Array<string | { value: string; label: string }>;
  currency?: string;
  decimals?: number;
};

export abstract class LineItemInput extends BaseComponent {
  input: HTMLInputElement | HTMLSelectElement | null = null;
  protected readonly definition: LineItemInputDefinition;

  constructor(id: string, state: { value?: unknown; definition: LineItemInputDefinition } = { definition: {} }) {
    super(id, state);
    this.definition = state.definition;
  }
}

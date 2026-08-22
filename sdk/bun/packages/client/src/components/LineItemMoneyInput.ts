import { MoneyInput } from '@core3/client/components/MoneyInput';
import { LineItemInput } from './LineItemInput';

export class LineItemMoneyInput extends LineItemInput {
  draw(container: HTMLElement) {
    const money = new MoneyInput(`${this.id}-money`, { value: this.state.value }, {
      currency: this.definition.currency || 'VND',
      decimals: this.definition.decimals ?? 0,
    });
    this.mountChild(money, container);
    this.input = money.input;
  }
}

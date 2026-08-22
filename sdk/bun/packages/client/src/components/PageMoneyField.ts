import { MoneyInput } from '@core3/client/components/MoneyInput';
import { PageField } from './PageField';

export class PageMoneyField extends PageField {
  draw(container: HTMLElement) {
    const { field, fieldId, initialValue } = this.state;
    const money = new MoneyInput(fieldId, { value: initialValue }, {
      currency: field.currency,
      decimals: field.decimals,
      placeholder: field.placeholder,
    });
    this.mountChild(money, container);
    this.element = money.input;
  }
}

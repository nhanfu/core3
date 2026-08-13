import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendBadge } from '@core3/client/components/helpers';

export class BadgeCell extends BaseComponent {
  draw(container) {
    appendBadge(container, this.state.value, this.state.color ?? null);
  }
}

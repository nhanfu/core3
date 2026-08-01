import { BaseComponent } from '../runtime.ts';
import { appendBadge } from './helpers.ts';

export class BadgeCell extends BaseComponent {
  draw(container) {
    appendBadge(container, this.state.value, this.state.color ?? null);
  }
}

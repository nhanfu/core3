import { BaseComponent } from '../runtime.js';
import { appendBadge } from './helpers.js';

export class BadgeCell extends BaseComponent {
  draw(container) {
    appendBadge(container, this.state.value, this.state.color ?? null);
  }
}

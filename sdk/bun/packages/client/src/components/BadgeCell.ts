import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendBadge } from '@core3/client/components/helpers';

export class BadgeCell extends BaseComponent {
  static resolveState(def: any, context: any) {
    const row = context.row || context;
    const value = row[def.field || ''];
    return { value, color: def.colors?.[String(value)] || (def.colorField ? row[def.colorField] : null) };
  }

  draw(container) {
    appendBadge(container, this.state.value, this.state.color ?? null);
  }
}

import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export class TextCell extends BaseComponent {
  static resolveState(def: any, context: any) {
    const row = context.row || context;
    return { value: row[def.field || ''], secondary: def.secondary ? row[def.secondary] : null };
  }

  draw(container) {
    const { value, secondary } = this.state;
    if (secondary != null) {
      void html.take(container).div.className('flex flex-col')
        .span.className('text-sm font-medium text-gray-900').text(String(value || '—')).end
        .span.className('text-xs text-gray-500 mt-0.5').text(String(secondary)).end;
    } else {
      html.take(container).span.className('text-sm text-gray-900').text(String(value || '—'));
    }
  }
}

import { html } from '../html.ts';
import { BaseComponent } from './BaseComponent.ts';

export class Label extends BaseComponent {
  draw(container) {
    const { text = '', size = 'sm', color = 'gray', bold = false } = this.state;
    const sizeMap = { xs: 'text-xs', sm: 'text-sm', base: 'text-base', lg: 'text-lg' };
    const colorMap = { gray: 'text-gray-600', dark: 'text-gray-900', muted: 'text-gray-400', indigo: 'text-indigo-600', red: 'text-red-600' };
    const cls = `${sizeMap[size] || sizeMap.sm} ${colorMap[color] || colorMap.gray} ${bold ? 'font-semibold' : ''}`;
    html.take(container).span.className(cls).text(String(text));
  }
}

import { html } from '../html.ts';
import { BaseComponent } from './BaseComponent.ts';

export class Spinner extends BaseComponent {
  draw(container) {
    const { size = 'md', label = '' } = this.state;
    const sizeMap = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
    const sz = sizeMap[size] || sizeMap.md;

    const wrap = html.take(container).div.className('flex items-center gap-2').getContext();
    html.take(wrap)
      .div.className(`${sz} animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600`);
    if (label) html.take(wrap).span.className('text-sm text-gray-500').text(label);
  }
}

import { html } from '../html.ts';
import { BaseComponent } from './BaseComponent.ts';
import { appendIcon } from './Icon.ts';

export class Image extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container) {
    const { src = '', alt = '', width = null, height = null } = this.state;
    const d = this.def;
    const objectFit = d.objectFit || 'cover';
    const roundedCls = d.rounded ? 'rounded-full' : 'rounded-md';
    const borderCls = d.border ? 'border border-gray-200' : '';

    const wrap = html.take(container).div.className('inline-block').getContext();

    const styleStr = [
      width ? `width:${typeof width === 'number' ? width + 'px' : width};` : '',
      height ? `height:${typeof height === 'number' ? height + 'px' : height};` : '',
    ].join('');

    if (!src) {
      const placeholder = html.take(wrap).div
        .className(`flex items-center justify-center bg-gray-100 text-gray-400 text-2xl ${roundedCls} ${borderCls}`)
        .style(styleStr || 'width:100px;height:100px;')
        .getContext();
      appendIcon(placeholder, 'image');
      return;
    }

    const img = html.take(wrap).img
      .className(`block ${roundedCls} ${borderCls}`)
      .attr('src', src)
      .attr('alt', alt || '')
      .style(`object-fit:${objectFit};${styleStr}`)
      .getContext();
  }
}

import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon } from '@core3/client/components/Icon';

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

    const wrap = html.take(container).div.className('inline-block').ele();

    const styleStr = [
      width ? `width:${typeof width === 'number' ? width + 'px' : width};` : '',
      height ? `height:${typeof height === 'number' ? height + 'px' : height};` : '',
    ].join('');

    if (!src) {
      const placeholder = html.take(wrap).div
        .className(`flex items-center justify-center bg-gray-100 text-gray-400 text-2xl ${roundedCls} ${borderCls}`)
        .style(styleStr || 'width:100px;height:100px;')
        .ele();
      appendIcon(placeholder, 'image');
      return;
    }

    html.take(wrap).img
      .className(`block ${roundedCls} ${borderCls}`)
      .attr('src', src)
      .attr('alt', alt || '')
      .style(`object-fit:${objectFit};${styleStr}`)
      .ele();
  }
}

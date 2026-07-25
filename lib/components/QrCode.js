import { html } from '../html.js';
import { BaseComponent } from '../runtime.js';

function drawPlaceholder(canvasEl, size) {
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;
  const cells = 21;
  const cell = Math.floor(size / cells);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const dark = ((r * 3 + c * 7 + r * c) % 5) > 2;
      ctx.fillStyle = dark ? '#000000' : '#ffffff';
      ctx.fillRect(c * cell, r * cell, cell, cell);
    }
  }

  const finder = (ox, oy) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(ox * cell, oy * cell, 7 * cell, 7 * cell);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect((ox + 1) * cell, (oy + 1) * cell, 5 * cell, 5 * cell);
    ctx.fillStyle = '#000000';
    ctx.fillRect((ox + 2) * cell, (oy + 2) * cell, 3 * cell, 3 * cell);
  };

  finder(0, 0);
  finder(cells - 7, 0);
  finder(0, cells - 7);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, cells * cell, size, size - cells * cell);
  ctx.fillRect(cells * cell, 0, size - cells * cell, size);
}

export class QrCode extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state || { value: '', size: 200 });
    this.def = def;
  }

  draw(container) {
    const { value = '', size = 200 } = this.state;
    const { label = '' } = this.def;

    const wrap = html.take(container).div
      .className('inline-flex flex-col items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl')
      .getContext();

    if (label) {
      html.take(wrap).div.className('text-sm font-medium text-gray-700').text(label);
    }

    const canvasEl = html.take(wrap).canvas
      .attr('width', String(size))
      .attr('height', String(size))
      .className('border border-gray-200 rounded')
      .getContext();

    drawPlaceholder(canvasEl, size);

    if (value) {
      html.take(wrap).p
        .className('text-xs text-gray-500 text-center break-all')
        .style(`max-width: ${size}px;`)
        .text(value);
    }

    const genBtn = html.take(wrap).button
      .className('text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium')
      .text('Generate')
      .getContext();
    genBtn.addEventListener('click', () => {
      this.submit('qr.generate', { value: this.state.value });
    });
  }
}

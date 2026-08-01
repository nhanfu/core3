import { html } from '../html.ts';
import { BaseComponent } from './BaseComponent.ts';

export class SplitPanel extends BaseComponent {
  constructor(id, leftComp, rightComp, opts = {}) {
    super(id, {});
    this.leftComp  = leftComp;
    this.rightComp = rightComp;
    this.opts = opts;
    if (leftComp)  { leftComp.parent  = this; this.children.push(leftComp); }
    if (rightComp) { rightComp.parent = this; this.children.push(rightComp); }
  }

  draw(container) {
    const lw   = this.opts.leftWidth  || '2fr';
    const rw   = this.opts.rightWidth || '3fr';
    const grid = html.take(container).div.className('grid gap-6').style(`grid-template-columns: ${lw} ${rw}`).getContext();
    if (this.leftComp)  this.leftComp.mount(html.take(grid).div.getContext());
    if (this.rightComp) this.rightComp.mount(html.take(grid).div.getContext());
  }
}

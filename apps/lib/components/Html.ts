import { interpolate } from '@core3/client/expr';
import { BaseComponent } from './BaseComponent.ts';

const TAGS = new Set(['div', 'span', 'p', 'section', 'strong', 'small']);
const TEXT_FUNCTIONS = new Map<string, (user: any, row: any, state: any) => unknown>();

/** Safe, text-only HTML tree declared by YAML. */
export class Html extends BaseComponent {
  constructor(id: string, state: any = {}, private readonly def: any = {}) {
    super(id, state);
  }

  draw(container: HTMLElement) {
    container.appendChild(this.node(this.def, this.state.context || {}));
  }

  private node(def: any, context: any): HTMLElement {
    const tag = TAGS.has(def.tag) ? def.tag : 'div';
    const element = document.createElement(tag);
    if (def.class) element.className = String(def.class);
    if (def.text !== undefined) element.textContent = interpolate(def.text, context);
    if (def.text_expr !== undefined) {
      const fn = typeof def.text_expr === 'function'
        ? def.text_expr
        : this.compileTextFunction(String(def.text_expr));
      element.textContent = String(fn(context.user, context.row, context.state) ?? '');
    }
    for (const child of def.children || []) element.appendChild(this.node(child, context));
    return element;
  }

  private compileTextFunction(source: string) {
    const cached = TEXT_FUNCTIONS.get(source);
    if (cached) return cached;
    // YAML stores a function source, for example: `user => user.name`.
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${source.trim()})`)();
    if (typeof fn !== 'function') throw new TypeError('Html.text_expr must evaluate to a JavaScript function');
    TEXT_FUNCTIONS.set(source, fn);
    return fn;
  }
}

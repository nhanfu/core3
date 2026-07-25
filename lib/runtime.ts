/**
 * lib/runtime.js
 *
 * Minimal BaseComponent implementation for demo pages.
 * NOT the production @core3/frontend package — demo-only.
 *
 * Import: import { BaseComponent } from '/lib/runtime.ts';
 */

import { HTML } from './html.ts';

export { HTML };

export class BaseComponent {
  [key: string]: any;

  id: string;
  state: any;
  parent: BaseComponent | null;
  children: BaseComponent[];
  _container: HTMLElement | null;
  _transport?: { submit?: (action: string, params?: Record<string, unknown>) => unknown } | null;
  _onAction?: (action: string, params?: Record<string, unknown>, source?: BaseComponent) => unknown;

  constructor(id: string, initialState: any = {}) {
    this.id = id;
    this.state = { ...initialState };
    this.parent = null;
    this.children = [];
    this._container = null;
  }

  /** Walk up to the root component (no parent). */
  get root() {
    let n: BaseComponent | null = this;
    while (n?.parent) n = n.parent;
    return n ?? this;
  }

  /**
   * Merge partial into state.
   * @param {boolean} redraw  default true — clears container and calls draw() again
   */
  setState(partial: any, redraw = true) {
    Object.assign(this.state, partial);
    if (redraw) this.redraw();
  }

  /** Clear container and re-render. */
  redraw() {
    if (this._container) {
      this._container.innerHTML = '';
      this.draw(this._container);
    }
  }

  /**
   * Create a child component and register it in the tree.
   * 2-arg form: createChild(Ctor, state)       — auto-generates id
   * 3-arg form: createChild(Ctor, id, state)   — uses provided id
   * @param {typeof BaseComponent} Ctor
   * @param {string|object} stateOrId
   * @param {object} [maybeState]
   */
  createChild(Ctor: new (id: string, state?: any) => BaseComponent, stateOrId: string | any, maybeState?: any) {
    let id, state;
    if (typeof stateOrId === 'string') {
      id = stateOrId;
      state = maybeState;
    } else {
      id = `${this.id}-c${this.children.length}`;
      state = stateOrId;
    }
    const child = new Ctor(id, state);
    child.parent = this;
    this.children.push(child);
    return child;
  }

  /**
   * Depth-first search for a component by id.
   * @param {string} id
   * @returns {BaseComponent|null}
   */
  find(id: string) {
    if (this.id === id) return this;
    for (const child of this.children) {
      const result = child.find(id);
      if (result) return result;
    }
    return null;
  }

  /** Mount into a DOM container (sets _container and calls draw). */
  mount(container: HTMLElement) {
    this._container = container;
    this.draw(container);
  }

  /**
   * Submit an action.
   * Resolution order:
   *   1. this._transport.submit(action, params)   — set in tests / framework wiring
   *   2. root._onAction(action, params, source)   — set on page root components
   *   3. throws Error                              — no handler registered
   */
  async submit(action: string, params: any = {}) {
    if (typeof this._transport?.submit === 'function') {
      return this._transport.submit(action, params);
    }
    const root = this.root;
    if (typeof root._onAction === 'function') {
      return root._onAction(action, params, this);
    }
    throw new Error(`No action handler registered for action: ${action}`);
  }

  /**
   * Override in subclasses — render into container.
   * @param {HTMLElement} container
   */
  draw(container: HTMLElement) {}
}

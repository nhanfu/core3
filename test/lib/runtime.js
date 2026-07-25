/**
 * test/lib/runtime.js
 *
 * Minimal BaseComponent implementation for demo pages.
 * NOT the production @core3/frontend package — demo-only.
 */

import { HTML } from '../../html.js';

export { HTML };

export class BaseComponent {
  constructor(id, initialState = {}) {
    this.id = id;
    this.state = { ...initialState };
    this.parent = null;
    this.children = [];
    this._container = null;
  }

  /** Walk up to the root component (no parent). */
  get root() {
    let n = this;
    while (n.parent) n = n.parent;
    return n;
  }

  /**
   * Merge partial into state.
   * @param {boolean} redraw  default true — clears container and calls draw() again
   */
  setState(partial, redraw = true) {
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
   * @param {typeof BaseComponent} Ctor
   * @param {string} id
   * @param {object} state
   */
  createChild(Ctor, id, state) {
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
  find(id) {
    if (this.id === id) return this;
    for (const child of this.children) {
      const result = child.find(id);
      if (result) return result;
    }
    return null;
  }

  /** Mount into a DOM container (sets _container and calls draw). */
  mount(container) {
    this._container = container;
    this.draw(container);
  }

  /**
   * Submit an action.
   * Walks up to root; if root._onAction(action, params, source) is defined, calls it.
   * Otherwise logs to console (demo stub).
   */
  async submit(action, params = {}) {
    const root = this.root;
    if (typeof root._onAction === 'function') {
      return root._onAction(action, params, this);
    }
    console.log('[submit]', action, params);
    return {};
  }

  /**
   * Override in subclasses — render into container.
   * @param {HTMLElement} container
   */
  draw(container) {}
}

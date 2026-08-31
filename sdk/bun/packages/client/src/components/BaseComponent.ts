import { html } from '@core3/client/html';

/**
 * lib/runtime.js
 *
 * Minimal BaseComponent implementation for demo pages.
 * NOT the production @core3/frontend package — demo-only.
 *
 * Import: import { BaseComponent } from '/lib/components/BaseComponent.ts';
 */

import { HTML } from '@core3/client/html';
import { ExternalWidgetAdapter } from '../adapters/ExternalWidgetAdapter.ts';

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
  private _adapters: Map<string, ExternalWidgetAdapter<any, any>>;

  constructor(id: string, initialState: any = {}) {
    this.id = id;
    this.state = { ...initialState };
    this.parent = null;
    this.children = [];
    this._container = null;
    this._adapters = new Map();
  }

  /** Walk up to the root component (no parent). */
  get root() {
    let current = this.parent;
    while (current?.parent) current = current.parent;
    return current ?? this;
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
      this.disposeAdapters();
      html.take(this._container).clear();
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

  /** Adopt a component before mounting it so ownership, lookup, and disposal stay explicit. */
  adoptChild<T extends BaseComponent>(child: T): T {
    const previousParent = child.parent;
    if (previousParent && previousParent !== this) {
      previousParent.children = previousParent.children.filter(candidate => candidate !== child);
    }
    const existing = this.children.find(candidate => candidate.id === child.id && candidate !== child);
    if (existing) {
      existing.dispose();
      this.children = this.children.filter(candidate => candidate !== existing);
    }
    child.parent = this;
    if (!this.children.includes(child)) this.children.push(child);
    return child;
  }

  /** Adopt and mount a child through one lifecycle-aware operation. */
  mountChild<T extends BaseComponent>(child: T, container: HTMLElement): T {
    this.adoptChild(child).mount(container);
    return child;
  }

  /** Dispose and detach all owned children without disposing this component. */
  disposeChildren() {
    for (const child of this.children) child.dispose();
    this.children = [];
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
    this.disposeAdapters();
    this._container = container;
    this.draw(container);
  }

  /**
   * Register and mount a named external-widget adapter owned by this
   * component. A previous adapter registered under the same key is disposed
   * first, so redraws cannot leak vendor listeners or detached DOM nodes.
   */
  mountAdapter<TOptions, TWidget>(
    key: string,
    adapter: ExternalWidgetAdapter<TOptions, TWidget>,
    container: HTMLElement,
    options: TOptions,
  ) {
    this.disposeAdapter(key);
    adapter.mount(container, options);
    this._adapters.set(key, adapter);
    return adapter;
  }

  /** Update a mounted external widget without redrawing this component. */
  updateAdapter<TOptions>(key: string, options: TOptions) {
    const adapter = this._adapters.get(key);
    if (!adapter) {
      throw new Error(`No external widget adapter is mounted for key: ${key}`);
    }
    (adapter as ExternalWidgetAdapter<TOptions, unknown>).update(options);
  }

  /** Dispose one adapter while keeping the rest of the component alive. */
  disposeAdapter(key: string) {
    const adapter = this._adapters.get(key);
    if (!adapter) return;
    this._adapters.delete(key);
    adapter.dispose();
  }

  /** Dispose every external widget owned by this component. */
  disposeAdapters() {
    for (const [key, adapter] of this._adapters) {
      this._adapters.delete(key);
      adapter.dispose();
    }
  }

  /** Release external widgets in this component and its child tree. */
  dispose() {
    for (const child of this.children) child.dispose();
    this.disposeAdapters();
    this._container = null;
  }

  /**
   * Submit an action.
   * Resolution order:
   *   1. this._transport.submit(action, params)   — set in tests / framework wiring
   *   2. this._onAction(action, params, source)    — set on convention-loaded components
   *   3. root._transport.submit(action, params)   — set on an owning root
   *   4. root._onAction(action, params, source)    — set on page root components
   *   5. throws Error                              — no handler registered
   */
  async submit(action: string, params: any = {}) {
    if (typeof this._transport?.submit === 'function') {
      return this._transport.submit(action, params);
    }
    if (typeof this._onAction === 'function') {
      return this._onAction(action, params, this);
    }
    // Components rendered inside a page detail can have an action handler on
    // their owning form rather than on the page root. Walk the ownership chain
    // so nested components (for example the chatter) reach that handler.
    let owner: BaseComponent | null = this.parent;
    while (owner) {
      if (typeof owner._transport?.submit === 'function') {
        return owner._transport.submit(action, params);
      }
      if (typeof owner._onAction === 'function') {
        return owner._onAction(action, params, this);
      }
      owner = owner.parent;
    }
    throw new Error(`No action handler registered for action: ${action}`);
  }

  /**
   * Override in subclasses — render into container.
   * @param {HTMLElement} container
   */
  draw(container: HTMLElement) { void container; }
}

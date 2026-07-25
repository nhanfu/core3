/**
 * lib/runtime.js
 *
 * Minimal BaseComponent implementation for demo pages.
 * NOT the production @core3/frontend package — demo-only.
 *
 * Import: import { BaseComponent } from '/lib/runtime.js';
 */
import { HTML } from './html.js';
export { HTML };
export declare class BaseComponent {
    id: any;
    state: {};
    parent: any;
    children: any[];
    _container: any;
    constructor(id: any, initialState?: {});
    /** Walk up to the root component (no parent). */
    get root(): this;
    /**
     * Merge partial into state.
     * @param {boolean} redraw  default true — clears container and calls draw() again
     */
    setState(partial: any, redraw?: boolean): void;
    /** Clear container and re-render. */
    redraw(): void;
    /**
     * Create a child component and register it in the tree.
     * 2-arg form: createChild(Ctor, state)       — auto-generates id
     * 3-arg form: createChild(Ctor, id, state)   — uses provided id
     * @param {typeof BaseComponent} Ctor
     * @param {string|object} stateOrId
     * @param {object} [maybeState]
     */
    createChild(Ctor: typeof BaseComponent, stateOrId: string | object, maybeState?: object): BaseComponent;
    /**
     * Depth-first search for a component by id.
     * @param {string} id
     * @returns {BaseComponent|null}
     */
    find(id: string): BaseComponent | null;
    /** Mount into a DOM container (sets _container and calls draw). */
    mount(container: any): void;
    /**
     * Submit an action.
     * Resolution order:
     *   1. this._transport.submit(action, params)   — set in tests / framework wiring
     *   2. root._onAction(action, params, source)   — set on page root components
     *   3. throws Error                              — no handler registered
     */
    submit(action: any, params?: {}): Promise<any>;
    /**
     * Override in subclasses — render into container.
     * @param {HTMLElement} container
     */
    draw(container: HTMLElement): void;
}

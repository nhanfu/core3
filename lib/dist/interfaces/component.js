// @core3/frontend — component contracts
// Implementation lives in packages/frontend; this file is the design contract.
/**
 * Base class for all framework components.
 * Every component is a node in a virtual tree with pure JSON state.
 */
export class BaseComponent {
    id;
    state;
    parent;
    children;
    /** Always returns the top-level page component (root of the tree). */
    get root() { throw new Error('abstract'); }
    /**
     * Patch what changed. Override for performance.
     * Default: clear container + call draw().
     */
    redraw() { throw new Error('abstract'); }
    /**
     * Merge partial state. Triggers redraw by default.
     * Pass redraw=false to batch multiple updates.
     */
    setState(partial, redraw) { throw new Error('abstract'); }
    /**
     * Create a child component, register it in the tree, and return it.
     * Child's .parent is set automatically.
     */
    createChild(ctor, state) { throw new Error('abstract'); }
    /** Find any component by id anywhere in the subtree (depth-first). */
    find(id) { throw new Error('abstract'); }
    /**
     * Submit a named action to the backend.
     * The name maps to an `actions:` entry in the YAML page definition.
     */
    submit(action, params) {
        throw new Error('abstract');
    }
}

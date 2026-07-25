/**
 * Meta-model resolver — evaluates ComponentDef expressions in context.
 * Mirrors the core2 component meta pattern.
 */
/**
 * Resolve a ComponentDef's expression fields against the current context.
 * Returns a resolved meta object indicating visibility, disabled state, and computed value.
 *
 * @param {object} def  — ComponentDef (may have show_if, disabled_if, compute, default)
 * @param {{ user?, row?, state? }} ctx
 * @returns {{ visible: boolean, disabled: boolean, value: * }}
 */
export declare function resolveMeta(def: object, ctx?: {
    user?: any;
    row?: any;
    state?: any;
}): {
    visible: boolean;
    disabled: boolean;
    value: any;
};
/**
 * Resolve an ActionDef's expression fields.
 * @param {object} action  — ActionDef (may have show_if, disabled_if)
 * @param {{ user?, row?, state? }} ctx
 * @returns {{ visible: boolean, disabled: boolean }}
 */
export declare function resolveAction(action: object, ctx?: {
    user?: any;
    row?: any;
    state?: any;
}): {
    visible: boolean;
    disabled: boolean;
};
/**
 * Validate a field value against the def's validation expression.
 * @param {object} def   — ComponentDef with optional validation string
 * @param {*} value      — current field value
 * @param {{ user?, row?, state? }} ctx
 * @returns {string|null}  — error message or null if valid
 */
export declare function validateField(def: object, value: any, ctx?: {
    user?: any;
    row?: any;
    state?: any;
}): string | null;

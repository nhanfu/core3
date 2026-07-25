/**
 * Expression evaluator — evaluates server-stored expression strings.
 * Used for show_if, disabled_if, compute, default, validation in ComponentDef.
 *
 * Security: expressions run inside a sandboxed Function with only safe context vars.
 * They CANNOT access window, document, or global scope.
 */
/**
 * Evaluate an expression string.
 * @param {string} expr  — JS expression, e.g. "row.status === 'active'"
 * @param {{ user?, row?, state? }} ctx
 * @returns {*}
 */
export declare function evalExpr(expr: string, ctx?: {
    user?: any;
    row?: any;
    state?: any;
}): any;
/**
 * Interpolate {row.field} / {state.key} placeholders in a template string.
 * @param {string} template  — e.g. "Hello {row.name}, you have {state.count} items"
 * @param {{ row?, state?, user? }} ctx
 * @returns {string}
 */
export declare function interpolate(template: string, ctx?: {
    row?: any;
    state?: any;
    user?: any;
}): string;
